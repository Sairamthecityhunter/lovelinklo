export const CLOSENESS_LEVELS = [100, 50, 25] as const;
export type ClosenessLevel = (typeof CLOSENESS_LEVELS)[number];

export function isClosenessLevel(value: unknown): value is ClosenessLevel {
  return value === 100 || value === 50 || value === 25;
}

export const LOCKED_NOTE_COPY =
  'Some notes stay quiet at this closeness. You can raise closeness anytime — only you see that choice.';
export const LOCKED_CALENDAR_COPY =
  'At this closeness, only days marked for everyone appear here.';

export function asClosenessLevel(value: unknown, fallback: ClosenessLevel = 100): ClosenessLevel {
  return isClosenessLevel(value) ? value : fallback;
}

export function defaultDayVisibility(type: string): ClosenessLevel {
  if (type === 'birthday') return 25;
  if (type === 'anniversary') return 50;
  return 100;
}

export function canSeeByCloseness(level: ClosenessLevel | null, visibility: ClosenessLevel) {
  return !!level && level >= visibility;
}

export function canSeeNote(level: ClosenessLevel | null, visibility: ClosenessLevel) {
  return canSeeByCloseness(level, visibility);
}

export function canSeeCalendarItem(level: ClosenessLevel | null, visibility: ClosenessLevel) {
  return canSeeByCloseness(level, visibility);
}

export function unlocksLoveNotePush(level: ClosenessLevel | null) {
  return level === 100;
}

export function viewerUnlocks(level: ClosenessLevel | null) {
  return {
    level,
    fullNotes: canSeeNote(level, 100),
    midNotes: canSeeNote(level, 50),
    everyoneNotes: canSeeNote(level, 25),
    richestCalendar: canSeeCalendarItem(level, 100),
    midCalendar: canSeeCalendarItem(level, 50),
    everyoneCalendar: canSeeCalendarItem(level, 25),
    loveNotePush: unlocksLoveNotePush(level),
  };
}

export function visibilityLabel(visibility: ClosenessLevel) {
  if (visibility === 100) return 'Favorite';
  if (visibility === 50) return 'Close';
  return 'Everyone';
}
