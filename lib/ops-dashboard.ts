import {CLOSENESS_LEVELS, visibilityLabel, type ClosenessLevel} from './closeness-unlocks';
import {nextEventDate} from './love-time';

const GIFT_ORDER_STATUSES = ['pending_payment', 'paid', 'cancelled'] as const;
const TRIP_STATUSES = ['idea', 'planned', 'booked', 'done'] as const;

function utcTripDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function isPastTrip(trip: {status: string; startDate: string | null; endDate: string | null}, today = utcTripDay()) {
  if (trip.status === 'done') return true;
  const lastDay = trip.endDate || trip.startDate;
  return !!lastDay && lastDay < today;
}

export const DASHBOARD_COOKIE = '__lovelink_ops';
export const DASHBOARD_PATH = '/dashboard';
export const PRODUCTION_SITE = 'https://lovelinklos.vercel.app';
export const NOTE_STATUSES = ['sent', 'scheduled', 'draft'] as const;

export type DashboardVia = 'secret' | 'owner' | 'admin' | 'signed-in-dev';
export type DashboardActor = {userId?: string; email?: string} | null;
export type DashboardEnv = {
  secret?: string;
  adminEmails?: string;
  ownerId?: string;
  vercelEnv?: string;
  nodeEnv?: string;
  vercel?: string;
};

export type CountRow = {key: string; label: string; count: number};

export type UpcomingEventRow = {
  title: string;
  type: string;
  date: string;
  annual: boolean;
};

export type UpcomingSpecialDayRow = {
  label: string;
  type: string;
  date: string;
};

export type ActiveTripRow = {
  title: string;
  destination: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

export type RecentGiftOrderRow = {
  title: string;
  status: string;
  createdAt: string;
  currency: string;
  priceCents: number;
};

export type OpsSnapshot = {
  generatedAt: string;
  couples: number;
  users: number;
  pairedCouples: number;
  push: {subscriptions: number; subscribers: number};
  closeness: {
    rows: CountRow[];
    couplesByLevel: CountRow[];
    unsetCouples: number;
  };
  notes: {sent: number; scheduled: number; draft: number; total: number; rows: CountRow[]};
  calendar: {upcomingCount: number; events: UpcomingEventRow[]; specialDays: UpcomingSpecialDayRow[]};
  trips: {active: number; rows: CountRow[]; upcoming: ActiveTripRow[]};
  gifts: {total: number; rows: CountRow[]; recent: RecentGiftOrderRow[]};
};

export function siteHomeHref(env?: {vercelEnv?: string}) {
  const vercelEnv = env?.vercelEnv ?? process.env.VERCEL_ENV;
  return vercelEnv === 'production' ? PRODUCTION_SITE : '/';
}

export function dashboardAdminEmails(raw = '') {
  return raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function dashboardSecretConfigured(secret = '') {
  return secret.length >= 8;
}

export function hostedDeployment(env: DashboardEnv = {}) {
  return env.vercelEnv === 'production' || env.vercelEnv === 'preview';
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function evaluateDashboardAccess(input: {
  actor?: DashboardActor;
  presentedSecret?: string | null;
  env?: DashboardEnv;
}): {ok: boolean; via: DashboardVia | null; message: string} {
  const env = input.env || {};
  const secret = env.secret || '';
  const presented = input.presentedSecret || '';
  if (dashboardSecretConfigured(secret) && presented && timingSafeEqual(presented, secret)) {
    return {ok: true, via: 'secret', message: 'Unlocked with the operations password.'};
  }
  const actor = input.actor;
  if (actor?.userId && env.ownerId && actor.userId === env.ownerId) {
    return {ok: true, via: 'owner', message: 'Signed in as the LoveLink owner.'};
  }
  const email = actor?.email?.trim().toLowerCase() || '';
  if (email && dashboardAdminEmails(env.adminEmails || '').includes(email)) {
    return {ok: true, via: 'admin', message: 'Signed in as a dashboard admin.'};
  }
  if (actor?.userId && !hostedDeployment(env)) {
    return {ok: true, via: 'signed-in-dev', message: 'Local development: any signed-in account can open the dashboard.'};
  }
  if (dashboardSecretConfigured(secret)) {
    return {ok: false, via: null, message: 'Enter the operations password, or sign in as the site owner.'};
  }
  if (hostedDeployment(env)) {
    return {ok: false, via: null, message: 'Sign in as the LoveLink owner, or set DASHBOARD_SECRET / DASHBOARD_ADMIN_EMAILS.'};
  }
  return {ok: false, via: null, message: 'Sign in to open the local operations dashboard.'};
}

export function closenessLabel(level: number) {
  return isClosenessLevel(level) ? visibilityLabel(level as ClosenessLevel) : `Level ${level}`;
}

function isClosenessLevel(value: number): value is ClosenessLevel {
  return (CLOSENESS_LEVELS as readonly number[]).includes(value);
}

export function countsFromRows(rows: {key?: string; status?: string; level?: number; count?: number}[], keys: readonly string[], labelFor: (key: string) => string): CountRow[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.key ?? row.status ?? row.level ?? '');
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + Number(row.count || 0));
  }
  return keys.map((key) => ({key, label: labelFor(key), count: map.get(key) || 0}));
}

