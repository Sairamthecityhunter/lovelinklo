import {publicAppUrl} from './app-url';
import {
  PLUS_BENEFITS,
  PLUS_PRICE_CENTS,
  assignInstallments,
  asCouplePlanStatus,
  asGiftPlanStatus,
  asInstallmentStatus,
  asPlanTier,
  installmentDueDates,
  paymentProviderMode,
  plusIsActive,
  plusPeriodEnd,
  planProgress,
  splitInstallments,
  type GiftPlanCount,
} from './payment-plans';
import {currentPartner} from './partner-safety';
import {ApiError, db} from './server';
import {billingMode, checkoutMode, stripe} from './shop-server';

export type CouplePlanRow = {
  couple_id: string;
  tier: string;
  status: string;
  payment_mode: string;
  started_by: string;
  started_at: string;
  expires_at: number;
  cancel_at_end: number;
  subscription_id: string | null;
  customer_id: string | null;
  updated_at: string;
};

export type GiftPlanRow = {
  id: string;
  gift_order_id: string;
  couple_id: string;
  owner_id: string;
  total_cents: number;
  installment_count: number;
  split_with_partner: number;
  status: string;
  payment_mode: string;
  created_at: string;
  updated_at: string;
  title?: string;
  recipient_name?: string;
};

export type InstallmentRow = {
  id: string;
  plan_id: string;
  sequence: number;
  amount_cents: number;
  due_on: string;
  assigned_user_id: string | null;
  status: string;
  paid_by: string | null;
  paid_at: string | null;
  payment_mode: string;
  session_id: string | null;
  checkout_url: string | null;
};

export function checkoutOrigin() {
  return publicAppUrl();
}

export function planMode() {
  return paymentProviderMode(checkoutMode());
}

export async function couplePlusActive(coupleId: string, now = Date.now()) {
  const access = await coupleBilling(coupleId, now);
  return access.plus;
}

export async function coupleBilling(coupleId: string, now = Date.now()) {
  const database = db();
  const plan = await database.prepare(
    `SELECT couple_id, tier, status, payment_mode, started_by, started_at, expires_at,
            cancel_at_end, subscription_id, customer_id, updated_at
     FROM couple_plans WHERE couple_id = ?`,
  ).bind(coupleId).first<CouplePlanRow>();
  const shop = await database.prepare(
    `SELECT m.status, m.expires_at, m.payment_mode, m.cancel_at_end
     FROM shop_memberships m
     JOIN users u ON u.id = m.owner_id
     WHERE u.couple_id = ? AND m.status = 'active' AND m.expires_at > ? AND m.payment_mode = ?
     LIMIT 1`,
  ).bind(coupleId, now, billingMode()).first<{status: string; expires_at: number; payment_mode: string; cancel_at_end: number}>();
  const fromPlan = plan ? plusIsActive({
    tier: asPlanTier(plan.tier),
    status: asCouplePlanStatus(plan.status),
    expiresAt: Number(plan.expires_at) || 0,
  }, now) : false;
  const plus = fromPlan || !!shop;
  return {
    plus,
    source: fromPlan ? 'plus' as const : shop ? 'shop' as const : 'free' as const,
    mode: planMode(),
    plan: plan ? {
      tier: plus ? 'plus' as const : asPlanTier(plan.tier),
      status: plus ? 'active' as const : asCouplePlanStatus(plan.status),
      paymentMode: plan.payment_mode,
      startedBy: plan.started_by,
      startedAt: plan.started_at,
      expiresAt: Number(plan.expires_at) || 0,
      cancelAtEnd: !!plan.cancel_at_end,
    } : shop ? {
      tier: 'plus' as const,
      status: 'active' as const,
      paymentMode: shop.payment_mode,
      startedBy: '',
      startedAt: '',
      expiresAt: Number(shop.expires_at) || 0,
      cancelAtEnd: !!shop.cancel_at_end,
    } : {
      tier: 'free' as const,
      status: 'inactive' as const,
      paymentMode: planMode(),
      startedBy: '',
      startedAt: '',
      expiresAt: 0,
      cancelAtEnd: false,
    },
  };
}

