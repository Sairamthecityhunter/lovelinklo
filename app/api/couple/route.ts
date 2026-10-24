import {z} from 'zod';
import {asClosenessLevel,canSeeNote,closenessToward,viewerUnlocks} from '@/lib/closeness';
import {isCheckinMood,promptForDay,utcDay} from '@/lib/daily-prompt';
import {notifyNoteRecipients} from '@/lib/notify-notes';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const visibilityField = z.number().int().optional();
const noteSchema = z.object({
  op: z.literal('note'),
  id: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000),
  visibility: visibilityField,
}).strict();
const draftSchema = z.object({
  op: z.literal('draft'),
  id: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000),
  visibility: visibilityField,
}).strict();
const sendSchema = z.object({
  op: z.literal('send'),
  id: z.string().uuid(),
  visibility: visibilityField,
}).strict();
const scheduleSchema = z.object({
  op: z.literal('schedule'),
  id: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000).optional(),
  visibility: visibilityField,
  specialDayId: z.string().uuid(),
}).strict();
const deleteNoteSchema = z.object({
  op: z.literal('delete-note'),
  id: z.string().uuid(),
}).strict();
const checkinSchema = z.object({
  op: z.literal('checkin'),
  mood: z.string().trim().min(1).max(32),
  answer: z.string().trim().min(1).max(500),
}).strict();

type NoteRow = {
  id: string;
  owner_id: string;
  body: string;
  created_at: string;
  status: string;
  visibility: number;
  updated_at: string;
  sent_at: string | null;
  special_day_id: string | null;
};

function nextAnniversary(togetherSince: string, now = Date.now()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(togetherSince);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const year = new Date(now).getUTCFullYear();
  let next = Date.UTC(year, month - 1, day);
  if (next <= now) next = Date.UTC(year + 1, month - 1, day);
  return new Date(next).toISOString();
}

function asNote(row: NoteRow, userId: string) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    body: row.body,
    createdAt: row.created_at,
    mine: row.owner_id === userId,
    status: row.status === 'draft' || row.status === 'scheduled' ? row.status : 'sent',
    visibility: asClosenessLevel(row.visibility, 100),
    updatedAt: row.updated_at || row.created_at,
    sentAt: row.sent_at,
    specialDayId: row.special_day_id,
  };
}

async function loadNotes(coupleId: string) {
  return db().prepare(
    `SELECT id, owner_id, body, created_at, status, visibility, updated_at, sent_at, special_day_id
     FROM couple_notes WHERE couple_id = ? ORDER BY created_at DESC LIMIT 200`,
  ).bind(coupleId).all<NoteRow>();
}

async function couplePayload(ctx: {userId: string; coupleId: string; profile: {partnerName: string; togetherSince: string; myName: string}}) {
  const database = db();
  const day = utcDay();
  const members = await database.prepare(
    'SELECT id, profile_json FROM users WHERE couple_id = ? ORDER BY created_at',
  ).bind(ctx.coupleId).all<{id: string; profile_json: string}>();
  const partner = members.results.find((row) => row.id !== ctx.userId) || null;
  let partnerName = ctx.profile.partnerName;
  if (partner) {
    try {
      const parsed = JSON.parse(partner.profile_json) as {myName?: string};
      if (parsed.myName?.trim()) partnerName = parsed.myName.trim();
    } catch { /* keep profile name */ }
  }
  const viewerLevel = partner ? await closenessToward(ctx.userId, partner.id) : null;
  const notes = await loadNotes(ctx.coupleId);
  const visible = [];
  const drafts = [];
  let lockedNotes = 0;
  for (const row of notes.results) {
    const mine = row.owner_id === ctx.userId;
    const status = row.status === 'draft' || row.status === 'scheduled' ? row.status : 'sent';
    if (status !== 'sent') {
      if (mine) drafts.push(asNote(row, ctx.userId));
      continue;
    }
    if (mine || canSeeNote(viewerLevel, asClosenessLevel(row.visibility, 100))) {
      visible.push(asNote(row, ctx.userId));
    } else {
      lockedNotes += 1;
    }
  }
  const answers = await database.prepare(
    'SELECT user_id, mood, answer, created_at FROM daily_answers WHERE couple_id = ? AND day = ?',
  ).bind(ctx.coupleId, day).all<{user_id: string; mood: string; answer: string; created_at: string}>();
  const mine = answers.results.find((row) => row.user_id === ctx.userId) || null;
  const theirs = partner ? answers.results.find((row) => row.user_id === partner.id) || null : null;
  const anniversary = nextAnniversary(ctx.profile.togetherSince);
  const daysTogether = Math.max(0, Math.floor((Date.now() - new Date(ctx.profile.togetherSince).getTime()) / 86400000));
  return {
    connected: members.results.length > 1,
    partner: partner ? {userId: partner.id, name: partnerName} : null,
    daysTogether,
    togetherSince: ctx.profile.togetherSince,
    nextAnniversary: anniversary,
    notes: visible,
    drafts,
    lockedNotes,
    unlocks: viewerUnlocks(viewerLevel),
    checkIn: {
      day,
      prompt: promptForDay(day),
      mine: mine ? {mood: mine.mood, answer: mine.answer, createdAt: mine.created_at} : null,
      partner: mine && theirs ? {mood: theirs.mood, answer: theirs.answer, createdAt: theirs.created_at} : (theirs ? 'hidden' : null),
    },
  };
}

async function noteRow(id: string, ctx: {userId: string; coupleId: string}) {
  const row = await db().prepare(
    `SELECT id, owner_id, body, created_at, status, visibility, updated_at, sent_at, special_day_id
     FROM couple_notes WHERE id = ? AND couple_id = ? AND owner_id = ?`,
  ).bind(id, ctx.coupleId, ctx.userId).first<NoteRow>();
  if (!row) throw new ApiError(404, 'That note is unavailable.');
  return row;
}

