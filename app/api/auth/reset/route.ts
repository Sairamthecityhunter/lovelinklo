import {z} from 'zod';
import {ensureAuthTables} from '@/lib/migrate-local';
import {assertRateLimit,clientIp} from '@/lib/rate-limit';
import {failure,guard,jsonBody} from '@/lib/server';
import {completePasswordReset,withSessionCookie} from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().trim().min(32).max(128),
  password: z.string().min(8).max(128),
}).strict();

export async function POST(request: Request) {
  try {
    guard(request);
    await ensureAuthTables();
    await assertRateLimit('auth:reset:' + clientIp(request), 8, 60 * 60 * 1000);
    const body = bodySchema.parse(await jsonBody(request, 2000));
    const result = await completePasswordReset(body.token, body.password);
    return withSessionCookie({ok: true}, result.token, request);
  } catch (e) {
    return failure(e);
  }
}
