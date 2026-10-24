import {z} from 'zod';
import {asGiftPlanCount, canCreateGiftPlan, canPayInstallment} from '@/lib/payment-plans';
import {
  cancelGiftPlan,
  couplePlusActive,
  createGiftPlan,
  fulfillInstallmentSession,
  listGiftPlans,
  startInstallmentCheckout,
} from '@/lib/payment-plans-server';
import {assertRateLimit} from '@/lib/rate-limit';
import {stripe} from '@/lib/shop-server';
import {ApiError, db, ensureUser, failure, guard, jsonBody, response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  op: z.literal('create'),
  giftOrderId: z.string().uuid(),
  installments: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  splitWithPartner: z.boolean().optional(),
}).strict();
const paySchema = z.object({op: z.literal('pay'), installmentId: z.string().uuid()}).strict();
const confirmSchema = z.object({
  op: z.literal('confirm'),
  installmentId: z.string().uuid(),
  session: z.string().min(1).max(200).optional(),
}).strict();
const cancelSchema = z.object({op: z.literal('cancel'), planId: z.string().uuid()}).strict();

export async function GET() {
  try {
    const ctx = await ensureUser();
    return response(await listGiftPlans(ctx));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    await assertRateLimit('payment-plans:' + ctx.userId, 40, 60 * 60 * 1000);
    const body = await jsonBody(request, 2000);
    if (body.op === 'create') {
      const parsed = createSchema.parse(body);
      if (!(await couplePlusActive(ctx.coupleId))) {
        throw new ApiError(403, 'LoveLink Plus is needed to split or schedule a gift.');
      }
      const order = await db().prepare(
        `SELECT status, price_cents FROM gift_orders WHERE id = ? AND couple_id = ? AND owner_id = ?`,
      ).bind(parsed.giftOrderId, ctx.coupleId, ctx.userId).first<{status: string; price_cents: number}>();
      const existing = await db().prepare(
        `SELECT id FROM gift_payment_plans WHERE gift_order_id = ? AND couple_id = ? LIMIT 1`,
      ).bind(parsed.giftOrderId, ctx.coupleId).first();
      const blocked = canCreateGiftPlan({
        plus: true,
        orderStatus: order?.status || '',
        priceCents: order?.price_cents || 0,
        existingPlan: !!existing,
        installmentCount: asGiftPlanCount(parsed.installments),
      });
      if (!order) throw new ApiError(404, 'That gift order is gone.');
      if (blocked) throw new ApiError(400, blocked);
      return response(await createGiftPlan(ctx, {
        giftOrderId: parsed.giftOrderId,
        installmentCount: parsed.installments,
        splitWithPartner: !!parsed.splitWithPartner,
      }));
    }
    if (body.op === 'pay') {
      const parsed = paySchema.parse(body);
      const row = await db().prepare(
        `SELECT i.id, i.plan_id, i.sequence, i.amount_cents, i.due_on, i.assigned_user_id, i.status,
                i.paid_by, i.paid_at, i.payment_mode, i.session_id, i.checkout_url, p.status AS plan_status, o.title
         FROM gift_plan_installments i
         JOIN gift_payment_plans p ON p.id = i.plan_id
         JOIN gift_orders o ON o.id = p.gift_order_id
         WHERE i.id = ? AND p.couple_id = ?`,
      ).bind(parsed.installmentId, ctx.coupleId).first<any>();
      if (!row) throw new ApiError(404, 'That installment is gone.');
      const blocked = canPayInstallment({
        planStatus: row.plan_status,
        installmentStatus: row.status,
        assignedUserId: row.assigned_user_id,
        actorId: ctx.userId,
      });
      if (blocked) throw new ApiError(403, blocked);
      const started = await startInstallmentCheckout(ctx, row, row.title);
      return response({...started.payload, checkoutUrl: started.url});
    }
    if (body.op === 'confirm') {
      const parsed = confirmSchema.parse(body);
      const row = await db().prepare(
        `SELECT i.session_id FROM gift_plan_installments i
         JOIN gift_payment_plans p ON p.id = i.plan_id
         WHERE i.id = ? AND p.couple_id = ?`,
      ).bind(parsed.installmentId, ctx.coupleId).first<{session_id: string | null}>();
      if (!row?.session_id && !parsed.session) return response(await listGiftPlans(ctx));
      const session = await stripe('checkout/sessions/' + (parsed.session || row?.session_id));
      await fulfillInstallmentSession(session, ctx.userId);
      return response(await listGiftPlans(ctx));
    }
    if (body.op === 'cancel') {
      const parsed = cancelSchema.parse(body);
      return response(await cancelGiftPlan(ctx, parsed.planId));
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
