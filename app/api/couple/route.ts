import {z} from 'zod';
import {isCheckinMood,promptForDay,utcDay} from '@/lib/daily-prompt';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError,db,ensureUser,failure,guard,jsonBody,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

const noteSchema = z.object({
  op: z.literal('note'),
  body: z.string().trim().min(1).max(2000),
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

export async function GET() {
  try {
    const ctx = await ensureUser();
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
    const notes = await database.prepare(
      'SELECT id, owner_id, body, created_at FROM couple_notes WHERE couple_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(ctx.coupleId).all<{id: string; owner_id: string; body: string; created_at: string}>();
    const answers = await database.prepare(
      'SELECT user_id, mood, answer, created_at FROM daily_answers WHERE couple_id = ? AND day = ?',
    ).bind(ctx.coupleId, day).all<{user_id: string; mood: string; answer: string; created_at: string}>();
    const mine = answers.results.find((row) => row.user_id === ctx.userId) || null;
    const theirs = partner ? answers.results.find((row) => row.user_id === partner.id) || null : null;
    const anniversary = nextAnniversary(ctx.profile.togetherSince);
    const daysTogether = Math.max(0, Math.floor((Date.now() - new Date(ctx.profile.togetherSince).getTime()) / 86400000));
    return response({
      connected: members.results.length > 1,
      partner: partner ? {userId: partner.id, name: partnerName} : null,
      daysTogether,
      togetherSince: ctx.profile.togetherSince,
      nextAnniversary: anniversary,
      notes: notes.results.map((note) => ({
        id: note.id,
        ownerId: note.owner_id,
        body: note.body,
        createdAt: note.created_at,
        mine: note.owner_id === ctx.userId,
      })),
      checkIn: {
        day,
        prompt: promptForDay(day),
        mine: mine ? {mood: mine.mood, answer: mine.answer, createdAt: mine.created_at} : null,
        partner: mine && theirs ? {mood: theirs.mood, answer: theirs.answer, createdAt: theirs.created_at} : (theirs ? 'hidden' : null),
      },
    });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser();
    await assertRateLimit('couple:write:' + ctx.userId, 60, 60 * 60 * 1000);
    const body = await jsonBody(request, 4000);
    const database = db();
    if (body.op === 'note') {
      const parsed = noteSchema.parse(body);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await database.prepare(
        'INSERT INTO couple_notes (id, couple_id, owner_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(id, ctx.coupleId, ctx.userId, parsed.body, createdAt).run();
      return response({id, ownerId: ctx.userId, body: parsed.body, createdAt, mine: true});
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
      return GET();
    }
    throw new ApiError(400, 'That action isn’t available.');
  } catch (e) {
    return failure(e);
  }
}