export function billingPayload(billing: Awaited<ReturnType<typeof coupleBilling>>, partner: {userId: string; name: string} | null) {
  return {
    plus: billing.plus,
    source: billing.source,
    mode: billing.mode,
    plan: billing.plan,
    priceCents: PLUS_PRICE_CENTS,
    benefits: PLUS_BENEFITS,
    partner: partner ? {userId: partner.userId, name: partner.name} : null,
  };
}

export async function activatePlusDemo(ctx: {userId: string; coupleId: string}, now = Date.now()) {
  const startedAt = new Date(now).toISOString();
  const expiresAt = plusPeriodEnd(now);
  const result = await db().prepare(
    `INSERT INTO couple_plans (
       couple_id, tier, status, payment_mode, started_by, started_at, expires_at, cancel_at_end, updated_at
     ) VALUES (?, 'plus', 'active', 'demo', ?, ?, ?, 0, ?)
     ON CONFLICT (couple_id) DO UPDATE SET
       tier = 'plus', status = 'active', payment_mode = 'demo', started_by = excluded.started_by,
       started_at = excluded.started_at, expires_at = excluded.expires_at, cancel_at_end = 0,
       updated_at = excluded.updated_at
     WHERE couple_plans.status IS DISTINCT FROM 'active' OR couple_plans.expires_at <= ? OR couple_plans.tier IS DISTINCT FROM 'plus'`,
  ).bind(ctx.coupleId, ctx.userId, startedAt, expiresAt, startedAt, now).run();
  if (!result.meta.changes) throw new ApiError(409, 'LoveLink Plus is already active for your couple.');
  return coupleBilling(ctx.coupleId, now);
}

export async function cancelPlusDemo(ctx: {userId: string; coupleId: string}, now = Date.now()) {
  const updatedAt = new Date(now).toISOString();
  const result = await db().prepare(
    `UPDATE couple_plans
     SET status = 'canceled', cancel_at_end = 1, updated_at = ?
     WHERE couple_id = ? AND tier = 'plus' AND status = 'active'`,
  ).bind(updatedAt, ctx.coupleId).run();
  if (!result.meta.changes) throw new ApiError(404, 'There is no active Plus plan to cancel.');
  return coupleBilling(ctx.coupleId, now);
}

export async function startPlusCheckout(ctx: {userId: string; coupleId: string}) {
  const mode = checkoutMode();
  if (mode === 'disabled') return {url: null as string | null, billing: await activatePlusDemo(ctx)};
  const origin = checkoutOrigin();
  const session = await stripe('checkout/sessions', {
    mode: 'subscription',
    success_url: origin + '/settings?plus=success',
    cancel_url: origin + '/settings?plus=cancelled',
    client_reference_id: ctx.userId,
    'metadata[coupleId]': ctx.coupleId,
    'metadata[kind]': 'plus',
    'subscription_data[metadata][coupleId]': ctx.coupleId,
    'subscription_data[metadata][kind]': 'plus',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(PLUS_PRICE_CENTS),
    'line_items[0][price_data][product_data][name]': 'LoveLink Plus',
    'line_items[0][price_data][recurring][interval]': 'month',
    'payment_method_types[0]': 'card',
  }, 'plus-' + ctx.coupleId + '-' + ctx.userId);
  const now = new Date().toISOString();
  await db().prepare(
    `INSERT INTO couple_plans (
       couple_id, tier, status, payment_mode, started_by, started_at, expires_at, cancel_at_end,
       subscription_id, customer_id, updated_at
     ) VALUES (?, 'plus', 'inactive', ?, ?, ?, 0, 0, ?, NULL, ?)
     ON CONFLICT (couple_id) DO UPDATE SET
       payment_mode = excluded.payment_mode, started_by = excluded.started_by, updated_at = excluded.updated_at
     WHERE couple_plans.status IS DISTINCT FROM 'active' OR couple_plans.expires_at <= ?`,
  ).bind(ctx.coupleId, mode, ctx.userId, now, Date.now(), session.subscription || null, now, Date.now()).run();
  return {url: session.url as string, billing: await coupleBilling(ctx.coupleId)};
}

