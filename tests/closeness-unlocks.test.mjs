import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSeeCalendarItem,
  canSeeNote,
  defaultDayVisibility,
  unlocksLoveNotePush,
  viewerUnlocks,
} from '../lib/closeness-unlocks.ts';

test('favorite unlocks full notes, mid notes, everyone notes, richest calendar, and love-note push', () => {
  const unlocks = viewerUnlocks(100);
  assert.equal(unlocks.fullNotes, true);
  assert.equal(unlocks.midNotes, true);
  assert.equal(unlocks.everyoneNotes, true);
  assert.equal(unlocks.richestCalendar, true);
  assert.equal(unlocks.midCalendar, true);
  assert.equal(unlocks.everyoneCalendar, true);
  assert.equal(unlocks.loveNotePush, true);
  assert.equal(canSeeNote(100, 100), true);
  assert.equal(canSeeCalendarItem(100, 100), true);
});

test('close unlocks mid-tier and everyone content, not full notes or richest calendar', () => {
  const unlocks = viewerUnlocks(50);
  assert.equal(unlocks.fullNotes, false);
  assert.equal(unlocks.midNotes, true);
  assert.equal(unlocks.everyoneNotes, true);
  assert.equal(unlocks.richestCalendar, false);
  assert.equal(unlocks.midCalendar, true);
  assert.equal(unlocks.loveNotePush, false);
  assert.equal(canSeeNote(50, 100), false);
  assert.equal(canSeeNote(50, 50), true);
  assert.equal(canSeeCalendarItem(50, 100), false);
  assert.equal(canSeeCalendarItem(50, 50), true);
});

test('quiet unlocks only content marked for everyone', () => {
  const unlocks = viewerUnlocks(25);
  assert.equal(unlocks.fullNotes, false);
  assert.equal(unlocks.midNotes, false);
  assert.equal(unlocks.everyoneNotes, true);
  assert.equal(unlocks.richestCalendar, false);
  assert.equal(unlocks.midCalendar, false);
  assert.equal(unlocks.everyoneCalendar, true);
  assert.equal(unlocks.loveNotePush, false);
  assert.equal(canSeeNote(25, 50), false);
  assert.equal(canSeeNote(25, 25), true);
  assert.equal(canSeeCalendarItem(25, 50), false);
  assert.equal(canSeeCalendarItem(25, 25), true);
});

test('missing closeness unlocks nothing', () => {
  const unlocks = viewerUnlocks(null);
  assert.equal(unlocks.everyoneNotes, false);
  assert.equal(unlocks.everyoneCalendar, false);
  assert.equal(unlocks.loveNotePush, false);
  assert.equal(canSeeNote(null, 25), false);
  assert.equal(unlocksLoveNotePush(null), false);
});

test('special-day visibility defaults match phase-one reminder richness', () => {
  assert.equal(defaultDayVisibility('birthday'), 25);
  assert.equal(defaultDayVisibility('anniversary'), 50);
  assert.equal(defaultDayVisibility('custom'), 100);
});
