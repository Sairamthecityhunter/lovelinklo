import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHATGPT_USER_EMAIL_HEADER,
  CHATGPT_USER_FULL_NAME_ENCODING_HEADER,
  CHATGPT_USER_FULL_NAME_HEADER,
  CHATGPT_USER_ID_HEADER,
  resolveChatGPTUser,
  trustChatGPTIdentityHeaders,
} from '../lib/chatgpt-identity.ts';

function headerMap(values) {
  const headers = new Headers(values);
  return {
    get(name) {
      return headers.get(name);
    },
  };
}

const spoofedHeaders = headerMap({
  [CHATGPT_USER_ID_HEADER]: 'attacker-takes-over',
  [CHATGPT_USER_EMAIL_HEADER]: 'victim@lovelink.test',
  [CHATGPT_USER_FULL_NAME_HEADER]: 'Victim Name',
  [CHATGPT_USER_FULL_NAME_ENCODING_HEADER]: 'percent-encoded-utf-8',
});

const sessionUser = {
  userId: 'session-user-id',
  email: 'session@lovelink.test',
  displayName: 'Session User',
  fullName: 'Session User',
};

test('Vercel never trusts client-supplied oai-authenticated-user headers', () => {
  assert.equal(trustChatGPTIdentityHeaders({VERCEL: '1'}), false);
  assert.equal(trustChatGPTIdentityHeaders({VERCEL: '1', VERCEL_ENV: 'production'}), false);
  assert.equal(trustChatGPTIdentityHeaders({VERCEL_ENV: 'production'}), false);
  assert.equal(trustChatGPTIdentityHeaders({VERCEL_ENV: 'preview'}), false);
});

test('ChatGPT Sites / non-Vercel local path may still use platform identity headers', () => {
  assert.equal(trustChatGPTIdentityHeaders({}), true);
  assert.equal(trustChatGPTIdentityHeaders({VERCEL_ENV: 'development'}), true);
});

test('spoofed oai-authenticated-user headers do not grant a user on Vercel without a session', () => {
  const vercelEnvs = [
    {VERCEL: '1'},
    {VERCEL: '1', VERCEL_ENV: 'production'},
    {VERCEL: '1', VERCEL_ENV: 'preview'},
    {VERCEL_ENV: 'production'},
  ];

  for (const env of vercelEnvs) {
    assert.equal(
      resolveChatGPTUser({
        sessionUser: null,
        requestHeaders: spoofedHeaders,
        env,
      }),
      null,
      `spoofed headers must not authenticate when ${JSON.stringify(env)}`,
    );
  }
});

test('a valid session user wins even if spoofed oai headers are also present', () => {
  assert.deepEqual(
    resolveChatGPTUser({
      sessionUser,
      requestHeaders: spoofedHeaders,
      env: {VERCEL: '1', VERCEL_ENV: 'production'},
    }),
    sessionUser,
  );
});

test('without Vercel, ChatGPT Sites headers can still identify the signed-in user', () => {
  const user = resolveChatGPTUser({
    sessionUser: null,
    requestHeaders: spoofedHeaders,
    env: {},
  });
  assert.deepEqual(user, {
    userId: 'attacker-takes-over',
    email: 'victim@lovelink.test',
    displayName: 'Victim Name',
    fullName: 'Victim Name',
  });
});

test('missing id or email header is never a user, even off Vercel', () => {
  assert.equal(
    resolveChatGPTUser({
      sessionUser: null,
      requestHeaders: headerMap({[CHATGPT_USER_ID_HEADER]: 'only-id'}),
      env: {},
    }),
    null,
  );
  assert.equal(
    resolveChatGPTUser({
      sessionUser: null,
      requestHeaders: headerMap({[CHATGPT_USER_EMAIL_HEADER]: 'only@lovelink.test'}),
      env: {},
    }),
    null,
  );
});