export async function fulfillPlusSession(session: any) {
  const coupleId = session.metadata?.coupleId;
  if (!coupleId || session.metadata?.kind !== 'plus') return false;
  if (session.payment_status !== 'paid' && session.status !== 'complete') return false;
  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
  const subscription = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;
  await db().prepare(
    `UPDATE couple_plans
     SET tier = 'plus', status = 'active', payment_mode = ?, subscription_id = COALESCE(?, subscription_id),
         customer_id = COALESCE(?, customer_id), started_at = ?, expires_at = ?, cancel_at_end = 0, updated_at = ?
     WHERE couple_id = ?`,
  ).bind(billingMode(), subscription, customer, startedAt, plusPeriodEnd(now), startedAt, coupleId).run();
  return true;
}

export async function syncPlusSubscription(sub: any) {
  if (sub.metadata?.kind !== 'plus' || !sub.metadata?.coupleId) return false;
  const until = Number(sub.items?.data?.[0]?.current_period_end || 0) * 1000;
  const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'canceled';
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null;
  await db().prepare(
    `UPDATE couple_plans
     SET status = ?, expires_at = ?, cancel_at_end = ?, customer_id = COALESCE(?, customer_id),
         subscription_id = ?, payment_mode = ?, updated_at = ?
     WHERE couple_id = ?`,
  ).bind(
    status,
    until || plusPeriodEnd(),
    sub.cancel_at_period_end ? 1 : 0,
    customer,
    sub.id,
    billingMode(),
    new Date().toISOString(),
    sub.metadata.coupleId,
  ).run();
  return true;
}

function asPublicInstallment(row: InstallmentRow, userId: string) {
  return {
    id: row.id,
    sequence: row.sequence,
    amountCents: row.amount_cents,
    dueOn: row.due_on,
    assignedUserId: row.assigned_user_id,
    status: asInstallmentStatus(row.status),
    paidBy: row.paid_by,
    paidAt: row.paid_at,
    mine: row.assigned_user_id === userId,
    checkoutUrl: row.assigned_user_id === userId ? row.checkout_url : null,
  };
}

function asPublicPlan(plan: GiftPlanRow, installments: InstallmentRow[], userId: string) {
  const paidCents = installments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount_cents, 0);
  return {
    id: plan.id,
    giftOrderId: plan.gift_order_id,
    title: plan.title || '',
    recipientName: plan.recipient_name || '',
    ownerId: plan.owner_id,
    totalCents: plan.total_cents,
    installmentCount: plan.installment_count,
    splitWithPartner: !!plan.split_with_partner,
    status: asGiftPlanStatus(plan.status),
    paymentMode: plan.payment_mode,
    createdAt: plan.created_at,
    progress: planProgress(paidCents, plan.total_cents),
    installments: installments.sort((a, b) => a.sequence - b.sequence).map((item) => asPublicInstallment(item, userId)),
  };
}

export async function listGiftPlans(ctx: {userId: string; coupleId: string}) {
  const plans = await db().prepare(
    `SELECT p.id, p.gift_order_id, p.couple_id, p.owner_id, p.total_cents, p.installment_count,
            p.split_with_partner, p.status, p.payment_mode, p.created_at, p.updated_at,
            o.title, o.recipient_name
     FROM gift_payment_plans p
     JOIN gift_orders o ON o.id = p.gift_order_id
     WHERE p.couple_id = ? AND (p.owner_id = ? OR o.recipient_user_id = ? OR EXISTS (
       SELECT 1 FROM gift_plan_installments i WHERE i.plan_id = p.id AND i.assigned_user_id = ?
     ))
     ORDER BY p.created_at DESC LIMIT 100`,
  ).bind(ctx.coupleId, ctx.userId, ctx.userId, ctx.userId).all<GiftPlanRow>();
  const ids = plans.results.map((plan) => plan.id);
  const installments = ids.length
    ? await db().prepare(
      `SELECT id, plan_id, sequence, amount_cents, due_on, assigned_user_id, status, paid_by, paid_at,
              payment_mode, session_id, checkout_url
       FROM gift_plan_installments
       WHERE plan_id IN (${ids.map(() => '?').join(',')})
       ORDER BY sequence ASC`,
    ).bind(...ids).all<InstallmentRow>()
    : {results: [] as InstallmentRow[]};
  const byPlan = new Map<string, InstallmentRow[]>();
  for (const row of installments.results) {
    const list = byPlan.get(row.plan_id) || [];
    list.push(row);
    byPlan.set(row.plan_id, list);
  }
  const billing = await coupleBilling(ctx.coupleId);
  const partner = await currentPartner(ctx);
  return {
    plus: billing.plus,
    mode: billing.mode,
    plans: plans.results.map((plan) => asPublicPlan(plan, byPlan.get(plan.id) || [], ctx.userId)),
    partner: partner ? {userId: partner.userId, name: partner.name} : null,
  };
}

