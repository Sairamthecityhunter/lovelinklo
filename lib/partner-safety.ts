import {soloProfileAfterUnlink, UNLINK_OWNER_COUPLE_UPDATES} from '@/lib/account-lifecycle';
import type {Profile} from '@/lib/love-types';
import {ApiError,db} from '@/lib/server';
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

export async function unlinkFromPartner(ctx: {userId: string; coupleId: string; profile?: Profile}) {
  const database = db();
  const leftoverCoupleId = ctx.coupleId;
  const partner = await currentPartner(ctx);
  const now = new Date().toISOString();
  if (!partner) {
    await database.prepare('DELETE FROM partner_invitations WHERE couple_id = ? AND accepted_by IS NULL').bind(leftoverCoupleId).run();
    return leftoverCoupleId;
  }

  const mine = await database.prepare('SELECT profile_json FROM users WHERE id = ?').bind(ctx.userId).first<{profile_json: string}>();
  const leftover = await database.prepare('SELECT profile_json FROM users WHERE id = ?').bind(partner.userId).first<{profile_json: string}>();
  let myProfile = ctx.profile;
  try {myProfile = myProfile || JSON.parse(mine?.profile_json || '{}') as Profile;} catch {myProfile = ctx.profile;}
  let leftoverProfile: Profile | null = null;
  try {leftoverProfile = leftover ? JSON.parse(leftover.profile_json) as Profile : null;} catch {leftoverProfile = null;}
  const mySolo = soloProfileAfterUnlink(myProfile || {myName:'You',partnerName:'Your partner',myTimezone:'UTC',partnerTimezone:'UTC',togetherSince:'',longDistance:false,browserNotifications:false,notificationPrivacy:true,sample:false,interests:'',budget:0,location:''});
  const leftoverSolo = leftoverProfile ? soloProfileAfterUnlink(leftoverProfile) : null;
  const nextCoupleId = crypto.randomUUID();

  await database.batch([
    database.prepare('INSERT INTO couples (id,owner_id,created_at) VALUES (?,?,?)').bind(nextCoupleId, ctx.userId, now),
    database.prepare('UPDATE users SET couple_id = ?, profile_json = ?, updated_at = ? WHERE id = ?').bind(nextCoupleId, JSON.stringify(mySolo), now, ctx.userId),
    ...(leftoverSolo ? [
      database.prepare('UPDATE users SET profile_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(leftoverSolo), now, partner.userId),
    ] : []),
    database.prepare('UPDATE couples SET owner_id = ? WHERE id = ? AND owner_id = ?').bind(partner.userId, leftoverCoupleId, ctx.userId),
    database.prepare('UPDATE shop_world_settings SET owner_id = ? WHERE couple_id = ? AND owner_id = ?').bind(partner.userId, leftoverCoupleId, ctx.userId),
    database.prepare('UPDATE couple_plans SET started_by = ? WHERE couple_id = ? AND started_by = ?').bind(partner.userId, leftoverCoupleId, ctx.userId),
    database.prepare('DELETE FROM world_sessions WHERE user_id = ?').bind(ctx.userId),
    ...UNLINK_OWNER_COUPLE_UPDATES.map(({table, ownerColumn}) =>
      database.prepare(`UPDATE ${table} SET couple_id = ? WHERE ${ownerColumn} = ?`).bind(nextCoupleId, ctx.userId),
    ),
    database.prepare('DELETE FROM partner_invitations WHERE couple_id = ? AND accepted_by IS NULL').bind(leftoverCoupleId),
    database.prepare('DELETE FROM closeness WHERE (owner_user_id = ? AND target_user_id = ?) OR (owner_user_id = ? AND target_user_id = ?)').bind(ctx.userId, partner.userId, partner.userId, ctx.userId),
    database.prepare(
      `DELETE FROM sent_reminders WHERE special_day_id IN (
         SELECT id FROM special_days WHERE (owner_user_id = ? AND person_user_id = ?) OR (owner_user_id = ? AND person_user_id = ?)
       )`,
    ).bind(ctx.userId, partner.userId, partner.userId, ctx.userId),
    database.prepare('DELETE FROM special_days WHERE (owner_user_id = ? AND person_user_id = ?) OR (owner_user_id = ? AND person_user_id = ?)').bind(ctx.userId, partner.userId, partner.userId, ctx.userId),
  ]);
  ctx.coupleId = nextCoupleId;
  if (ctx.profile) Object.assign(ctx.profile, mySolo);
  return nextCoupleId;
}

export async function clearPairNotifications(a: string, b: string, coupleId?: string) {
  const database = db();
  await database.batch([
    database.prepare(
      `DELETE FROM sent_reminders WHERE special_day_id IN (
         SELECT id FROM special_days WHERE (owner_user_id = ? AND person_user_id = ?) OR (owner_user_id = ? AND person_user_id = ?)
       )`,
    ).bind(a, b, b, a),
    database.prepare('DELETE FROM special_days WHERE (owner_user_id = ? AND person_user_id = ?) OR (owner_user_id = ? AND person_user_id = ?)').bind(a, b, b, a),
    database.prepare('DELETE FROM closeness WHERE (owner_user_id = ? AND target_user_id = ?) OR (owner_user_id = ? AND target_user_id = ?)').bind(a, b, b, a),
    ...(coupleId ? [
      database.prepare('DELETE FROM couple_notes WHERE couple_id = ?').bind(coupleId),
      database.prepare('DELETE FROM sent_reminders WHERE special_day_id IN (SELECT special_day_id FROM couple_trips WHERE couple_id = ? AND special_day_id IS NOT NULL)').bind(coupleId),
      database.prepare('DELETE FROM special_days WHERE id IN (SELECT special_day_id FROM couple_trips WHERE couple_id = ? AND special_day_id IS NOT NULL)').bind(coupleId),
      database.prepare('DELETE FROM couple_trips WHERE couple_id = ?').bind(coupleId),
      database.prepare('DELETE FROM gift_orders WHERE couple_id = ?').bind(coupleId),
    ] : [
      database.prepare('DELETE FROM couple_notes WHERE owner_id = ? OR owner_id = ?').bind(a, b),
      database.prepare('DELETE FROM couple_trips WHERE owner_id = ? OR owner_id = ?').bind(a, b),
      database.prepare('DELETE FROM gift_orders WHERE owner_id = ? OR owner_id = ?').bind(a, b),
    ]),
  ]);
}

export async function blockPartner(ctx: {userId: string; coupleId: string; profile: Profile}) {
  const partner = await currentPartner(ctx);
  if (!partner) throw new ApiError(403, 'You can only block someone you are currently linked with.');
  if (await pairingBlocked(ctx.userId, partner.userId)) throw new ApiError(409, 'This person is already blocked.');
  const now = new Date().toISOString();
  await clearPairNotifications(ctx.userId, partner.userId, ctx.coupleId);
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
