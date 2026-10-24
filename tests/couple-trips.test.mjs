import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

const source = stripTypeScriptTypes(await fs.readFile(new URL('../lib/couple-trips.ts', import.meta.url), 'utf8'))
  .replace("'./closeness-unlocks'", JSON.stringify(new URL('../lib/closeness-unlocks.ts', import.meta.url).href));
const {
  asTripStatus,
  canSeeTrip,
  isPastTrip,
  isTripDay,
  splitTrips,
  tripDateError,
  tripReminderParts,
} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('trip statuses stay in the idea/planned/booked/done set', () => {
  assert.equal(asTripStatus('booked'), 'booked');
  assert.equal(asTripStatus('unknown'), 'idea');
});

test('open-ended and future trips stay upcoming; done or elapsed trips move to past', () => {
  const today = '2026-10-24';
  const trips = [
    {id: 'open', status: 'idea', startDate: null, endDate: null},
    {id: 'soon', status: 'planned', startDate: '2026-11-01', endDate: '2026-11-08'},
    {id: 'over', status: 'booked', startDate: '2026-09-01', endDate: '2026-09-10'},
    {id: 'finished', status: 'done', startDate: '2026-12-01', endDate: '2026-12-05'},
  ];
  const {upcoming, past} = splitTrips(trips, today);
  assert.deepEqual(upcoming.map((item) => item.id), ['soon', 'open']);
  assert.deepEqual(past.map((item) => item.id), ['finished', 'over']);
  assert.equal(isPastTrip(trips[0], today), false);
  assert.equal(isPastTrip(trips[2], today), true);
});

test('trip dates reject inverted ranges and invalid calendar days', () => {
  assert.equal(isTripDay('2026-02-30'), false);
  assert.equal(isTripDay('2026-10-24'), true);
  assert.match(tripDateError('2026-11-10', '2026-11-01'), /end date/i);
  assert.equal(tripDateError('2026-11-01', '2026-11-10'), null);
  assert.equal(tripDateError(null, null), null);
});

test('linked partners see couple-level trips by default; closeness can hide richer ones', () => {
  assert.equal(canSeeTrip(null, 100), true);
  assert.equal(canSeeTrip(100, 100), true);
  assert.equal(canSeeTrip(50, 100), false);
  assert.equal(canSeeTrip(25, 25), true);
  assert.deepEqual(tripReminderParts('2026-11-08'), {year: 2026, month: 11, day: 8});
});
