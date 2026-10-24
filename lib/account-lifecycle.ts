import type {Profile} from './love-types';

export const DELETE_CONFIRMATION = 'DELETE';
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const SECRET_KEYS = new Set([
  'password_hash',
  'passwordHash',
  'token_hash',
  'tokenHash',
  'token',
  'p256dh',
  'auth',
  'sessionId',
  'checkoutUrl',
  'customerId',
  'subscriptionId',
  'paymentId',
]);

export type HeaderLikeEnv = {
  VERCEL?: string;
  VERCEL_ENV?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

export type OwnedExportRow = {
  ownerId?: string;
  userId?: string;
  [key: string]: unknown;
};

/** Couple-scoped rows that must move with the unlinking owner. */
export const UNLINK_OWNER_COUPLE_UPDATES = [
  {table: 'wish_pins', ownerColumn: 'owner_id'},
  {table: 'calendar_events', ownerColumn: 'owner_id'},
  {table: 'memories', ownerColumn: 'owner_id'},
  {table: 'love_letters', ownerColumn: 'owner_id'},
  {table: 'couple_goals', ownerColumn: 'owner_id'},
  {table: 'wishlist_items', ownerColumn: 'owner_id'},
  {table: 'orders', ownerColumn: 'owner_id'},
  {table: 'notifications', ownerColumn: 'owner_id'},
  {table: 'surprises', ownerColumn: 'owner_id'},
  {table: 'media', ownerColumn: 'owner_id'},
  {table: 'couple_notes', ownerColumn: 'owner_id'},
  {table: 'couple_trips', ownerColumn: 'owner_id'},
  {table: 'gift_orders', ownerColumn: 'owner_id'},
  {table: 'gift_payment_plans', ownerColumn: 'owner_id'},
  {table: 'daily_answers', ownerColumn: 'user_id'},
  {table: 'together_passports', ownerColumn: 'owner_id'},
  {table: 'together_plans', ownerColumn: 'owner_id'},
] as const;

export function canRevealDevResetLink(env: HeaderLikeEnv = process.env): boolean {
  if (env.VERCEL) return false;
  if (env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview') return false;
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return false;
  return true;
}

export function isValidResetTokenShape(token: string): boolean {
  return typeof token === 'string' && token.length >= 32 && token.length <= 128 && /^[0-9a-f]+$/i.test(token);
}

export function resetUrlForToken(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/reset?token=${encodeURIComponent(token)}`;
}

export function passwordResetExpiresAt(now = Date.now()): string {
  return new Date(now + RESET_TOKEN_TTL_MS).toISOString();
}

export function isUsableResetRow(row: {usedAt?: string | null; expiresAt: string}, now = Date.now()): boolean {
  if (row.usedAt) return false;
  return Date.parse(row.expiresAt) > now;
}

export function isValidDeleteConfirmation(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === DELETE_CONFIRMATION;
}

export function soloProfileAfterUnlink(profile: Profile): Profile {
  return {...profile, partnerName: 'Your partner', sample: false};
}

export function filterOwnedRows<T extends OwnedExportRow>(rows: T[], userId: string): T[] {
  return rows.filter((row) => row.ownerId === userId || row.userId === userId);
}

export function stripExportSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripExportSecrets(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(key)) continue;
      out[key] = stripExportSecrets(nested);
    }
    return out as T;
  }
  return value;
}

export function buildAccountExport(input: {
  exportedAt: string;
  account: {userId: string; email: string | null; createdAt: string | null};
  profile: Profile;
  records: Record<string, unknown[]>;
}) {
  const records: Record<string, unknown[]> = {};
  for (const [name, rows] of Object.entries(input.records)) {
    records[name] = filterOwnedRows(rows as OwnedExportRow[], input.account.userId);
  }
  return stripExportSecrets({
    exportedAt: input.exportedAt,
    format: 'lovelink-account-v1',
    account: input.account,
    profile: input.profile,
    records,
  });
}
