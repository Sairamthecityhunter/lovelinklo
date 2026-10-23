import type {Profile} from '@/lib/love-types';
import {ApiError,db,tables} from '@/lib/server';
import {deliverPush} from '@/lib/web-push';

export type SafetyTarget = {userId: string; name: string};

function profileName(profileJson: string, fallback = 'Your partner') {
  try {
    const parsed = JSON.parse(profileJson) as {myName?: string};
    return parsed.myName?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function currentPartner(ctx: {userId: string; coupleId: string}): Promise<SafetyTarget | null> {
  const row = await db().prepare(
    'SELECT id, profile_json FROM users WHERE couple_id = ? AND id != ? LIMIT 1',
  ).bind(ctx.coupleId, ctx.userId).first<{id: string; profile_json: string}>();
  return row ? {userId: row.id, name: profileName(row.profile_json)} : null;
}

export async function pairingBlocked(a: string, b: string) {
  const row = await db().prepare(
    'SELECT blocker_id FROM partner_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1',
  ).bind(a, b, b, a).first<{blocker_id: string}>();
  return !!row;
}

export async function unlinkFromPartner(ctx: {userId: string; coupleId: string}) {
  const database = db();
  const nextCoupleId = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.batch([
    database.prepare('INSERT INTO couples (id,owner_id,created_at) VALUES (?,?,?)').bind(nextCoupleId, ctx.userId, now),
    database.prepare('UPDATE users SET couple_id = ? WHERE id = ?').bind(nextCoupleId, ctx.userId),
    database.prepare('DELETE FROM world_sessions WHERE user_id = ?').bind(ctx.userId),
    ...Object.values(tables).map((t) => database.prepare(`UPDATE ${t} SET couple_id = ? WHERE owner_id = ?`).bind(nextCoupleId, ctx.userId)),
    database.prepare('UPDATE media SET couple_id = ? WHERE owner_id = ?').bind(nextCoupleId, ctx.userId),
    database.prepare('UPDATE couple_notes SET couple_id = ? WHERE owner_id = ?').bind(nextCoupleId, ctx.userId),
    database.prepare('UPDATE daily_answers SET couple_id = ? WHERE user_id = ?').bind(nextCoupleId, ctx.userId),
    database.prepare('DELETE FROM partner_invitations WHERE couple_id = ? AND accepted_by IS NULL').bind(ctx.coupleId),
  ]);
  ctx.coupleId = nextCoupleId;
  return nextCoupleId;
}

export async function clearPairNotifications(a: string, b: string) {
  const database = db();
  await database.batch([
    database.prepare(
      `DELETE FROM sent_reminders WHERE special_day_id IN (
         SELECT id FROM special_days WHERE (owner_user_id = ? AND person_user_id = ?) OR (owner_user_id = ? AND person_user_id = ?)
       )`,
    ).bind(a, b, b, a),
    database.prepare('DELETE FROM special_days WHERE (owner_user_id = ? AND person_user_id = ?) OR (owner_user_id = ? AND person_user_id = ?)').bind(a, b, b, a),
    database.prepare('DELETE FROM closeness WHERE (owner_user_id = ? AND target_user_id = ?) OR (owner_user_id = ? AND target_user_id = ?)').bind(a, b, b, a),
  ]);
}

export async function blockPartner(ctx: {userId: string; coupleId: string; profile: Profile}) {
  const partner = await currentPartner(ctx);
  if (!partner) throw new ApiError(403, 'You can only block someone you are currently linked with.');
  if (await pairingBlocked(ctx.userId, partner.userId)) throw new ApiError(409, 'This person is already blocked.');
  const now = new Date().toISOString();
  await clearPairNotifications(ctx.userId, partner.userId);
  await db().prepare(
    'INSERT INTO partner_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)',
  ).bind(ctx.userId, partner.userId, now).run();
  await unlinkFromPartner(ctx);
  await deliverPush(ctx.userId, {
    kind: 'block-confirmed',
    title: 'Block confirmed',
    body: 'They are unlinked. They were not notified.',
    url: '/us',
  });
  return partner;
}

export async function listBlockedBy(userId: string): Promise<Array<SafetyTarget & {createdAt: string}>> {
  const rows = await db().prepare(
    `SELECT b.blocked_id, b.created_at, u.profile_json
     FROM partner_blocks b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC`,
  ).bind(userId).all<{blocked_id: string; created_at: string; profile_json: string}>();
  return rows.results.map((row) => ({
    userId: row.blocked_id,
    name: profileName(row.profile_json, 'Blocked account'),
    createdAt: row.created_at,
  }));
}

export async function latestBlockedBy(userId: string) {
  const blocked = await listBlockedBy(userId);
  return blocked[0] || null;
}

export async function reportTarget(ctx: {userId: string; coupleId: string}) {
  return (await currentPartner(ctx)) || (await latestBlockedBy(ctx.userId));
}
