import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

const source = stripTypeScriptTypes(await fs.readFile(new URL('../lib/ops-dashboard.ts', import.meta.url), 'utf8'))
  .replace("'./closeness-unlocks'", JSON.stringify(new URL('../lib/closeness-unlocks.ts', import.meta.url).href))
  .replace("'./love-time'", JSON.stringify(new URL('../lib/love-time.ts', import.meta.url).href));
const {
  activeTripsFrom,
  dashboardAdminEmails,
  dashboardSecretConfigured,
  emptyOpsSnapshot,
  evaluateDashboardAccess,
  nextSpecialDayDate,
  siteHomeHref,
  summarizeCloseness,
  summarizeGiftOrders,
  summarizeNotes,
  summarizeTripStatuses,
  timingSafeEqual,
  upcomingCalendarFrom,
  upcomingSpecialDaysFrom,
} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const owner = 'd7bdab77-accc-455c-8433-09361d268258';

test('production back-link uses the live site; local and preview stay same-origin', () => {
  assert.equal(siteHomeHref({vercelEnv: 'production'}), 'https://lovelinklos.vercel.app');
  assert.equal(siteHomeHref({vercelEnv: 'preview'}), '/');
  assert.equal(siteHomeHref({}), '/');
});

test('dashboard gate accepts secret, owner, admin email, and local signed-in users', () => {
  const secretEnv = {secret: 'ops-secret-please', ownerId: owner};
  assert.equal(evaluateDashboardAccess({presentedSecret: 'ops-secret-please', env: secretEnv}).via, 'secret');
  assert.equal(evaluateDashboardAccess({
    actor: {userId: owner, email: 'owner@lovelink.test'},
    env: {ownerId: owner, vercelEnv: 'production'},
  }).via, 'owner');
  assert.equal(evaluateDashboardAccess({
    actor: {userId: 'other', email: 'ops@lovelink.test'},
    env: {adminEmails: 'ops@lovelink.test, second@lovelink.test', vercelEnv: 'production'},
  }).via, 'admin');
  assert.equal(evaluateDashboardAccess({
    actor: {userId: 'local-user', email: 'dev@lovelink.test'},
    env: {ownerId: owner},
  }).via, 'signed-in-dev');
});

test('hosted deployments reject anonymous and non-admin sessions without the secret', () => {
  const denied = evaluateDashboardAccess({
    actor: {userId: 'random', email: 'couple@lovelink.test'},
    env: {ownerId: owner, vercelEnv: 'production'},
  });
  assert.equal(denied.ok, false);
  const preview = evaluateDashboardAccess({
    env: {secret: 'ops-secret-please', vercelEnv: 'preview'},
  });
  assert.equal(preview.ok, false);
  const wrong = evaluateDashboardAccess({
    presentedSecret: 'nope-nope-nope',
    env: {secret: 'ops-secret-please', vercelEnv: 'production'},
  });
  assert.equal(wrong.ok, false);
});

test('secret helpers stay strict about length and timing-safe compare', () => {
  assert.equal(dashboardSecretConfigured('short'), false);
  assert.equal(dashboardSecretConfigured('long-enough-secret'), true);
  assert.deepEqual(dashboardAdminEmails(' Ada@LoveLink.test , ops@x.com '), ['ada@lovelink.test', 'ops@x.com']);
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
});

test('closeness, notes, trips, and gift-order breakdowns fill every known bucket', () => {
  assert.deepEqual(summarizeCloseness([{level: 100, count: 4}, {level: 25, count: 1}]).map((row) => [row.key, row.count]), [
    ['100', 4],
    ['50', 0],
    ['25', 1],
  ]);
  const notes = summarizeNotes([{status: 'sent', count: 9}, {status: 'scheduled', count: 2}]);
  assert.equal(notes.sent, 9);
  assert.equal(notes.scheduled, 2);
  assert.equal(notes.draft, 0);
  assert.equal(notes.total, 11);
  assert.deepEqual(summarizeGiftOrders([{status: 'paid', count: 3}]).map((row) => [row.key, row.count]), [
    ['pending_payment', 0],
    ['paid', 3],
    ['cancelled', 0],
  ]);
  assert.equal(summarizeTripStatuses([{status: 'booked', count: 2}, {status: 'idea', count: 1}]).find((row) => row.key === 'booked')?.count, 2);
});

test('upcoming calendar, special days, and active trips ignore past items', () => {
  const now = Date.parse('2026-10-24T12:00:00.000Z');
  const events = upcomingCalendarFrom([
    {title: 'Past dinner', date: '2026-01-01T19:00:00.000Z', timezone: 'UTC', type: 'Date', annual: false},
    {title: 'Anniversary', date: '2024-11-02T18:00:00.000Z', timezone: 'UTC', type: 'Anniversary', annual: true},
    {title: 'Weekend', date: '2026-11-08T16:00:00.000Z', timezone: 'UTC', type: 'Trip', annual: false},
  ], now);
  assert.deepEqual(events.map((item) => item.title), ['Anniversary', 'Weekend']);
  assert.match(events[0].date, /^2026-11-02/);

  const days = upcomingSpecialDaysFrom([
    {label: 'Birthday', type: 'birthday', month: 3, day: 4},
    {label: 'Soon', type: 'custom', month: 10, day: 30},
  ], new Date('2026-10-24T12:00:00.000Z'));
  assert.equal(days[0].label, 'Soon');
  assert.equal(days[0].date, '2026-10-30');
  assert.equal(days[1].date, '2027-03-04');
  assert.equal(nextSpecialDayDate(10, 24, new Date('2026-10-24T00:00:00.000Z')), '2026-10-24');

  const {active, upcoming} = activeTripsFrom([
    {title: 'Open idea', destination: 'Anywhere', status: 'idea', startDate: null, endDate: null},
    {title: 'Done', destination: 'Paris', status: 'done', startDate: '2026-12-01', endDate: '2026-12-05'},
    {title: 'Last month', destination: 'Rome', status: 'booked', startDate: '2026-09-01', endDate: '2026-09-10'},
    {title: 'Soon', destination: 'Kyoto', status: 'planned', startDate: '2026-11-01', endDate: '2026-11-08'},
  ], '2026-10-24');
  assert.equal(active, 2);
  assert.deepEqual(upcoming.map((item) => item.title), ['Soon', 'Open idea']);
});

test('empty snapshot keeps zeroed operational buckets', () => {
  const snapshot = emptyOpsSnapshot(new Date('2026-10-24T00:00:00.000Z'));
  assert.equal(snapshot.push.subscriptions, 0);
  assert.equal(snapshot.notes.sent, 0);
  assert.equal(snapshot.gifts.rows.length, 3);
  assert.equal(snapshot.closeness.rows.length, 3);
});
