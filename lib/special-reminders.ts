import {canSeeCalendarItem,closenessToward, type ClosenessLevel} from '@/lib/closeness';
import {asClosenessLevel} from '@/lib/closeness-unlocks';
import {notifyNoteRecipients} from '@/lib/notify-notes';
import {db} from '@/lib/server';
import {deliverPush} from '@/lib/web-push';

export type ReminderMode = 'full' | 'simple';
export type ReminderLead = '1h' | '1d';

type SpecialDayRow = {
  id: string;
  owner_user_id: string;
  person_user_id: string | null;
  name: string | null;
  type: string;
  label: string;
  month: number;
  day: number;
  year: number | null;
  interests: string;
  visibility: number;
  reminder_mode: string;
  reminder_lead: string;
  timezone: string;
};

export type UpcomingDay = {
  id: string;
  personUserId: string | null;
  name: string | null;
  type: string;
  label: string;
  month: number;
  day: number;
  year: number | null;
  interests: string[];
  visibility: ClosenessLevel;
  mine: boolean;
  nextDate: string;
};

export function parseInterests(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function ideaFrom(interests: string[]) {
  if (!interests.length) return 'A small something they would notice.';
  return `Something around ${interests[0]}.`;
}

export function zonedParts(at: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(at);
    const num = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
    return {year: num('year'), month: num('month'), day: num('day'), hour: num('hour')};
  } catch {
    return {year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate(), hour: at.getUTCHours()};
  }
}

export function nextOccurrenceParts(month: number, day: number, now: Date, timeZone: string) {
  const parts = zonedParts(now, timeZone);
  let year = parts.year;
  if (parts.month > month || (parts.month === month && parts.day > day)) year += 1;
  return {year, month, day};
}

export function nextOccurrenceDate(month: number, day: number, now: Date, timeZone: string) {
  const next = nextOccurrenceParts(month, day, now, timeZone);
  const mm = String(next.month).padStart(2, '0');
  const dd = String(next.day).padStart(2, '0');
  return `${next.year}-${mm}-${dd}`;
}

function nextOccurrence(row: SpecialDayRow, now: Date) {
  return nextOccurrenceParts(row.month, row.day, now, row.timezone || 'UTC');
}

function leadHours(level: ClosenessLevel | null, mode: ReminderMode, pref: ReminderLead) {
  if (!level) return null;
  if (mode === 'simple') return pref === '1h' ? 1 : 24;
  if (level === 100) return pref === '1h' ? 1 : 24;
  return 24;
}

function includesType(row: SpecialDayRow, level: ClosenessLevel | null, mode: ReminderMode) {
  if (!level) return false;
  if (mode === 'simple') return row.type === 'birthday';
  if (level === 25) return row.type === 'birthday';
  return true;
}

function includesVisibility(row: SpecialDayRow, level: ClosenessLevel | null) {
  return canSeeCalendarItem(level, asClosenessLevel(row.visibility, 100));
}

async function ownerLevel(row: SpecialDayRow): Promise<ClosenessLevel | null> {
  if (row.person_user_id) return closenessToward(row.owner_user_id, row.person_user_id);
  return 100;
}

export function asUpcomingDay(row: {
  id: string;
  person_user_id: string | null;
  name: string | null;
  type: string;
  label: string;
  month: number;
  day: number;
  year: number | null;
  interests: string;
  visibility: number;
}, mine: boolean, now: Date, timeZone: string): UpcomingDay {
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
    visibility: asClosenessLevel(row.visibility, 100),
    mine,
    nextDate: nextOccurrenceDate(row.month, row.day, now, timeZone),
  };
}

export function sortUpcoming(days: UpcomingDay[]) {
  return [...days].sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.label.localeCompare(b.label));
}

