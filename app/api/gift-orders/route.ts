import {z} from 'zod';
import {
  asGiftOrderStatus,
  catalogGift,
  giftCheckoutReady,
  giftPaymentHook,
  giftPriceCents,
} from '@/lib/gift-orders';
import {currentPartner} from '@/lib/partner-safety';
import {assertRateLimit} from '@/lib/rate-limit';
import {checkoutMode,stripe,SHOP_ORIGIN} from '@/lib/shop-server';
import {products} from '@/lib/love-data';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  op: z.literal('create'),
  productId: z.string().trim().min(1).max(80),
  recipientName: z.string().trim().min(1).max(80),
  forPartner: z.boolean().optional(),
  addressLine1: z.string().trim().min(1).max(120),
  addressLine2: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(2).max(56),
  message: z.string().trim().max(500).optional().nullable(),
}).strict();
const cancelSchema = z.object({op: z.literal('cancel'), id: z.string().uuid()}).strict();
const confirmSchema = z.object({op: z.literal('confirm'), id: z.string().uuid(), session: z.string().min(1).max(200).optional()}).strict();

type GiftOrderRow = {
  id: string;
  owner_id: string;
  product_id: string;
  title: string;
  price_cents: number;
  currency: string;
  recipient_name: string;
  recipient_user_id: string | null;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  message: string;
  status: string;
  payment_mode: string;
  session_id: string | null;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
};

function asOrder(row: GiftOrderRow, userId: string) {
  const product = catalogGift(row.product_id);
  return {
    id: row.id,
    ownerId: row.owner_id,
    productId: row.product_id,
    title: row.title,
    priceCents: row.price_cents,
    currency: row.currency,
    recipientName: row.recipient_name,
    recipientUserId: row.recipient_user_id,
    address: {
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.city,
      region: row.region,
      postalCode: row.postal_code,
      country: row.country,
    },
    message: row.message,
    status: asGiftOrderStatus(row.status),
    paymentMode: row.payment_mode,
    checkoutUrl: row.owner_id === userId ? row.checkout_url : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mine: row.owner_id === userId,
    image: product?.image || '',
  };
}

async function ownOrder(id: string, ctx: {userId: string; coupleId: string}) {
  const row = await db().prepare(
    `SELECT id, owner_id, product_id, title, price_cents, currency, recipient_name, recipient_user_id,
            address_line1, address_line2, city, region, postal_code, country, message, status, payment_mode,
            session_id, checkout_url, created_at, updated_at
     FROM gift_orders WHERE id = ? AND couple_id = ? AND owner_id = ?`,
  ).bind(id, ctx.coupleId, ctx.userId).first<GiftOrderRow>();
  if (!row) throw new ApiError(404, 'That gift order is gone.');
  return row;
}

async function listOrders(ctx: {userId: string; coupleId: string}) {
  const partner = await currentPartner(ctx);
  const rows = await db().prepare(
    `SELECT id, owner_id, product_id, title, price_cents, currency, recipient_name, recipient_user_id,
            address_line1, address_line2, city, region, postal_code, country, message, status, payment_mode,
            session_id, checkout_url, created_at, updated_at
     FROM gift_orders
     WHERE couple_id = ? AND (owner_id = ? OR recipient_user_id = ?)
     ORDER BY created_at DESC LIMIT 200`,
  ).bind(ctx.coupleId, ctx.userId, ctx.userId).all<GiftOrderRow>();
  const mode = checkoutMode();
  return {
    orders: rows.results.map((row) => asOrder(row, ctx.userId)),
    catalog: products.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      price: item.price,
      image: item.image,
      category: item.category,
    })),
    payment: giftPaymentHook(mode),
    partner: partner ? {userId: partner.userId, name: partner.name} : null,
  };
}

