import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the Postgres e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;

const port = process.env.E2E_PORT || String(3200 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const email = `e2e-${Date.now()}@lovelink.test`;
const password = 'correct-horse-e2e-1';
const testIp = `198.51.100.${Date.now() % 250}`;
let cookie = '';
let child;

function cookieFrom(response) {
  const raw = response.headers.getSetCookie?.() || [];
  const header = raw.find((value) => value.startsWith('__lovelink_session=')) || response.headers.get('set-cookie') || '';
  const match = /__lovelink_session=([^;]+)/.exec(header);
  return match ? match[1] : '';
}

async function request(path, {method = 'GET', body, withCookie = true} = {}) {
  const headers = {'Content-Type': 'application/json', 'X-Forwarded-For': testIp};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withCookie && cookie) headers.Cookie = `__lovelink_session=${cookie}`;
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const nextCookie = cookieFrom(response);
  if (nextCookie) cookie = nextCookie;
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = {raw: text}; }
  return {status: response.status, data, headers: response.headers};
}

async function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(base + '/login');
      if (response.ok || response.status === 307) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for next start on ' + base);
}

if (!process.env.BASE_URL) {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], {
    cwd: root,
    env: {...process.env, AUTH_SECRET: process.env.AUTH_SECRET, NODE_ENV: 'production'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(output.slice(-4000));
  });
  await waitForServer();
}

try {
  const unauth = await request('/api/state', {withCookie: false});
  assert.equal(unauth.status, 401, JSON.stringify(unauth.data));

  const registered = await request('/api/auth/register', {
    method: 'POST',
    withCookie: false,
    body: {name: 'E2E Alex', email, password},
  });
  assert.equal(registered.status, 200, JSON.stringify(registered.data));
  assert.ok(cookie, 'register should set a session cookie');

  const seeded = await request('/api/state');
  assert.equal(seeded.status, 200, JSON.stringify(seeded.data));
  assert.equal(seeded.data.profile.myName, 'E2E Alex');
  assert.ok(Array.isArray(seeded.data.pins));

  const pin = {
    id: `e2e-pin-${Date.now()}`,
    title: 'Postgres save check',
    message: 'Persisted through DATABASE_URL',
    type: 'Gift',
    dueAt: '2026-12-24T19:00:00.000Z',
    timezone: 'UTC',
    reminderMinutes: 60,
    repeat: 'none',
    eventId: '',
    secret: true,
    done: false,
    createdAt: new Date().toISOString(),
  };
  const saved = await request('/api/state', {method: 'POST', body: {op: 'upsert', collection: 'pins', value: pin}});
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.pins.find((item) => item.id === pin.id)?.title, 'Postgres save check');

  await request('/api/auth/logout', {method: 'POST', body: {}});
  const afterLogout = await request('/api/state');
  assert.equal(afterLogout.status, 401, JSON.stringify(afterLogout.data));

  cookie = '';
  const login = await request('/api/auth/login', {method: 'POST', withCookie: false, body: {email, password}});
  assert.equal(login.status, 200, JSON.stringify(login.data));
  const restored = await request('/api/state');
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  assert.equal(restored.data.pins.find((item) => item.id === pin.id)?.message, 'Persisted through DATABASE_URL');

  console.log('PASS: register, session cookie, seeded state, pin save, logout, sign-in, and durable read against Postgres.');
} finally {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
