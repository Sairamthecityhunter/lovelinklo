import {z} from 'zod';
import {asClosenessLevel,closenessToward,isClosenessLevel,viewerUnlocks} from '@/lib/closeness';
import {
  asTripStatus,
  asTripVisibility,
  canSeeTrip,
  isTripStatus,
  splitTrips,
  tripDateError,
  tripReminderParts,
} from '@/lib/couple-trips';
import {currentPartner} from '@/lib/partner-safety';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();
const tripFields = z.object({
  title: z.string().trim().min(1).max(140),
  destination: z.string().trim().min(1).max(140),
  startDate: dateField,
  endDate: dateField,
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['idea', 'planned', 'booked', 'done']).optional(),
  visibility: z.number().int().optional(),
  remind: z.boolean().optional(),
});
const createSchema = tripFields.extend({op: z.literal('create')}).strict();
const updateSchema = tripFields.extend({op: z.literal('update'), id: z.string().uuid()}).strict();
const deleteSchema = z.object({op: z.literal('delete'), id: z.string().uuid()}).strict();

type TripRow = {
  id: string;
  owner_id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  status: string;
  visibility: number;
  special_day_id: string | null;
  created_at: string;
  updated_at: string;
};

function asTrip(row: TripRow, userId: string) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    status: asTripStatus(row.status),
    visibility: asTripVisibility(row.visibility),
    specialDayId: row.special_day_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mine: row.owner_id === userId,
  };
}

async function listTrips(ctx: {userId: string; coupleId: string}) {
  const partner = await currentPartner(ctx);
  const level = partner ? await closenessToward(ctx.userId, partner.userId) : 100;
  const rows = await db().prepare(
    `SELECT id, owner_id, title, destination, start_date, end_date, notes, status, visibility, special_day_id, created_at, updated_at
     FROM couple_trips WHERE couple_id = ? ORDER BY created_at DESC LIMIT 200`,
  ).bind(ctx.coupleId).all<TripRow>();
  const visible = [];
  let locked = 0;
  for (const row of rows.results) {
    const mine = row.owner_id === ctx.userId;
    const visibility = asTripVisibility(row.visibility);
    if (mine || canSeeTrip(level, visibility)) visible.push(asTrip(row, ctx.userId));
    else locked += 1;
  }
  const {upcoming, past} = splitTrips(visible);
  return {
    trips: visible,
    upcoming,
    past,
    locked,
    unlocks: viewerUnlocks(partner ? level : null),
    partner: partner ? {userId: partner.userId, name: partner.name} : null,
  };
}

async function ownTrip(id: string, ctx: {userId: string; coupleId: string}) {
  const row = await db().prepare(
    `SELECT id, owner_id, title, destination, start_date, end_date, notes, status, visibility, special_day_id, created_at, updated_at
     FROM couple_trips WHERE id = ? AND couple_id = ? AND owner_id = ?`,
  ).bind(id, ctx.coupleId, ctx.userId).first<TripRow>();
  if (!row) throw new ApiError(404, 'That trip is gone.');
  return row;
}

async function syncTripReminder(
  ctx: {userId: string; coupleId: string},
  trip: {id: string; title: string; startDate: string | null; visibility: number; specialDayId: string | null},
  remind: boolean,
) {
  const database = db();
  if (!remind || !trip.startDate) {
    if (trip.specialDayId) {
      await database.prepare('DELETE FROM special_days WHERE id = ? AND owner_user_id = ?').bind(trip.specialDayId, ctx.userId).run();
      await database.prepare('UPDATE couple_trips SET special_day_id = NULL WHERE id = ? AND owner_id = ?').bind(trip.id, ctx.userId).run();
    }
    return null;
  }
  const partner = await currentPartner(ctx);
  const parts = tripReminderParts(trip.startDate);
  if (trip.specialDayId) {
    const result = await database.prepare(
      `UPDATE special_days SET label = ?, month = ?, day = ?, year = ?, visibility = ?, person_user_id = ?, name = ?
       WHERE id = ? AND owner_user_id = ?`,
    ).bind(trip.title, parts.month, parts.day, parts.year, trip.visibility, partner?.userId || null, partner?.name || null, trip.specialDayId, ctx.userId).run();
    if (result.meta.changes) return trip.specialDayId;
  }
  const id = crypto.randomUUID();
  await database.prepare(
    `INSERT INTO special_days (id, owner_user_id, person_user_id, name, type, label, month, day, year, interests, visibility, created_at)
     VALUES (?, ?, ?, ?, 'custom', ?, ?, ?, ?, '[]', ?, ?)`,
  ).bind(id, ctx.userId, partner?.userId || null, partner?.name || null, trip.title, parts.month, parts.day, parts.year, trip.visibility, new Date().toISOString()).run();
  await database.prepare('UPDATE couple_trips SET special_day_id = ? WHERE id = ? AND owner_id = ?').bind(id, trip.id, ctx.userId).run();
  return id;
}

