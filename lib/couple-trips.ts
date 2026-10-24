import {asClosenessLevel,canSeeByCloseness,isClosenessLevel,type ClosenessLevel} from './closeness-unlocks';

export const TRIP_STATUSES = ['idea', 'planned', 'booked', 'done'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isTripStatus(value: unknown): value is TripStatus {
  return value === 'idea' || value === 'planned' || value === 'booked' || value === 'done';
}

export function asTripStatus(value: unknown, fallback: TripStatus = 'idea'): TripStatus {
  return isTripStatus(value) ? value : fallback;
}

export function isTripDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function tripDateError(startDate: string | null | undefined, endDate: string | null | undefined) {
  if (startDate && !isTripDay(startDate)) return 'Use a real start date.';
  if (endDate && !isTripDay(endDate)) return 'Use a real end date.';
  if (startDate && endDate && endDate < startDate) return 'The end date needs to be on or after the start.';
  return null;
}

export function utcTripDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isPastTrip(
  trip: {status: string; startDate: string | null; endDate: string | null},
  today = utcTripDay(),
) {
  if (trip.status === 'done') return true;
  const lastDay = trip.endDate || trip.startDate;
  return !!lastDay && lastDay < today;
}

export function splitTrips<T extends {status: string; startDate: string | null; endDate: string | null}>(
  trips: T[],
  today = utcTripDay(),
) {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const trip of trips) {
    if (isPastTrip(trip, today)) past.push(trip);
    else upcoming.push(trip);
  }
  const byStart = (a: T, b: T) => (a.startDate || '9999').localeCompare(b.startDate || '9999') || (a.endDate || '').localeCompare(b.endDate || '');
  upcoming.sort(byStart);
  past.sort((a, b) => byStart(b, a));
  return {upcoming, past};
}

export function tripReminderParts(startDate: string) {
  const [year, month, day] = startDate.split('-').map(Number);
  return {year, month, day};
}

export function canSeeTrip(level: ClosenessLevel | null, visibility: ClosenessLevel) {
  return canSeeByCloseness(level ?? 100, visibility);
}

export function asTripVisibility(value: unknown): ClosenessLevel {
  return isClosenessLevel(value) ? value : asClosenessLevel(value, 100);
}