export async function createGiftPlan(
  ctx: {userId: string; coupleId: string},
  input: {giftOrderId: string; installmentCount: GiftPlanCount; splitWithPartner: boolean},
) {
  const database = db();
  const order = await database.prepare(
    `SELECT id, owner_id, price_cents, status FROM gift_orders
     WHERE id = ? AND couple_id = ? AND owner_id = ?`,
  ).bind(input.giftOrderId, ctx.coupleId, ctx.userId).first<{id: string; owner_id: string; price_cents: number; status: string}>();
  if (!order) throw new ApiError(404, 'That gift order is gone.');
  const partner = await currentPartner(ctx);
  if (input.splitWithPartner && !partner) throw new ApiError(400, 'Connect your partner before splitting a gift.');
  const amounts = splitInstallments(order.price_cents, input.installmentCount);
  const dates = installmentDueDates(new Date().toISOString().slice(0, 10), input.installmentCount);
  const assignees = assignInstallments(input.installmentCount, ctx.userId, partner?.userId || null, input.splitWithPartner);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inserted = await database.prepare(
    `INSERT INTO gift_payment_plans (
       id, gift_order_id, couple_id, owner_id, total_cents, installment_count, split_with_partner,
       status, payment_mode, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
     ON CONFLICT (gift_order_id) DO NOTHING`,
  ).bind(
    id,
    order.id,
    ctx.coupleId,
    ctx.userId,
    order.price_cents,
    input.installmentCount,
    input.splitWithPartner ? 1 : 0,
    planMode(),
    now,
    now,
  ).run();
  if (!inserted.meta.changes) throw new ApiError(409, 'This gift already has a payment plan.');
  await database.batch(amounts.map((amount, index) => database.prepare(
    `INSERT INTO gift_plan_installments (
       id, plan_id, sequence, amount_cents, due_on, assigned_user_id, status, payment_mode
     ) VALUES (?, ?, ?, ?, ?, ?, 'due', 'pending')`,
  ).bind(crypto.randomUUID(), id, index + 1, amount, dates[index], assignees[index])));
  return listGiftPlans(ctx);
}

