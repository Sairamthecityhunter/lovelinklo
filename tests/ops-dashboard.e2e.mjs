import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the operations dashboard e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;
const dashboardSecret = process.env.DASHBOARD_SECRET || 'e2e-dashboard-secret-please';
const spawned = !process.env.BASE_URL;

const port = process.env.E2E_PORT || String(3900 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
const testIp = `203.0.113.${(stamp % 200) + 10}`;
const password = 'correct-horse-ops-1';
let child;
let cookie = '';

function cookieFrom(response) {
  const raw = response.headers.getSetCookie?.() || [];
  const header = raw.find((value) => value.startsWith('__lovelink_session=')) || response.headers.get('set-cookie') || '';
  const match = /__lovelink_session=([^;]+)/.exec(header);
  return match ? match[1] : '';
}

async function request(path, {method = 'GET', body, withCookie = true, headers: extra = {}} = {}) {
  const headers = {'X-Forwarded-For': testIp, ...extra};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withCookie && cookie) headers.Cookie = `__lovelink_session=${cookie}`;
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const next = cookieFrom(response);
  if (next) cookie = next;
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = {raw: text}; }
  return {status: response.status, data, text, headers: response.headers};
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

if (spawned) {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], {
    cwd: root,
    env: {
      ...process.env,
      AUTH_SECRET: process.env.AUTH_SECRET,
      DASHBOARD_SECRET: dashboardSecret,
      NODE_ENV: 'production',
    },
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
  const lockedApi = await request('/api/dashboard', {withCookie: false});
  assert.equal(lockedApi.status, 401, JSON.stringify(lockedApi.data));
  assert.match(lockedApi.data.error || '', /password|sign in|owner|DASHBOARD/i);

  const lockedPage = await request('/dashboard', {withCookie: false});
  assert.equal(lockedPage.status, 200);
  assert.match(lockedPage.text, /This dashboard is private|operations password|Sign in/i);
  assert.match(lockedPage.text, /Back to LoveLink/);
  assert.doesNotMatch(lockedPage.text, /LoveLink at a glance/);

  if (spawned) {
    const wrong = await request('/api/dashboard', {
      withCookie: false,
      headers: {Authorization: 'Bearer not-the-ops-password-at-all'},
    });
    assert.equal(wrong.status, 401, JSON.stringify(wrong.data));
    const unlocked = await request('/api/dashboard', {
      withCookie: false,
      headers: {Authorization: `Bearer ${dashboardSecret}`},
    });
    assert.equal(unlocked.status, 200, JSON.stringify(unlocked.data));
    assert.equal(unlocked.data.via, 'secret');
    assert.equal(typeof unlocked.data.push.subscriptions, 'number');
    assert.equal(typeof unlocked.data.notes.sent, 'number');
    assert.ok(Array.isArray(unlocked.data.gifts.rows));
    assert.ok(!JSON.stringify(unlocked.data).includes('address_line'));
  }

  const registered = await request('/api/auth/register', {
    method: 'POST',
    withCookie: false,
    body: {name: 'Ops Alex', email: `ops-${stamp}@lovelink.test`, password},
  });
  assert.equal(registered.status, 200, JSON.stringify(registered.data));

  const signedIn = await request('/api/dashboard');
  assert.equal(signedIn.status, 200, JSON.stringify(signedIn.data));
  assert.ok(['signed-in-dev', 'secret', 'owner', 'admin'].includes(signedIn.data.via));
  assert.ok(signedIn.data.couples >= 1);
  assert.ok(signedIn.data.users >= 1);
  assert.deepEqual(signedIn.data.notes.rows.map((row) => row.key), ['sent', 'scheduled', 'draft']);
  assert.deepEqual(signedIn.data.gifts.rows.map((row) => row.key), ['pending_payment', 'paid', 'cancelled']);
  assert.ok(!JSON.stringify(signedIn.data).includes('p256dh'));

  const page = await request('/dashboard');
  assert.equal(page.status, 200);
  assert.match(page.text, /LoveLink at a glance/);
  assert.match(page.text, /Push subscriptions/);
  assert.match(page.text, /Closeness/);
  assert.match(page.text, /Love notes/);
  assert.match(page.text, /Gift orders/);
  assert.match(page.text, /Back to LoveLink/);
  assert.match(page.text, /href="\/"/);

  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.text, /href="\/dashboard"/);
  assert.match(home.text, /Operations/);

  console.log('PASS: operations dashboard gate, snapshot shape, and site↔dashboard links.');
} finally {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