export function summarizeCloseness(rows: {level: number; count: number}[]) {
  return countsFromRows(
    rows.map((row) => ({key: String(row.level), count: row.count})),
    CLOSENESS_LEVELS.map(String),
    (key) => closenessLabel(Number(key)),
  );
}

export function summarizeNotes(rows: {status: string; count: number}[]) {
  const list = countsFromRows(rows, NOTE_STATUSES, (key) => key[0].toUpperCase() + key.slice(1));
  const sent = list.find((row) => row.key === 'sent')?.count || 0;
  const scheduled = list.find((row) => row.key === 'scheduled')?.count || 0;
  const draft = list.find((row) => row.key === 'draft')?.count || 0;
  return {sent, scheduled, draft, total: sent + scheduled + draft, rows: list};
}

export function summarizeGiftOrders(rows: {status: string; count: number}[]) {
  return countsFromRows(rows, GIFT_ORDER_STATUSES, (key) => key.replace(/_/g, ' '));
}

export function summarizeTripStatuses(rows: {status: string; count: number}[]) {
  return countsFromRows(rows, TRIP_STATUSES, (key) => key);
}

export function upcomingCalendarFrom(
  events: {title?: string; date?: string; timezone?: string; type?: string; annual?: boolean}[],
  now = Date.now(),
  limit = 12,
): UpcomingEventRow[] {
  const upcoming: UpcomingEventRow[] = [];
  for (const event of events) {
    if (!event.date) continue;
    const date = nextEventDate({
      date: event.date,
      timezone: event.timezone || 'UTC',
      annual: !!event.annual,
    }, now);
    if (Date.parse(date) < now) continue;
    upcoming.push({
      title: (event.title || 'Occasion').slice(0, 80),
      type: event.type || 'Custom',
      date,
      annual: !!event.annual,
    });
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return upcoming.slice(0, limit);
}

export function nextSpecialDayDate(month: number, day: number, now = new Date()) {
  const year = now.getUTCFullYear();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const today = now.toISOString().slice(0, 10);
  const candidate = `${year}-${mm}-${dd}`;
  return candidate >= today ? candidate : `${year + 1}-${mm}-${dd}`;
}

export function upcomingSpecialDaysFrom(
  days: {label?: string; type?: string; month: number; day: number}[],
  now = new Date(),
  limit = 12,
): UpcomingSpecialDayRow[] {
  return days
    .map((day) => ({
      label: (day.label || day.type || 'Special day').slice(0, 80),
      type: day.type || 'custom',
      date: nextSpecialDayDate(day.month, day.day, now),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function activeTripsFrom(
  trips: {title?: string; destination?: string; status: string; startDate: string | null; endDate: string | null}[],
  today = utcTripDay(),
): {active: number; upcoming: ActiveTripRow[]} {
  const upcoming = trips
    .filter((trip) => !isPastTrip(trip, today))
    .map((trip) => ({
      title: (trip.title || 'Trip').slice(0, 80),
      destination: (trip.destination || '').slice(0, 80),
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
    }))
    .sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'));
  return {active: upcoming.length, upcoming};
}

export function emptyOpsSnapshot(now = new Date()): OpsSnapshot {
  return {
    generatedAt: now.toISOString(),
    couples: 0,
    users: 0,
    pairedCouples: 0,
    push: {subscriptions: 0, subscribers: 0},
    closeness: {
      rows: summarizeCloseness([]),
      couplesByLevel: summarizeCloseness([]),
      unsetCouples: 0,
    },
    notes: summarizeNotes([]),
    calendar: {upcomingCount: 0, events: [], specialDays: []},
    trips: {active: 0, rows: summarizeTripStatuses([]), upcoming: []},
    gifts: {total: 0, rows: summarizeGiftOrders([]), recent: []},
  };
}

export function asInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