export async function runSpecialReminders(now = new Date()) {
  const database = db();
  const rows = await database.prepare(
    `SELECT d.id, d.owner_user_id, d.person_user_id, d.name, d.type, d.label, d.month, d.day, d.year, d.interests, d.visibility,
            u.reminder_mode, u.reminder_lead, u.profile_json
     FROM special_days d
     JOIN users u ON u.id = d.owner_user_id`,
  ).all<SpecialDayRow & {profile_json: string}>();
  let sent = 0;
  for (const raw of rows.results) {
    let timezone = 'UTC';
    try {
      timezone = (JSON.parse(raw.profile_json) as {myTimezone?: string}).myTimezone || 'UTC';
    } catch { /* UTC */ }
    const row: SpecialDayRow = {
      ...raw,
      timezone,
      reminder_mode: raw.reminder_mode === 'simple' ? 'simple' : 'full',
      reminder_lead: raw.reminder_lead === '1h' ? '1h' : '1d',
    };
    const level = await ownerLevel(row);
    const mode = row.reminder_mode as ReminderMode;
    if (!includesType(row, level, mode) || !includesVisibility(row, level)) continue;
    const lead = leadHours(level, mode, row.reminder_lead as ReminderLead);
    if (lead == null) continue;
    const next = nextOccurrence(row, now);
    const zoneParts = zonedParts(now, row.timezone);
    const eventStart = Date.UTC(next.year, next.month - 1, next.day);
    const dueStart = eventStart - lead * 3600 * 1000;
    const current = Date.UTC(zoneParts.year, zoneParts.month - 1, zoneParts.day, zoneParts.hour);
    if (current < dueStart || current >= dueStart + 3600 * 1000) continue;
    const kind = `special:${row.type}:${lead}h`;
    const claimed = await database.prepare(
      `INSERT INTO sent_reminders (id, owner_user_id, special_day_id, kind, year, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (owner_user_id, special_day_id, kind, year) DO NOTHING`,
    ).bind(crypto.randomUUID(), row.owner_user_id, row.id, kind, next.year, now.toISOString()).run();
    if (!claimed.meta.changes) continue;
    const who = row.name?.trim() || row.label;
    const interests = parseInterests(row.interests);
    const when = lead === 1 ? 'in about an hour' : 'tomorrow';
    const idea = mode === 'full' ? ` Idea: ${ideaFrom(interests)}` : '';
    await deliverPush(row.owner_user_id, {
      kind,
      title: row.label,
      body: `${who} — ${row.type} is ${when}.${idea}`,
      url: '/us',
    });
    sent += 1;
  }
  return sent;
}

export async function runScheduledNotes(now = new Date()) {
  const database = db();
  const rows = await database.prepare(
    `SELECT n.id, n.couple_id, n.owner_id, n.body, n.visibility, n.special_day_id,
            d.month, d.day, u.profile_json
     FROM couple_notes n
     JOIN special_days d ON d.id = n.special_day_id
     JOIN users u ON u.id = n.owner_id
     WHERE n.status = 'scheduled'`,
  ).all<{
    id: string;
    couple_id: string;
    owner_id: string;
    body: string;
    visibility: number;
    special_day_id: string;
    month: number;
    day: number;
    profile_json: string;
  }>();
  let sent = 0;
  for (const row of rows.results) {
    let timezone = 'UTC';
    let authorName = '';
    try {
      const profile = JSON.parse(row.profile_json) as {myTimezone?: string; myName?: string};
      timezone = profile.myTimezone || 'UTC';
      authorName = profile.myName?.trim() || '';
    } catch { /* UTC */ }
    const parts = zonedParts(now, timezone);
    if (parts.month !== row.month || parts.day !== row.day) continue;
    const sentAt = now.toISOString();
    const claimed = await database.prepare(
      `UPDATE couple_notes SET status = 'sent', sent_at = ?, updated_at = ?
       WHERE id = ? AND status = 'scheduled'`,
    ).bind(sentAt, sentAt, row.id).run();
    if (!claimed.meta.changes) continue;
    await notifyNoteRecipients({userId: row.owner_id, coupleId: row.couple_id}, authorName).catch(() => {});
    sent += 1;
  }
  return sent;
}
