import {z} from 'zod';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';
import {vapidPublicKey} from '@/lib/web-push';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  op: z.literal('subscribe'),
  endpoint: z.string().trim().url().max(2048),
  keys: z.object({
    p256dh: z.string().trim().min(8).max(512),
    auth: z.string().trim().min(4).max(256),
  }),
}).strict();
const unsubscribeSchema = z.object({
  op: z.literal('unsubscribe'),
  endpoint: z.string().trim().url().max(2048),
}).strict();

export async function GET() {
  try {
    const ctx = await ensureUser();
    const row = await db().prepare(
      'SELECT endpoint FROM push_subscriptions WHERE user_id = ? LIMIT 1',
    ).bind(ctx.userId).first<{endpoint: string}>();
    return response({
      publicKey: vapidPublicKey(),
      subscribed: !!row,
    });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    const body = await jsonBody(request, 4000);
    const database = db();
    if (body.op === 'subscribe') {
      const parsed = subscribeSchema.parse(body);
      await assertRateLimit('push:sub:' + ctx.userId, 20, 60 * 60 * 1000);
      await database.prepare(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
      ).bind(ctx.userId, parsed.endpoint, parsed.keys.p256dh, parsed.keys.auth, new Date().toISOString()).run();
      return response({subscribed: true});
    }
    if (body.op === 'unsubscribe') {
      const parsed = unsubscribeSchema.parse(body);
      await database.prepare(
        'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      ).bind(ctx.userId, parsed.endpoint).run();
      return response({subscribed: false});
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
