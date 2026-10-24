import {
  activeTripsFrom,
  asInt,
  emptyOpsSnapshot,
  summarizeCloseness,
  summarizeGiftOrders,
  summarizeNotes,
  summarizeTripStatuses,
  upcomingCalendarFrom,
  upcomingSpecialDaysFrom,
  type OpsSnapshot,
} from '@/lib/ops-dashboard';
import {db} from '@/lib/server';

type CountStatus = {status: string; count: number};
type CountLevel = {level: number; count: number};

export async function loadOpsSnapshot(now = new Date()): Promise<OpsSnapshot> {
  const database = db();
  const iso = now.toISOString();
  const [
    couples,
    users,
    paired,
    push,
    closenessRows,
    coupleCloseness,
    closenessCouples,
    noteRows,
    eventRows,
    specialRows,
    tripRows,
    giftRows,
    recentGifts,
  ] = await Promise.all([
    database.prepare('SELECT COUNT(*) AS n FROM couples').first<{n: number}>(),
    database.prepare('SELECT COUNT(*) AS n FROM users').first<{n: number}>(),
    database.prepare('SELECT COUNT(*) AS n FROM (SELECT couple_id FROM users GROUP BY couple_id HAVING COUNT(*) >= 2) paired').first<{n: number}>(),
    database.prepare('SELECT COUNT(*) AS subscriptions, COUNT(DISTINCT user_id) AS subscribers FROM push_subscriptions').first<{subscriptions: number; subscribers: number}>(),
    database.prepare('SELECT level, COUNT(*) AS count FROM closeness GROUP BY level').all<CountLevel>(),
    database.prepare(`SELECT c.level AS level, COUNT(DISTINCT u.couple_id) AS count
      FROM closeness c
      JOIN users u ON u.id = c.owner_user_id
      JOIN users t ON t.id = c.target_user_id AND t.couple_id = u.couple_id AND t.id <> u.id
      GROUP BY c.level`).all<CountLevel>(),
    database.prepare(`SELECT COUNT(DISTINCT u.couple_id) AS n
      FROM closeness c
      JOIN users u ON u.id = c.owner_user_id
      JOIN users t ON t.id = c.target_user_id AND t.couple_id = u.couple_id AND t.id <> u.id`).first<{n: number}>(),
    database.prepare('SELECT status, COUNT(*) AS count FROM couple_notes GROUP BY status').all<CountStatus>(),
    database.prepare('SELECT data_json, due_at FROM calendar_events WHERE status = ? ORDER BY due_at ASC NULLS LAST LIMIT 400').bind('active').all<{data_json: string; due_at: string | null}>(),
    database.prepare('SELECT label, type, month, day FROM special_days').all<{label: string; type: string; month: number; day: number}>(),
    database.prepare('SELECT title, destination, status, start_date, end_date FROM couple_trips').all<{title: string; destination: string; status: string; start_date: string | null; end_date: string | null}>(),
    database.prepare('SELECT status, COUNT(*) AS count FROM gift_orders GROUP BY status').all<CountStatus>(),
    database.prepare('SELECT title, status, created_at, currency, price_cents FROM gift_orders ORDER BY created_at DESC LIMIT 12').all<{title: string; status: string; created_at: string; currency: string; price_cents: number}>(),
  ]);

  const events = (eventRows.results || []).map((row) => {
    try {
      const data = JSON.parse(row.data_json) as {title?: string; date?: string; timezone?: string; type?: string; annual?: boolean};
      return {
        title: data.title,
        date: data.date || row.due_at || undefined,
        timezone: data.timezone,
        type: data.type,
        annual: data.annual,
      };
    } catch {
      return {date: row.due_at || undefined};
    }
  });
  const upcomingEvents = upcomingCalendarFrom(events, now.getTime());
  const specialDays = upcomingSpecialDaysFrom(specialRows.results || [], now);
  const trips = (tripRows.results || []).map((row) => ({
    title: row.title,
    destination: row.destination,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
  const active = activeTripsFrom(trips, iso.slice(0, 10));
  const notes = summarizeNotes((noteRows.results || []).map((row) => ({status: row.status, count: asInt(row.count)})));
  const gifts = summarizeGiftOrders((giftRows.results || []).map((row) => ({status: row.status, count: asInt(row.count)})));
  const closeness = summarizeCloseness((closenessRows.results || []).map((row) => ({level: asInt(row.level), count: asInt(row.count)})));
  const couplesByLevel = summarizeCloseness((coupleCloseness.results || []).map((row) => ({level: asInt(row.level), count: asInt(row.count)})));
  const coupleCount = asInt(couples?.n);
  const pairedCouples = asInt(paired?.n);
  const assignedCouples = asInt(closenessCouples?.n);

  const snapshot = emptyOpsSnapshot(now);
  return {
    ...snapshot,
    generatedAt: iso,
    couples: coupleCount,
    users: asInt(users?.n),
    pairedCouples,
    push: {
      subscriptions: asInt(push?.subscriptions),
      subscribers: asInt(push?.subscribers),
    },
    closeness: {
      rows: closeness,
      couplesByLevel,
      unsetCouples: Math.max(0, pairedCouples - assignedCouples),
    },
    notes,
    calendar: {
      upcomingCount: upcomingEvents.length + specialDays.length,
      events: upcomingEvents,
      specialDays,
    },
    trips: {
      active: active.active,
      rows: summarizeTripStatuses(trips.map((trip) => ({status: trip.status, count: 1}))),
      upcoming: active.upcoming.slice(0, 12),
    },
    gifts: {
      total: gifts.reduce((sum, row) => sum + row.count, 0),
      rows: gifts,
      recent: (recentGifts.results || []).map((row) => ({
        title: (row.title || 'Gift').slice(0, 80),
        status: row.status,
        createdAt: row.created_at,
        currency: row.currency || 'USD',
        priceCents: asInt(row.price_cents),
      })),
    },
  };
}
