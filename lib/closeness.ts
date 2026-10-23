import {ApiError,db} from '@/lib/server';

export const CLOSENESS_LEVELS = [100, 50, 25] as const;
export type ClosenessLevel = (typeof CLOSENESS_LEVELS)[number];

export function isClosenessLevel(value: unknown): value is ClosenessLevel {
  return value === 100 || value === 50 || value === 25;
}

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