export async function markInstallmentPaid(
  installmentId: string,
  ctx: {userId: string; coupleId: string},
  paymentMode: string,
  sessionId?: string | null,
) {
  const database = db();
  const now = new Date().toISOString();
  const paid = await database.prepare(
    `UPDATE gift_plan_installments
     SET status = 'paid', paid_by = ?, paid_at = ?, payment_mode = ?, session_id = COALESCE(?, session_id)
     WHERE id = ? AND status = 'due' AND plan_id IN (
       SELECT id FROM gift_payment_plans WHERE couple_id = ?
     )`,
  ).bind(ctx.userId, now, paymentMode, sessionId || null, installmentId, ctx.coupleId).run();
  if (!paid.meta.changes) throw new ApiError(409, 'That payment could not be recorded.');
  const plan = await database.prepare(
    `SELECT p.id, p.gift_order_id, p.total_cents
     FROM gift_payment_plans p
     JOIN gift_plan_installments i ON i.plan_id = p.id
     WHERE i.id = ? AND p.couple_id = ?`,
  ).bind(installmentId, ctx.coupleId).first<{id: string; gift_order_id: string; total_cents: number}>();
  if (!plan) return listGiftPlans(ctx);
  const paidSum = await database.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) AS paid FROM gift_plan_installments WHERE plan_id = ? AND status = 'paid'`,
  ).bind(plan.id).first<{paid: number}>();
  if ((paidSum?.paid || 0) >= plan.total_cents) {
    await database.batch([
      database.prepare(
        `UPDATE gift_payment_plans SET status = 'completed', updated_at = ? WHERE id = ? AND couple_id = ?`,
      ).bind(now, plan.id, ctx.coupleId),
      database.prepare(
        `UPDATE gift_orders SET status = 'paid', payment_mode = ?, updated_at = ?
         WHERE id = ? AND couple_id = ? AND status = 'pending_payment'`,
      ).bind(paymentMode, now, plan.gift_order_id, ctx.coupleId),
    ]);
  }
  return listGiftPlans(ctx);
}

export async function startInstallmentCheckout(
  ctx: {userId: string; coupleId: string},
  installment: InstallmentRow,
  title: string,
) {
  const mode = checkoutMode();
  if (mode === 'disabled') return {url: null as string | null, payload: await markInstallmentPaid(installment.id, ctx, 'demo')};
  const origin = checkoutOrigin();
  const session = await stripe('checkout/sessions', {
    mode: 'payment',
    success_url: origin + '/gifts?orderPlan=' + installment.plan_id,
    cancel_url: origin + '/gifts?orderPlan=' + installment.plan_id,
    client_reference_id: ctx.userId,
    'metadata[installmentId]': installment.id,
    'metadata[planId]': installment.plan_id,
    'metadata[kind]': 'gift_installment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(installment.amount_cents),
    'line_items[0][price_data][product_data][name]': 'Gift plan · ' + title,
    'payment_method_types[0]': 'card',
  }, 'gift-plan-' + ctx.userId + '-' + installment.id);
  await db().prepare(
    `UPDATE gift_plan_installments SET session_id = ?, checkout_url = ?, payment_mode = ?
     WHERE id = ? AND status = 'due'`,
  ).bind(session.id, session.url, mode, installment.id).run();
  return {url: session.url as string, payload: await listGiftPlans(ctx)};
}

export async function fulfillInstallmentSession(session: any, expectedOwner?: string) {
  const installmentId = session.metadata?.installmentId;
  if (!installmentId || session.metadata?.kind !== 'gift_installment') return false;
  if (session.payment_status !== 'paid' || session.status !== 'complete') return false;
  const row = await db().prepare(
    `SELECT i.id, i.amount_cents, p.couple_id, p.owner_id
     FROM gift_plan_installments i
     JOIN gift_payment_plans p ON p.id = i.plan_id
     WHERE i.id = ?`,
  ).bind(installmentId).first<{id: string; amount_cents: number; couple_id: string; owner_id: string}>();
  if (!row) return false;
  if (expectedOwner && session.client_reference_id !== expectedOwner) return false;
  if (session.amount_total !== row.amount_cents) throw new ApiError(409, 'Payment details do not match this installment.');
  await markInstallmentPaid(row.id, {userId: session.client_reference_id || row.owner_id, coupleId: row.couple_id}, billingMode(), session.id);
  return true;
}

export async function cancelGiftPlan(ctx: {userId: string; coupleId: string}, planId: string) {
  const now = new Date().toISOString();
  const paid = await db().prepare(
    `SELECT i.id FROM gift_plan_installments i
     JOIN gift_payment_plans p ON p.id = i.plan_id
     WHERE p.id = ? AND p.couple_id = ? AND p.owner_id = ? AND i.status = 'paid' LIMIT 1`,
  ).bind(planId, ctx.coupleId, ctx.userId).first();
  if (paid) throw new ApiError(409, 'A payment already landed, so this plan stays open.');
  const result = await db().prepare(
    `UPDATE gift_payment_plans SET status = 'cancelled', updated_at = ?
     WHERE id = ? AND couple_id = ? AND owner_id = ? AND status = 'active'`,
  ).bind(now, planId, ctx.coupleId, ctx.userId).run();
  if (!result.meta.changes) throw new ApiError(404, 'That payment plan cannot be cancelled.');
  return listGiftPlans(ctx);
}
