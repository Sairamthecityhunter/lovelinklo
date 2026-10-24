const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function sha256Hex(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function formatInviteCode(code: string) {
  const compact = normalizeInviteCode(code);
  if (compact.length !== 8) return compact;
  return compact.slice(0, 4) + '-' + compact.slice(4);
}

export function normalizeInviteCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}