async function ownSpecialDay(id: string, userId: string) {
  const row = await db().prepare(
    'SELECT id FROM special_days WHERE id = ? AND owner_user_id = ?',
  ).bind(id, userId).first<{id: string}>();
  if (!row) throw new ApiError(404, 'That special day is gone.');
  return row.id;
}

async function insertNote(ctx: {userId: string; coupleId: string}, body: string, visibility: number, status: 'draft' | 'sent' | 'scheduled', specialDayId: string | null) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db().prepare(
    `INSERT INTO couple_notes (id, couple_id, owner_id, body, created_at, status, visibility, updated_at, sent_at, special_day_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, ctx.coupleId, ctx.userId, body, now, status, visibility, now, status === 'sent' ? now : null, specialDayId).run();
  return noteRow(id, ctx);
}

async function updateOwnedNote(ctx: {userId: string; coupleId: string}, id: string, fields: {body?: string; visibility?: number; status?: 'draft' | 'sent' | 'scheduled'; specialDayId?: string | null; sentAt?: string | null}) {
  const current = await noteRow(id, ctx);
  if (current.status === 'sent' && fields.status && fields.status !== 'sent') {
    throw new ApiError(400, 'A sent note cannot return to a draft.');
  }
  const now = new Date().toISOString();
  const status = fields.status || (current.status === 'draft' || current.status === 'scheduled' ? current.status : 'sent');
  const body = fields.body ?? current.body;
  const visibility = fields.visibility ?? asClosenessLevel(current.visibility, 100);
  const specialDayId = fields.specialDayId === undefined ? current.special_day_id : fields.specialDayId;
  const sentAt = fields.sentAt === undefined ? current.sent_at : fields.sentAt;
  const result = await db().prepare(
    `UPDATE couple_notes SET body = ?, visibility = ?, status = ?, updated_at = ?, sent_at = ?, special_day_id = ?
     WHERE id = ? AND couple_id = ? AND owner_id = ?`,
  ).bind(body, visibility, status, now, sentAt, specialDayId, id, ctx.coupleId, ctx.userId).run();
  if (!result.meta.changes) throw new ApiError(404, 'That note is unavailable.');
  return noteRow(id, ctx);
}

export async function GET(request:Request) {
  try {
    const ctx = await ensureUser(request);
    return response(await couplePayload(ctx));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser(request);
    await assertRateLimit('couple:write:' + ctx.userId, 60, 60 * 60 * 1000);
    const body = await jsonBody(request, 4000);
    const database = db();
    if (body.op === 'draft') {
      const parsed = draftSchema.parse(body);
      const visibility = asClosenessLevel(parsed.visibility, 100);
      const row = parsed.id
        ? await updateOwnedNote(ctx, parsed.id, {body: parsed.body, visibility, status: 'draft'})
        : await insertNote(ctx, parsed.body, visibility, 'draft', null);
      return response(asNote(row, ctx.userId));
    }
    if (body.op === 'schedule') {
      const parsed = scheduleSchema.parse(body);
      const specialDayId = await ownSpecialDay(parsed.specialDayId, ctx.userId);
      const visibility = asClosenessLevel(parsed.visibility, 100);
      if (!parsed.id && !parsed.body) throw new ApiError(400, 'Write a note before scheduling it.');
      const row = parsed.id
        ? await updateOwnedNote(ctx, parsed.id, {
          body: parsed.body,
          visibility: parsed.visibility === undefined ? undefined : visibility,
          status: 'scheduled',
          specialDayId,
        })
        : await insertNote(ctx, parsed.body || '', visibility, 'scheduled', specialDayId);
      return response(asNote(row, ctx.userId));
    }
    if (body.op === 'send' || body.op === 'note') {
      const parsed = body.op === 'send' ? sendSchema.parse(body) : noteSchema.parse(body);
      const visibility = asClosenessLevel(parsed.visibility, 100);
      let row: NoteRow;
      if ('id' in parsed && parsed.id) {
        row = await updateOwnedNote(ctx, parsed.id, {
          body: 'body' in parsed ? parsed.body : undefined,
          visibility: parsed.visibility === undefined ? undefined : visibility,
          status: 'sent',
          sentAt: new Date().toISOString(),
        });
      } else if (body.op === 'note') {
        row = await insertNote(ctx, (parsed as z.infer<typeof noteSchema>).body, visibility, 'sent', null);
      } else {
        throw new ApiError(400, 'Choose a draft to send.');
      }
      await notifyNoteRecipients(ctx, ctx.profile.myName).catch(() => {});
      return response(asNote(row, ctx.userId));
    }
    if (body.op === 'delete-note') {
      const parsed = deleteNoteSchema.parse(body);
      const result = await database.prepare(
        'DELETE FROM couple_notes WHERE id = ? AND couple_id = ? AND owner_id = ?',
      ).bind(parsed.id, ctx.coupleId, ctx.userId).run();
      if (!result.meta.changes) throw new ApiError(404, 'That note is unavailable.');
      return response({deleted: true});
    }
    if (body.op === 'checkin') {
      const parsed = checkinSchema.parse(body);
      if (!isCheckinMood(parsed.mood)) throw new ApiError(400, 'Choose how you are feeling today.');
      const day = utcDay();
      await database.prepare(
        `INSERT INTO daily_answers (couple_id, day, user_id, mood, answer, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (couple_id, day, user_id) DO UPDATE SET mood = excluded.mood, answer = excluded.answer`,
      ).bind(ctx.coupleId, day, ctx.userId, parsed.mood, parsed.answer, new Date().toISOString()).run();
      return response(await couplePayload(ctx));
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
