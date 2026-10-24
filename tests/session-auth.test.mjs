import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthError,
  SESSION_COOKIE,
  assertLoginAllowed,
  clearLoginFailures,
  clearSessionCookieHeader,
  currentSessionUser,
  emailSignInPath,
  emailSignOutPath,
  hashPassword,
  isAuthPrefetch,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  readSessionTokenFromRequest,
  recordLoginFailure,
  safeAuthReturnPath,
  sessionCookieHeader,
  signOutResponse,
  userFromSessionToken,
  verifyPassword,
} from '../lib/session-auth.ts';

test('AuthError is importable under strip-types and exposes status', () => {
  const error = new AuthError(401, 'Email or password is incorrect.');
  assert.equal(error.name, 'AuthError');
  assert.equal(error.status, 401);
  assert.equal(error.message, 'Email or password is incorrect.');
  assert.ok(error instanceof Error);
});

test('normalizes and validates email/password for the session stack', () => {
  assert.equal(normalizeEmail('  Alex@LoveLink.test '), 'alex@lovelink.test');
  assert.equal(isValidEmail('alex@lovelink.test'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidPassword('correct-horse'), true);
  assert.equal(isValidPassword('short'), false);
});

test('hashes and verifies passwords with PBKDF2', async () => {
  const stored = await hashPassword('correct-horse-battery');
  assert.match(stored, /^pbkdf2\$210000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(await verifyPassword('correct-horse-battery', stored), true);
  assert.equal(await verifyPassword('wrong-password', stored), false);
  assert.equal(await verifyPassword('correct-horse-battery', 'not-a-hash'), false);
});

test('session cookie helpers set and clear __lovelink_session', () => {
  const set = sessionCookieHeader('abc123', true);
  assert.match(set, new RegExp(`^${SESSION_COOKIE}=abc123;`));
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Lax/);
  assert.match(set, /Secure/);
  const cleared = clearSessionCookieHeader(false);
  assert.match(cleared, new RegExp(`^${SESSION_COOKIE}=;`));
  assert.match(cleared, /Max-Age=0/);
  assert.doesNotMatch(cleared, /Secure/);
});

test('reads the session token from an incoming request cookie', async () => {
  const request = new Request('http://127.0.0.1/api/state', {
    headers: {cookie: `${SESSION_COOKIE}=session-token-from-cookie`},
  });
  assert.equal(await readSessionTokenFromRequest(request), 'session-token-from-cookie');
  assert.equal(await readSessionTokenFromRequest(new Request('http://127.0.0.1/api/state')), null);
});

test('missing or short tokens never become a session user', async () => {
  assert.equal(await userFromSessionToken(null), null);
  assert.equal(await userFromSessionToken('tooshort'), null);
  assert.equal(await currentSessionUser(new Request('http://127.0.0.1/login')), null);
});

test('login lockout trips after repeated failures', () => {
  const email = `lockout-${Date.now()}@lovelink.test`;
  for (let i = 0; i < 7; i++) {
    recordLoginFailure(email);
    assertLoginAllowed(email);
  }
  recordLoginFailure(email);
  assert.throws(() => assertLoginAllowed(email), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.status, 429);
    return true;
  });
  clearLoginFailures(email);
  assertLoginAllowed(email);
});

test('safe return paths stay on-site and skip auth loops', () => {
  assert.equal(safeAuthReturnPath('/pins'), '/pins');
  assert.equal(safeAuthReturnPath('/us?tab=notes#today'), '/us?tab=notes#today');
  assert.equal(safeAuthReturnPath('https://evil.test/pins'), '/login');
  assert.equal(safeAuthReturnPath('//evil.test'), '/login');
  assert.equal(safeAuthReturnPath('/login?next=/pins'), '/login');
  assert.equal(safeAuthReturnPath('/register'), '/login');
  assert.equal(safeAuthReturnPath('/signout'), '/login');
  assert.equal(safeAuthReturnPath('/signin-with-chatgpt'), '/login');
  assert.equal(emailSignInPath('/world'), '/login?next=%2Fworld');
  assert.equal(emailSignInPath('/login'), '/login');
  assert.equal(emailSignOutPath('/seller'), '/signout?return_to=%2Fseller');
});

test('sign-out clears the session cookie and ignores prefetch', async () => {
  const signedOut = await signOutResponse(new Request('http://127.0.0.1/signout?return_to=/pins'));
  assert.equal(signedOut.status, 302);
  assert.equal(signedOut.headers.get('Location'), '/pins');
  assert.match(signedOut.headers.get('Set-Cookie') || '', /__lovelink_session=;/);
  assert.match(signedOut.headers.get('Set-Cookie') || '', /Max-Age=0/);

  const posted = await signOutResponse(new Request('https://lovelinklos.vercel.app/signout', {method: 'POST'}));
  assert.equal(posted.status, 303);
  assert.equal(posted.headers.get('Location'), '/login');
  assert.match(posted.headers.get('Set-Cookie') || '', /Secure/);

  const prefetch = new Request('http://127.0.0.1/signout', {
    headers: {'next-router-prefetch': '1'},
  });
  assert.equal(isAuthPrefetch(prefetch), true);
  const skipped = await signOutResponse(prefetch);
  assert.equal(skipped.status, 204);
  assert.equal(skipped.headers.get('Set-Cookie'), null);
});
