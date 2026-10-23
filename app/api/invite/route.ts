import {z} from 'zod';
import {publicAppUrl} from '@/lib/app-url';
import {formatInviteCode,normalizeInviteCode,randomInviteCode,sha256Hex} from '@/lib/invite-code';
import {assertRateLimit,clientIp} from '@/lib/rate-limit';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response,tables} from '@/lib/server';

export const dynamic = 'force-dynamic';

const createSchema = z.object({op: z.literal('create')}).strict();
const cancelSchema = z.object({op: z.literal('cancel')}).strict();
const acceptSchema = z.object({
  op: z.literal('accept'),
  token: z.string().trim().max(120).optional(),
  code: z.string().trim().max(20).optional(),
}).strict();

export async function GET() {
  try {
    const ctx = await ensureUser();
    const members = await db().prepare('SELECT COUNT(*) AS n FROM users WHERE couple_id = ?').bind(ctx.coupleId).first<{n: number}>();
    const pending = await db().prepare(
      'SELECT expires_at FROM partner_invitations WHERE couple_id = ? AND accepted_by IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
    ).bind(ctx.coupleId, new Date().toISOString()).first<{expires_at: string}>();
    return response({
      connected: (members?.n || 0) > 1,
      pending: !!pending,
      expiresAt: pending?.expires_at || null,
    });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    const body = await jsonBody(request, 2000);
    const database = db();
    if (body.op === 'create') {
      createSchema.parse(body);
      await assertRateLimit('invite:create:' + ctx.userId, 8, 60 * 60 * 1000);
      const members = await database.prepare('SELECT COUNT(*) AS n FROM users WHERE couple_id = ?').bind(ctx.coupleId).first<{n: number}>();
      if ((members?.n || 0) >= 2) throw new ApiError(400, 'Your couple space already has two people.');
      const token = crypto.randomUUID() + crypto.randomUUID();
      const code = randomInviteCode();
      const now = new Date().toISOString();
      await database.batch([
        database.prepare('DELETE FROM partner_invitations WHERE couple_id = ? AND accepted_by IS NULL').bind(ctx.coupleId),
        database.prepare(
          'INSERT INTO partner_invitations (id,couple_id,inviter_id,token_hash,code_hash,expires_at,created_at) VALUES (?,?,?,?,?,?,?)',
        ).bind(crypto.randomUUID(), ctx.coupleId, ctx.userId, await sha256Hex(token), await sha256Hex(code), new Date(Date.now() + 7 * 86400000).toISOString(), now),
      ]);
      return response({
        token,
        code: formatInviteCode(code),
        expiresInDays: 7,
        url: `${publicAppUrl()}/invite?token=${encodeURIComponent(token)}`,
      });
    }
    if (body.op === 'cancel') {
      cancelSchema.parse(body);
      await database.prepare('DELETE FROM partner_invitations WHERE couple_id = ? AND accepted_by IS NULL').bind(ctx.coupleId).run();
      return response({cancelled: true});
    }
    const parsed = acceptSchema.parse(body);
    await assertRateLimit('invite:accept:' + (ctx.userId + ':' + clientIp(request)), 10, 60 * 60 * 1000);
    const raw = (parsed.token || parsed.code || '').trim();
    if (!raw) throw new ApiError(400, 'This invitation is invalid.');
    const tokenHash = await sha256Hex(raw);
    const codeHash = await sha256Hex(normalizeInviteCode(raw));
    const row = await database.prepare(
      'SELECT * FROM partner_invitations WHERE accepted_by IS NULL AND expires_at > ? AND (token_hash = ? OR code_hash = ?)',
    ).bind(new Date().toISOString(), tokenHash, codeHash).first<any>();
    if (!row) throw new ApiError(404, 'This invitation has expired or was already used. Ask for a fresh link or code.');
    if (row.inviter_id === ctx.userId) throw new ApiError(400, 'This invitation is for your partner. Share the link or code with them.');
    const ownMembers = await database.prepare('SELECT COUNT(*) AS n FROM users WHERE couple_id = ?').bind(ctx.coupleId).first<{n: number}>();
    if ((ownMembers?.n || 0) > 1) throw new ApiError(409, 'Disconnect your current couple space before joining another.');
    const partner = await database.prepare('SELECT profile_json FROM users WHERE id = ?').bind(row.inviter_id).first<{profile_json: string}>();
    if (!partner) throw new ApiError(404, 'This invitation is no longer available.');
    const p = JSON.parse(partner.profile_json);
    const joinerName = (ctx.profile.myName || '').trim() || 'Your partner';
    const inviterName = (p.myName || '').trim() || 'Your partner';
    const now = new Date().toISOString();
    const joinerProfile = {
      ...ctx.profile,
      partnerName: inviterName,
      partnerTimezone: p.myTimezone || ctx.profile.partnerTimezone,
      togetherSince: p.togetherSince || ctx.profile.togetherSince,
      sample: false,
    };
    const inviterProfile = {
      ...p,
      partnerName: joinerName,
      partnerTimezone: ctx.profile.myTimezone || p.partnerTimezone,
      sample: false,
    };
    const claim = database.prepare(
      'UPDATE partner_invitations SET accepted_by = ? WHERE id = ? AND accepted_by IS NULL AND expires_at > ? AND (SELECT COUNT(*) FROM users WHERE couple_id = ?) < 2',
    ).bind(ctx.userId, row.id, new Date().toISOString(), row.couple_id);
    const change = database.prepare(
      'UPDATE users SET couple_id = ?, profile_json = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM partner_invitations WHERE id = ? AND accepted_by = ?)',
    ).bind(row.couple_id, JSON.stringify(joinerProfile), now, ctx.userId, row.id, ctx.userId);
    const updateInviter = database.prepare(
      'UPDATE users SET profile_json = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM partner_invitations WHERE id = ? AND accepted_by = ?)',
    ).bind(JSON.stringify(inviterProfile), now, row.inviter_id, row.id, ctx.userId);
    const claimed = (idSql: string, params: unknown[]) =>
      database.prepare(`${idSql} AND EXISTS (SELECT 1 FROM partner_invitations WHERE id = ? AND accepted_by = ?)`).bind(...params, row.id, ctx.userId);
    const move = Object.values(tables).map((t) =>
      claimed(`UPDATE ${t} SET couple_id = ? WHERE owner_id = ?`, [row.couple_id, ctx.userId]),
    );
    const results = await database.batch([
      claim,
      change,
      updateInviter,
      ...move,
      claimed('DELETE FROM world_sessions WHERE user_id = ?', [ctx.userId]),
      claimed('UPDATE media SET couple_id = ? WHERE owner_id = ?', [row.couple_id, ctx.userId]),
      claimed('UPDATE couple_notes SET couple_id = ? WHERE owner_id = ?', [row.couple_id, ctx.userId]),
      claimed('UPDATE daily_answers SET couple_id = ? WHERE user_id = ?', [row.couple_id, ctx.userId]),
    ]);
    if (!results[0].meta.changes) throw new ApiError(409, 'This invitation has already been accepted or the couple space is full.');
    return response({connected: true});
  } catch (e) {
    return failure(e);
  }
}
