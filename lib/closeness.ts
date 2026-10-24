import {ApiError,db} from '@/lib/server';
import {CLOSENESS_LEVELS, isClosenessLevel, type ClosenessLevel} from './closeness-unlocks';

export {CLOSENESS_LEVELS, isClosenessLevel, type ClosenessLevel};
export {
  LOCKED_CALENDAR_COPY,
  LOCKED_NOTE_COPY,
  asClosenessLevel,
  canSeeByCloseness,
  canSeeCalendarItem,
  canSeeNote,
  defaultDayVisibility,
  unlocksLoveNotePush,
  viewerUnlocks,
  visibilityLabel,
} from './closeness-unlocks';

export async function closenessToward(ownerUserId: string, targetUserId: string): Promise<ClosenessLevel | null> {
  const row = await db().prepare(
    'SELECT level FROM closeness WHERE owner_user_id = ? AND target_user_id = ?',
  ).bind(ownerUserId, targetUserId).first<{level: number}>();
  return row && isClosenessLevel(row.level) ? row.level : null;
}

export async function setCloseness(ownerUserId: string, targetUserId: string, level: ClosenessLevel) {
  if (ownerUserId === targetUserId) throw new ApiError(400, 'You can only set closeness for someone else.');
  await db().prepare(
    `INSERT INTO closeness (owner_user_id, target_user_id, level) VALUES (?, ?, ?)
     ON CONFLICT (owner_user_id, target_user_id) DO UPDATE SET level = excluded.level`,
  ).bind(ownerUserId, targetUserId, level).run();
}

export async function defaultPartnerCloseness(a: string, b: string) {
  await db().batch([
    db().prepare(
      'INSERT INTO closeness (owner_user_id, target_user_id, level) VALUES (?, ?, 100) ON CONFLICT (owner_user_id, target_user_id) DO NOTHING',
    ).bind(a, b),
    db().prepare(
      'INSERT INTO closeness (owner_user_id, target_user_id, level) VALUES (?, ?, 100) ON CONFLICT (owner_user_id, target_user_id) DO NOTHING',
    ).bind(b, a),
  ]);
}
