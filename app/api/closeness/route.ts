import {z} from 'zod';
import {closenessToward,isClosenessLevel,setCloseness} from '@/lib/closeness';
import {currentPartner} from '@/lib/partner-safety';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  op: z.literal('set'),
  level: z.number().int(),
}).strict();

export async function GET() {
  try {
    const ctx = await ensureUser();
    const partner = await currentPartner(ctx);
    const level = partner ? await closenessToward(ctx.userId, partner.userId) : null;
    return response({partner: partner ? {name: partner.name} : null, level});
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    const parsed = schema.parse(await jsonBody(request, 500));
    if (!isClosenessLevel(parsed.level)) throw new ApiError(400, 'Choose 100, 50, or 25.');
    const partner = await currentPartner(ctx);
    if (!partner) throw new ApiError(403, 'Connect with your partner before setting closeness.');
    await assertRateLimit('closeness:' + ctx.userId, 30, 60 * 60 * 1000);
    await setCloseness(ctx.userId, partner.userId, parsed.level);
    return response({level: parsed.level, partner: {name: partner.name}});
  } catch (e) {
    return failure(e);
  }
}
