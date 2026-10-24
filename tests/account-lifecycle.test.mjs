import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELETE_CONFIRMATION,
  UNLINK_OWNER_COUPLE_UPDATES,
  buildAccountExport,
  canRevealDevResetLink,
  filterOwnedRows,
  isUsableResetRow,
  isValidDeleteConfirmation,
  isValidResetTokenShape,
  passwordResetExpiresAt,
  resetUrlForToken,
  soloProfileAfterUnlink,
  stripExportSecrets,
} from '../lib/account-lifecycle.ts';

const profile = {
  myName: 'Alex',
  partnerName: 'Maya',
  myTimezone: 'UTC',
  partnerTimezone: 'Europe/London',
  togetherSince: '2024-06-12',
  longDistance: true,
  browserNotifications: false,
  notificationPrivacy: true,
  sample: true,
  interests: '',
  budget: 0,
  location: '',
};

test('dev reset links never leak on Vercel or when email is connected', () => {
  assert.equal(canRevealDevResetLink({}), true);
  assert.equal(canRevealDevResetLink({VERCEL_ENV: 'development'}), true);
  assert.equal(canRevealDevResetLink({VERCEL: '1'}), false);
  assert.equal(canRevealDevResetLink({VERCEL: '1', VERCEL_ENV: 'production'}), false);
  assert.equal(canRevealDevResetLink({VERCEL_ENV: 'preview'}), false);
  assert.equal(canRevealDevResetLink({RESEND_API_KEY: 're_test', EMAIL_FROM: 'LoveLink <hello@test>'}), false);
});

test('reset token shape, expiry, and URL stay on the session stack', () => {
  const token = 'a'.repeat(64);
  assert.equal(isValidResetTokenShape(token), true);
  assert.equal(isValidResetTokenShape('short'), false);
  assert.equal(isValidResetTokenShape('not-hex!!'.padEnd(32, '!')), false);
  const now = Date.parse('2026-10-24T12:00:00.000Z');
  assert.equal(passwordResetExpiresAt(now), '2026-10-24T13:00:00.000Z');
  assert.equal(isUsableResetRow({expiresAt: '2026-10-24T13:00:00.000Z'}, now), true);
  assert.equal(isUsableResetRow({expiresAt: '2026-10-24T11:00:00.000Z'}, now), false);
  assert.equal(isUsableResetRow({usedAt: '2026-10-24T12:01:00.000Z', expiresAt: '2026-10-24T13:00:00.000Z'}, now), false);
  assert.equal(
    resetUrlForToken('https://lovelinklos.vercel.app', token),
    `https://lovelinklos.vercel.app/reset?token=${token}`,
  );
});

test('unlink resets leftover partner name and lists every couple-scoped owner table', () => {
  const next = soloProfileAfterUnlink(profile);
  assert.equal(next.partnerName, 'Your partner');
  assert.equal(next.sample, false);
  assert.equal(next.myName, 'Alex');
  const tables = UNLINK_OWNER_COUPLE_UPDATES.map((row) => row.table);
  for (const required of ['together_passports', 'together_plans', 'couple_notes', 'daily_answers', 'gift_payment_plans']) {
    assert.ok(tables.includes(required), required);
  }
});

test('privacy export keeps only the signed-in user’s rows and strips secrets', () => {
  const exported = buildAccountExport({
    exportedAt: '2026-10-24T12:00:00.000Z',
    account: {userId: 'user-a', email: 'alex@lovelink.test', createdAt: '2026-01-01T00:00:00.000Z'},
    profile,
    records: {
      notes: [
        {id: 'mine', ownerId: 'user-a', body: 'Hello from me'},
        {id: 'theirs', ownerId: 'user-b', body: 'Partner private note'},
      ],
      checkins: [
        {id: 'mine', userId: 'user-a', answer: 'Sunny'},
        {id: 'theirs', userId: 'user-b', answer: 'Secret mood'},
      ],
      shopOrders: [{id: 'ord', ownerId: 'user-a', amount: 499, sessionId: 'cs_secret', checkoutUrl: 'https://pay.example'}],
    },
  });
  assert.equal(exported.format, 'lovelink-account-v1');
  assert.equal(exported.account.email, 'alex@lovelink.test');
  assert.deepEqual(exported.records.notes.map((row) => row.id), ['mine']);
  assert.deepEqual(exported.records.checkins.map((row) => row.id), ['mine']);
  assert.equal(exported.records.notes.some((row) => row.body === 'Partner private note'), false);
  assert.equal(exported.records.shopOrders[0].sessionId, undefined);
  assert.equal(exported.records.shopOrders[0].checkoutUrl, undefined);
  assert.equal(exported.records.shopOrders[0].amount, 499);
  assert.equal(
    stripExportSecrets({password_hash: 'pbkdf2', token_hash: 'abc', email: 'alex@lovelink.test'}).password_hash,
    undefined,
  );
  assert.deepEqual(filterOwnedRows([{ownerId: 'user-a'}, {ownerId: 'user-b'}], 'user-a'), [{ownerId: 'user-a'}]);
});

test('account delete requires an explicit DELETE confirmation', () => {
  assert.equal(DELETE_CONFIRMATION, 'DELETE');
  assert.equal(isValidDeleteConfirmation('DELETE'), true);
  assert.equal(isValidDeleteConfirmation(' delete '), false);
  assert.equal(isValidDeleteConfirmation('delete'), false);
  assert.equal(isValidDeleteConfirmation(''), false);
});
