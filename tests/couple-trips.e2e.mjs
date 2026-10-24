import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the couple-trips e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;

const port = process.env.E2E_PORT || String(3800 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
const testIp = `203.0.113.${(stamp % 200) + 40}`;
let child;

function makeClient() {
  let cookie = '';
  return async function request(path, {method = 'GET', body, withCookie = true} = {}) {
    const headers = {'Content-Type': 'application/json', 'X-Forwarded-For': testIp};
    if (withCookie && cookie) headers.Cookie = `__lovelink_session=${cookie}`;
    const response = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = response.headers.getSetCookie?.() || [];
    const header = raw.find((value) => value.startsWith('__lovelink_session=')) || response.headers.get('set-cookie') || '';
    const match = /__lovelink_session=([^;]+)/.exec(header);
    if (match) cookie = match[1];
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = {raw: text}; }
    return {status: response.status, data};
  };
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
  const asA = makeClient();
  const asB = makeClient();
  const asC = makeClient();
  const password = 'correct-horse-trips-1';

  assert.equal((await asA('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Alex', email: `trips-a-${stamp}@lovelink.test`, password}})).status, 200);
  assert.equal((await asB('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Maya', email: `trips-b-${stamp}@lovelink.test`, password}})).status, 200);
  assert.equal((await asC('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Riley', email: `trips-c-${stamp}@lovelink.test`, password}})).status, 200);

  const created = await asA('/api/trips', {
    method: 'POST',
    body: {
      op: 'create',
      title: 'Kyoto lanterns',
      destination: 'Kyoto, Japan',
      startDate: '2027-04-10',
      endDate: '2027-04-18',
      notes: 'Cherry blossoms if we can.',
      status: 'planned',
      visibility: 100,
      remind: true,
    },
  });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const trip = created.data.upcoming.find((item) => item.title === 'Kyoto lanterns');
  assert.ok(trip, 'author should see the new upcoming trip');
  assert.equal(trip.destination, 'Kyoto, Japan');
  assert.equal(trip.mine, true);
  assert.ok(trip.specialDayId, 'optional special-day reminder should be pinned');

  const days = await asA('/api/special-days');
  assert.ok(days.data.days.some((day) => day.id === trip.specialDayId && day.label === 'Kyoto lanterns'));

  const invite = await asA('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal((await asB('/api/invite', {method: 'POST', body: {op: 'accept', code: invite.data.code}})).status, 200);

  const listedB = await asB('/api/trips');
  assert.equal(listedB.status, 200, JSON.stringify(listedB.data));
  const shared = listedB.data.upcoming.find((item) => item.id === trip.id);
  assert.ok(shared, 'linked partner should see shared trips');
  assert.equal(shared.mine, false);

  const steal = await asB('/api/trips', {method: 'POST', body: {op: 'update', id: trip.id, title: 'Stolen', destination: 'Nowhere', status: 'done'}});
  assert.equal(steal.status, 404, JSON.stringify(steal.data));
  const stealDelete = await asB('/api/trips', {method: 'POST', body: {op: 'delete', id: trip.id}});
  assert.equal(stealDelete.status, 404, JSON.stringify(stealDelete.data));

  const fromB = await asB('/api/trips', {
    method: 'POST',
    body: {op: 'create', title: 'Open Lisbon idea', destination: 'Lisbon', notes: 'Whenever we can.', status: 'idea'},
  });
  assert.equal(fromB.status, 200, JSON.stringify(fromB.data));
  const lisbon = fromB.data.upcoming.find((item) => item.title === 'Open Lisbon idea');
  assert.ok(lisbon);
  assert.equal(lisbon.startDate, null);

  const listedA = await asA('/api/trips');
  assert.ok(listedA.data.upcoming.some((item) => item.id === lisbon.id), 'author should see the partner trip');

  const edited = await asA('/api/trips', {
    method: 'POST',
    body: {
      op: 'update',
      id: trip.id,
      title: 'Kyoto lanterns',
      destination: 'Kyoto, Japan',
      startDate: '2027-04-10',
      endDate: '2027-04-20',
      notes: 'Extra two days.',
      status: 'booked',
      visibility: 100,
      remind: true,
    },
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.data));
  assert.equal(edited.data.upcoming.find((item) => item.id === trip.id)?.status, 'booked');

  const removed = await asA('/api/trips', {method: 'POST', body: {op: 'delete', id: trip.id}});
  assert.equal(removed.status, 200, JSON.stringify(removed.data));
  assert.ok(!removed.data.upcoming.some((item) => item.id === trip.id));

  const listedC = await asC('/api/trips');
  assert.equal(listedC.status, 200, JSON.stringify(listedC.data));
  assert.ok(!listedC.data.upcoming.some((item) => item.id === lisbon.id), 'third user must not see another couple’s trips');

  const inverted = await asA('/api/trips', {
    method: 'POST',
    body: {op: 'create', title: 'Backwards', destination: 'Oslo', startDate: '2027-05-10', endDate: '2027-05-01'},
  });
  assert.equal(inverted.status, 400, JSON.stringify(inverted.data));

  console.log('PASS: couple trips create/list/edit/delete, partner visibility, special-day pin, and third-user isolation.');
} finally {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
