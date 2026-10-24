import {publicAppUrl} from './app-url';
import {buildAccountExport, resetUrlForToken} from './account-lifecycle';
import {currentPartner, unlinkFromPartner} from './partner-safety';
import {ApiError, clearOwned, db, tables} from './server';
import type {Collection, Profile} from './love-types';

function parseJson(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function ownedJsonRows(table: string, ownerColumn: string, userId: string) {
  const rows = await db().prepare(
    `SELECT * FROM ${table} WHERE ${ownerColumn} = ? LIMIT 2000`,
  ).bind(userId).all<Record<string, unknown>>();
  return rows.results.map((row) => {
    const data = parseJson(typeof row.data_json === 'string' ? row.data_json : null);
    return {
      ...row,
      ...(data && typeof data === 'object' ? data as object : {}),
      ownerId: row.owner_id || row.ownerId || userId,
      userId: row.user_id || row.userId,
      data_json: undefined,
    };
  });
}

export async function exportAccountData(ctx: {userId: string; coupleId: string; profile: Profile}) {
  const database = db();
  const account = await database.prepare(
    'SELECT email, created_at FROM auth_accounts WHERE user_id = ?',
  ).bind(ctx.userId).first<{email: string; created_at: string}>();
  const user = await database.prepare(
    'SELECT created_at FROM users WHERE id = ?',
  ).bind(ctx.userId).first<{created_at: string}>();

  const collectionEntries = await Promise.all(
    (Object.keys(tables) as Collection[]).map(async (name) => [name, await ownedJsonRows(tables[name], 'owner_id', ctx.userId)] as const),
  );
  const records: Record<string, unknown[]> = Object.fromEntries(collectionEntries);
  records.notes = await ownedJsonRows('couple_notes', 'owner_id', ctx.userId);
  records.checkins = await ownedJsonRows('daily_answers', 'user_id', ctx.userId);
  records.trips = await ownedJsonRows('couple_trips', 'owner_id', ctx.userId);
  records.giftOrders = await ownedJsonRows('gift_orders', 'owner_id', ctx.userId);
  records.togetherPlans = await ownedJsonRows('together_plans', 'owner_id', ctx.userId);
  records.concierge = await ownedJsonRows('concierge_records', 'owner_id', ctx.userId);
  records.seller = await ownedJsonRows('seller_records', 'owner_id', ctx.userId);
  records.specialDays = (await database.prepare(
    'SELECT id, type, label, month, day, year, visibility, created_at FROM special_days WHERE owner_user_id = ?',
  ).bind(ctx.userId).all()).results.map((row) => ({...row, ownerId: ctx.userId}));
  records.closeness = (await database.prepare(
    'SELECT owner_user_id, target_user_id, level FROM closeness WHERE owner_user_id = ?',
  ).bind(ctx.userId).all()).results.map((row) => ({...row, ownerId: ctx.userId}));
  records.media = (await database.prepare(
    'SELECT id, mime, size, created_at FROM media WHERE owner_id = ?',
  ).bind(ctx.userId).all()).results.map((row) => ({...row, ownerId: ctx.userId}));
  records.shopOrders = (await database.prepare(
    'SELECT id, sku, amount, status, created_at FROM shop_orders WHERE owner_id = ?',
  ).bind(ctx.userId).all()).results.map((row) => ({...row, ownerId: ctx.userId}));
  records.blocked = (await database.prepare(
    'SELECT blocked_id, created_at FROM partner_blocks WHERE blocker_id = ?',
  ).bind(ctx.userId).all()).results.map((row) => ({...row, ownerId: ctx.userId}));
  const passport = await database.prepare(
    'SELECT data_json, revision FROM together_passports WHERE owner_id = ?',
  ).bind(ctx.userId).first<{data_json: string; revision: number}>();
  if (passport) records.togetherPassport = [{...parseJson(passport.data_json) as object, revision: passport.revision, ownerId: ctx.userId}];

  return buildAccountExport({
    exportedAt: new Date().toISOString(),
    account: {
      userId: ctx.userId,
      email: account?.email || null,
      createdAt: account?.created_at || user?.created_at || null,
    },
    profile: ctx.profile,
    records,
  });
}

export function accountExportResponse(payload: unknown) {
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lovelink-account.json"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function deleteLoveLinkAccount(ctx: {userId: string; coupleId: string; profile: Profile}) {
  const database = db();
  const billing = await database.prepare(
    "SELECT owner_id FROM shop_memberships WHERE owner_id=? AND status NOT IN ('canceled','incomplete_expired') AND cancel_at_end=0",
  ).bind(ctx.userId).first();
  if (billing) throw new ApiError(409, 'Cancel your Premium renewal in Shop → Manage billing before deleting your account.');
  const pending = await database.prepare(
    "SELECT id FROM shop_orders WHERE owner_id=? AND status='pending' AND created_at>? LIMIT 1",
  ).bind(ctx.userId, Date.now() - 86400000).first();
  if (pending) throw new ApiError(409, 'Finish or let your pending checkout expire before deleting your account.');

  if (await currentPartner(ctx)) await unlinkFromPartner(ctx);

  await clearOwned(ctx);
  const futureTables = [
    'ai_recommendations',
    'bucket_list_items',
    'delivery_estimates',
    'gifts',
    'important_dates',
    'messages',
    'payments',
    'preferences',
    'privacy_settings',
    'shipping',
    'surprises',
    'wishlists',
  ];
  await database.batch([
    ...futureTables.map((table) => database.prepare(`DELETE FROM ${table} WHERE owner_id = ?`).bind(ctx.userId)),
    database.prepare('DELETE FROM auth_password_resets WHERE user_id = ?').bind(ctx.userId),
    database.prepare('DELETE FROM partner_invitations WHERE inviter_id = ? OR accepted_by = ?').bind(ctx.userId, ctx.userId),
    database.prepare('DELETE FROM partner_blocks WHERE blocker_id = ? OR blocked_id = ?').bind(ctx.userId, ctx.userId),
    database.prepare('DELETE FROM partner_reports WHERE reporter_id = ? OR reported_id = ?').bind(ctx.userId, ctx.userId),
    database.prepare('DELETE FROM audit_logs WHERE actor_id = ?').bind(ctx.userId),
    database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(ctx.userId),
    database.prepare('DELETE FROM auth_accounts WHERE user_id = ?').bind(ctx.userId),
    database.prepare('DELETE FROM users WHERE id = ?').bind(ctx.userId),
  ]);
  const other = await database.prepare('SELECT id FROM users WHERE couple_id = ? LIMIT 1').bind(ctx.coupleId).first<{id: string}>();
  if (other) {
    await database.prepare('UPDATE couples SET owner_id = ? WHERE id = ?').bind(other.id, ctx.coupleId).run();
  } else {
    await database.prepare('DELETE FROM partner_invitations WHERE couple_id = ?').bind(ctx.coupleId).run();
    await database.prepare('DELETE FROM couples WHERE id = ?').bind(ctx.coupleId).run();
  }
  return {deleted: true as const};
}

export function localResetUrl(token: string) {
  return resetUrlForToken(publicAppUrl(), token);
}
