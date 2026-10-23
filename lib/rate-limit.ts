import {env} from '@/lib/cf-env';
import {ApiError} from '@/lib/server';

export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const real = request.headers.get('x-real-ip') || '';
  return (forwarded || real || 'unknown').slice(0, 80);
}

export async function assertRateLimit(key: string, limit: number, windowMs: number) {
  const database = env.DB;
  if (!database) return;
  const now = Date.now();
  const resetAt = now + windowMs;
  const row = await database.prepare(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
  ).bind(key.slice(0, 180), resetAt, now, now).first<{count: number}>();
  if (row && row.count > limit) {
    throw new ApiError(429, 'Too many attempts. Please wait a few minutes and try again.');
  }
}
