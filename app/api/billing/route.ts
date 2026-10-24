import {z} from 'zod';
import {billingPayload, cancelPlusDemo, coupleBilling, startPlusCheckout} from '@/lib/payment-plans-server';
import {currentPartner} from '@/lib/partner-safety';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError, ensureUser, failure, guard, jsonBody, response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const startSchema = z.object({op: z.literal('start-plus')}).strict();
const cancelSchema = z.object({op: z.literal('cancel-plus')}).strict();

export async function GET() {
  try {
    const ctx = await ensureUser();
    const [billing, partner] = await Promise.all([coupleBilling(ctx.coupleId), currentPartner(ctx)]);
    return response(billingPayload(billing, partner));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    await assertRateLimit('billing:' + ctx.userId, 30, 60 * 60 * 1000);
    const body = await jsonBody(request, 1000);
    if (body.op === 'start-plus') {
      startSchema.parse(body);
      const current = await coupleBilling(ctx.coupleId);
      if (current.plus) throw new ApiError(409, 'LoveLink Plus is already active for your couple.');
      const started = await startPlusCheckout(ctx);
      const partner = await currentPartner(ctx);
      return response({
        ...billingPayload(started.billing, partner),
        checkoutUrl: started.url,
      });
    }
    if (body.op === 'cancel-plus') {
      cancelSchema.parse(body);
      const billing = await coupleBilling(ctx.coupleId);
      if (billing.source === 'shop') {
        throw new ApiError(409, 'This couple’s Plus comes from Shop & Together. Use Manage billing there.');
      }
      const cancelled = await cancelPlusDemo(ctx);
      const partner = await currentPartner(ctx);
      return response(billingPayload(cancelled, partner));
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