export async function GET() {
  try {
    const ctx = await ensureUser();
    return response(await listOrders(ctx));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    await assertRateLimit('gift-orders:' + ctx.userId, 40, 60 * 60 * 1000);
    const body = await jsonBody(request, 4000);
    const database = db();
    if (body.op === 'cancel') {
      const parsed = cancelSchema.parse(body);
      const paidPart = await database.prepare(
        `SELECT i.id FROM gift_plan_installments i
         JOIN gift_payment_plans p ON p.id = i.plan_id
         WHERE p.gift_order_id = ? AND p.couple_id = ? AND i.status = 'paid' LIMIT 1`,
      ).bind(parsed.id, ctx.coupleId).first();
      if (paidPart) throw new ApiError(409, 'A payment already landed on this gift plan, so the order stays open.');
      const now = new Date().toISOString();
      const result = await database.prepare(
        `UPDATE gift_orders SET status = 'cancelled', updated_at = ?
         WHERE id = ? AND couple_id = ? AND owner_id = ? AND status = 'pending_payment'`,
      ).bind(now, parsed.id, ctx.coupleId, ctx.userId).run();
      if (!result.meta.changes) throw new ApiError(404, 'That gift order cannot be cancelled.');
      await database.prepare(
        `UPDATE gift_payment_plans SET status = 'cancelled', updated_at = ?
         WHERE gift_order_id = ? AND couple_id = ? AND status = 'active'`,
      ).bind(now, parsed.id, ctx.coupleId).run();
      return response(await listOrders(ctx));
    }
    if (body.op === 'confirm') {
      const parsed = confirmSchema.parse(body);
      const current = await ownOrder(parsed.id, ctx);
      if (current.status !== 'pending_payment') return response(await listOrders(ctx));
      if (!current.session_id) return response(await listOrders(ctx));
      const sessionId = parsed.session || current.session_id;
      const session = await stripe('checkout/sessions/' + sessionId);
      if (session.metadata?.giftOrderId !== current.id || session.client_reference_id !== ctx.userId) {
        throw new ApiError(409, 'Payment details do not match this gift order.');
      }
      if (session.payment_status === 'paid' && session.status === 'complete') {
        await database.prepare(
          `UPDATE gift_orders SET status = 'paid', session_id = ?, updated_at = ?
           WHERE id = ? AND owner_id = ? AND status = 'pending_payment'`,
        ).bind(sessionId, new Date().toISOString(), current.id, ctx.userId).run();
      }
      return response(await listOrders(ctx));
    }
    if (body.op === 'create') {
      const parsed = createSchema.parse(body);
      const product = catalogGift(parsed.productId);
      const priceCents = giftPriceCents(parsed.productId);
      if (!product || priceCents === null) throw new ApiError(400, 'That gift is not in the catalog.');
      const partner = await currentPartner(ctx);
      if (parsed.forPartner && !partner) throw new ApiError(400, 'Connect your partner before sending this gift to them.');
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const recipientName = parsed.forPartner && partner ? partner.name : parsed.recipientName;
      const recipientUserId = parsed.forPartner && partner ? partner.userId : null;
      await database.prepare(
        `INSERT INTO gift_orders (
           id, couple_id, owner_id, product_id, title, price_cents, currency, recipient_name, recipient_user_id,
           address_line1, address_line2, city, region, postal_code, country, message, status, payment_mode,
           session_id, checkout_url, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'pending', NULL, NULL, ?, ?)`,
      ).bind(
        id,
        ctx.coupleId,
        ctx.userId,
        product.id,
        product.title,
        priceCents,
        recipientName,
        recipientUserId,
        parsed.addressLine1,
        parsed.addressLine2 || '',
        parsed.city,
        parsed.region || '',
        parsed.postalCode,
        parsed.country,
        parsed.message || '',
        now,
        now,
      ).run();
      let checkoutUrl: string | null = null;
      if (giftCheckoutReady(checkoutMode(), priceCents)) {
        const session = await stripe('checkout/sessions', {
          mode: 'payment',
          success_url: SHOP_ORIGIN + '/gifts?place=' + product.id + '&giftOrder=' + id,
          cancel_url: SHOP_ORIGIN + '/gifts?place=' + product.id + '&giftOrder=' + id,
          client_reference_id: ctx.userId,
          'metadata[giftOrderId]': id,
          'metadata[productId]': product.id,
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(priceCents),
          'line_items[0][price_data][product_data][name]': product.title,
          'payment_method_types[0]': 'card',
        }, 'gift-order-' + ctx.userId + '-' + id);
        await database.prepare(
          `UPDATE gift_orders SET session_id = ?, checkout_url = ?, payment_mode = ?, updated_at = ?
           WHERE id = ? AND owner_id = ?`,
        ).bind(session.id, session.url, checkoutMode(), now, id, ctx.userId).run();
        checkoutUrl = session.url || null;
      }
      const payload = await listOrders(ctx);
      return response({
        ...payload,
        created: payload.orders.find((item) => item.id === id) || null,
        checkoutUrl,
      });
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
