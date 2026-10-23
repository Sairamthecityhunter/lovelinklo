import {z} from 'zod';
import {currentPartner} from '@/lib/partner-safety';
import {parseInterests} from '@/lib/special-reminders';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const daySchema = z.object({
  personUserId: z.string().uuid().optional().nullable(),
  name: z.string().trim().max(80).optional().nullable(),
  type: z.enum(['birthday', 'anniversary', 'custom']),
  label: z.string().trim().min(1).max(80),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});
const createSchema = daySchema.extend({op: z.literal('create')}).strict();
const updateSchema = daySchema.extend({op: z.literal('update'), id: z.string().uuid()}).strict();
const deleteSchema = z.object({op: z.literal('delete'), id: z.string().uuid()}).strict();
const prefsSchema = z.object({
  op: z.literal('prefs'),
  mode: z.enum(['full', 'simple']),
  lead: z.enum(['1h', '1d']),
}).strict();

function asDay(row: {
  id: string;
  person_user_id: string | null;
  name: string | null;
  type: string;
  label: string;
  month: number;
  day: number;
  year: number | null;
  interests: string;
}) {
  return {
    id: row.id,
    personUserId: row.person_user_id,
    name: row.name,
    type: row.type,
    label: row.label,
    month: row.month,
    day: row.day,
    year: row.year,
    interests: parseInterests(row.interests),
  };
}

async function listDays(userId: string) {
  const rows = await db().prepare(
    'SELECT id, person_user_id, name, type, label, month, day, year, interests FROM special_days WHERE owner_user_id = ? ORDER BY month, day',
  ).bind(userId).all<{
    id: string;
    person_user_id: string | null;
    name: string | null;
    type: string;
    label: string;
    month: number;
    day: number;
    year: number | null;
    interests: string;
  }>();
  const prefs = await db().prepare(
    'SELECT reminder_mode, reminder_lead FROM users WHERE id = ?',
  ).bind(userId).first<{reminder_mode: string; reminder_lead: string}>();
  return {
    days: rows.results.map(asDay),
    prefs: {
      mode: prefs?.reminder_mode === 'simple' ? 'simple' : 'full',
      lead: prefs?.reminder_lead === '1h' ? '1h' : '1d',
    },
  };
}

export async function GET() {
  try {
    const ctx = await ensureUser();
    return response(await listDays(ctx.userId));
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
    await assertRateLimit('special-days:' + ctx.userId, 40, 60 * 60 * 1000);
    if (body.op === 'prefs') {
      const parsed = prefsSchema.parse(body);
      await database.prepare(
        'UPDATE users SET reminder_mode = ?, reminder_lead = ?, updated_at = ? WHERE id = ?',
      ).bind(parsed.mode, parsed.lead, new Date().toISOString(), ctx.userId).run();
      return response(await listDays(ctx.userId));
    }
    if (body.op === 'delete') {
      const parsed = deleteSchema.parse(body);
      const result = await database.prepare(
        'DELETE FROM special_days WHERE id = ? AND owner_user_id = ?',
      ).bind(parsed.id, ctx.userId).run();
      if (!result.meta.changes) throw new ApiError(404, 'That special day is gone.');
      return response(await listDays(ctx.userId));
    }
    if (body.op === 'create' || body.op === 'update') {
      const parsed = body.op === 'create' ? createSchema.parse(body) : updateSchema.parse(body);
      if (!parsed.personUserId && !parsed.name) throw new ApiError(400, 'Add a person name or choose your partner.');
      if (parsed.personUserId) {
        const partner = await currentPartner(ctx);
        if (!partner || partner.userId !== parsed.personUserId) {
          throw new ApiError(403, 'You can only attach a special day to your current partner.');
        }
      }
      const interests = JSON.stringify((parsed.interests || []).map((item) => item.trim()).filter(Boolean).slice(0, 12));
      if (body.op === 'create') {
        const id = crypto.randomUUID();
        await database.prepare(
          `INSERT INTO special_days (id, owner_user_id, person_user_id, name, type, label, month, day, year, interests, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, ctx.userId, parsed.personUserId || null, parsed.name || null, parsed.type, parsed.label, parsed.month, parsed.day, parsed.year || null, interests, new Date().toISOString()).run();
      } else {
        const result = await database.prepare(
          `UPDATE special_days SET person_user_id = ?, name = ?, type = ?, label = ?, month = ?, day = ?, year = ?, interests = ?
           WHERE id = ? AND owner_user_id = ?`,
        ).bind(parsed.personUserId || null, parsed.name || null, parsed.type, parsed.label, parsed.month, parsed.day, parsed.year || null, interests, parsed.id, ctx.userId).run();
        if (!result.meta.changes) throw new ApiError(404, 'That special day is gone.');
      }
      return response(await listDays(ctx.userId));
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
