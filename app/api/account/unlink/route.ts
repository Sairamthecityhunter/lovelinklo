import {unlinkFromPartner} from '@/lib/partner-safety';
import {assertRateLimit} from '@/lib/rate-limit';
import {ensureUser, failure, guard, readState, response} from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser(request);
    await assertRateLimit('account:unlink:' + ctx.userId, 8, 60 * 60 * 1000);
    await unlinkFromPartner(ctx);
    return response(await readState(ctx));
  } catch (e) {
    return failure(e);
  }
}
