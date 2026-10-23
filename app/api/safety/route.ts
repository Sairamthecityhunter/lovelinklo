import {z} from 'zod';
import {assertRateLimit,clientIp} from '@/lib/rate-limit';
import {blockPartner,currentPartner,listBlockedBy,reportTarget} from '@/lib/partner-safety';
import {REPORT_REASON_VALUES} from '@/lib/report-reasons';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const blockSchema = z.object({op: z.literal('block')}).strict();
const unblockSchema = z.object({
  op: z.literal('unblock'),
  userId: z.string().uuid(),
}).strict();
const reportSchema = z.object({
  op: z.literal('report'),
  reason: z.enum(REPORT_REASON_VALUES),
  details: z.string().trim().min(1).max(2000),
  alsoBlock: z.boolean().optional(),
}).strict();

async function safetyPayload(ctx: {userId: string; coupleId: string}) {
  const partner = await currentPartner(ctx);
  const blocked = await listBlockedBy(ctx.userId);
  const lastBlocked = blocked[0] || null;
  const target = partner || lastBlocked;
  return {
    connected: !!partner,
    partner,
    canBlock: !!partner,
    canReport: !!target,
    reportTarget: target ? {name: target.name} : null,
    blocked: blocked.map((row) => ({userId: row.userId, name: row.name, createdAt: row.createdAt})),
  };
}

export async function GET() {
  try {
    const ctx = await ensureUser();
    return response(await safetyPayload(ctx));
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
    if (body.op === 'block') {
      blockSchema.parse(body);
      await assertRateLimit('safety:block:' + ctx.userId, 8, 60 * 60 * 1000);
      const partner = await blockPartner(ctx);
      return response({
        ...(await safetyPayload(ctx)),
        blockedPartner: {name: partner.name},
      });
    }
    if (body.op === 'unblock') {
      const parsed = unblockSchema.parse(body);
      await assertRateLimit('safety:unblock:' + ctx.userId, 20, 60 * 60 * 1000);
      const result = await database.prepare(
        'DELETE FROM partner_blocks WHERE blocker_id = ? AND blocked_id = ?',
      ).bind(ctx.userId, parsed.userId).run();
      if (!result.meta.changes) throw new ApiError(404, 'That block is no longer on your list.');
      return response({unblocked: true, ...(await safetyPayload(ctx))});
    }
    if (body.op === 'report') {
      const parsed = reportSchema.parse(body);
      await assertRateLimit('safety:report:' + ctx.userId, 5, 60 * 60 * 1000);
      await assertRateLimit('safety:report-ip:' + clientIp(request), 12, 60 * 60 * 1000);
      const target = await reportTarget(ctx);
      if (!target) throw new ApiError(403, 'You can only report someone you are linked with, or someone you just blocked.');
      const now = new Date().toISOString();
      await database.batch([
        database.prepare(
          'INSERT INTO partner_reports (id, reporter_id, reported_id, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).bind(crypto.randomUUID(), ctx.userId, target.userId, parsed.reason, parsed.details, 'open', now),
        database.prepare('UPDATE users SET flagged_for_review = 1, updated_at = ? WHERE id = ?').bind(now, target.userId),
      ]);
      let alsoBlocked = false;
      if (parsed.alsoBlock) {
        try {
          await blockPartner(ctx);
          alsoBlocked = true;
        } catch (error) {
          if (!(error instanceof ApiError && (error.status === 403 || error.status === 409))) throw error;
        }
      }
      return response({
        reported: true,
        alsoBlocked,
        confirmation: 'We received your report. They will not be told that you reported them.',
        ...(await safetyPayload(ctx)),
      });
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