export async function GET(request:Request) {
  try {
    const ctx = await ensureUser(request);
    return response(await listTrips(ctx));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser(request);
    await assertRateLimit('trips:' + ctx.userId, 40, 60 * 60 * 1000);
    const body = await jsonBody(request, 4000);
    const database = db();
    if (body.op === 'delete') {
      const parsed = deleteSchema.parse(body);
      const current = await ownTrip(parsed.id, ctx);
      if (current.special_day_id) {
        await database.prepare('DELETE FROM special_days WHERE id = ? AND owner_user_id = ?').bind(current.special_day_id, ctx.userId).run();
      }
      const result = await database.prepare(
        'DELETE FROM couple_trips WHERE id = ? AND couple_id = ? AND owner_id = ?',
      ).bind(parsed.id, ctx.coupleId, ctx.userId).run();
      if (!result.meta.changes) throw new ApiError(404, 'That trip is gone.');
      return response(await listTrips(ctx));
    }
    if (body.op === 'create' || body.op === 'update') {
      const parsed = body.op === 'create' ? createSchema.parse(body) : updateSchema.parse(body);
      const dateError = tripDateError(parsed.startDate, parsed.endDate);
      if (dateError) throw new ApiError(400, dateError);
      const status = isTripStatus(parsed.status) ? parsed.status : 'idea';
      const visibility = isClosenessLevel(parsed.visibility) ? parsed.visibility : asClosenessLevel(parsed.visibility, 100);
      const notes = parsed.notes || '';
      const now = new Date().toISOString();
      if (parsed.op === 'create') {
        const id = crypto.randomUUID();
        await database.prepare(
          `INSERT INTO couple_trips (id, couple_id, owner_id, title, destination, start_date, end_date, notes, status, visibility, special_day_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        ).bind(id, ctx.coupleId, ctx.userId, parsed.title, parsed.destination, parsed.startDate || null, parsed.endDate || null, notes, status, visibility, now, now).run();
        await syncTripReminder(ctx, {
          id,
          title: parsed.title,
          startDate: parsed.startDate || null,
          visibility,
          specialDayId: null,
        }, !!parsed.remind);
      } else {
        const current = await ownTrip(parsed.id, ctx);
        const result = await database.prepare(
          `UPDATE couple_trips SET title = ?, destination = ?, start_date = ?, end_date = ?, notes = ?, status = ?, visibility = ?, updated_at = ?
           WHERE id = ? AND couple_id = ? AND owner_id = ?`,
        ).bind(parsed.title, parsed.destination, parsed.startDate || null, parsed.endDate || null, notes, status, visibility, now, parsed.id, ctx.coupleId, ctx.userId).run();
        if (!result.meta.changes) throw new ApiError(404, 'That trip is gone.');
        await syncTripReminder(ctx, {
          id: parsed.id,
          title: parsed.title,
          startDate: parsed.startDate || null,
          visibility,
          specialDayId: current.special_day_id,
        }, parsed.remind === undefined ? !!current.special_day_id : parsed.remind);
      }
      return response(await listTrips(ctx));
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
