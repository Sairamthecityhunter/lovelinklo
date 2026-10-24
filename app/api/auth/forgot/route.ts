import {z} from 'zod';
import {ensureAuthTables} from '@/lib/migrate-local';
import {assertRateLimit,clientIp} from '@/lib/rate-limit';
import {failure,guard,jsonBody,response} from '@/lib/server';
import {sendPasswordResetEmail} from '@/lib/reset-email';
import {normalizeEmail,requestPasswordReset} from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().trim().min(3).max(254),
}).strict();

export async function POST(request: Request) {
  try {
    guard(request);
    await ensureAuthTables();
    const body = bodySchema.parse(await jsonBody(request, 2000));
    const email = normalizeEmail(body.email);
    await assertRateLimit('auth:forgot:' + email, 5, 60 * 60 * 1000);
    await assertRateLimit('auth:forgot-ip:' + clientIp(request), 10, 60 * 60 * 1000);
    const reset = await requestPasswordReset(email);
    if (reset) await sendPasswordResetEmail(reset.email, reset.token);
    return response({ok: true});
  } catch (e) {
    return failure(e);
  }
}
