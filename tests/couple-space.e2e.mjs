import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the couple-space e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;

const port = process.env.E2E_PORT || String(3400 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
let child;

function makeClient() {
  let cookie = '';
  return async function request(path, {method = 'GET', body, withCookie = true} = {}) {
    const headers = {'Content-Type': 'application/json'};
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
  const password = 'correct-horse-couple-1';

  const registeredA = await asA('/api/auth/register', {
    method: 'POST',
    withCookie: false,
    body: {name: 'Alex', email: `couple-a-${stamp}@lovelink.test`, password},
  });
  assert.equal(registeredA.status, 200, JSON.stringify(registeredA.data));

  const invite = await asA('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal(invite.status, 200, JSON.stringify(invite.data));
  assert.ok(invite.data.token);
  assert.match(invite.data.code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  const sharedMemory = await asA('/api/state', {
    method: 'POST',
    body: {
      op: 'upsert',
      collection: 'memories',
      value: {
        id: `shared-memory-${stamp}`,
        title: 'Only linked partners should see this pier',
        date: '2026-05-01',
        place: 'E2E pier',
        note: 'Pairing proof',
        image: '/images/coast.jpg',
        mediaKind: 'image',
        secret: false,
      },
    },
  });
  assert.equal(sharedMemory.status, 200, JSON.stringify(sharedMemory.data));

  const note = await asA('/api/couple', {method: 'POST', body: {op: 'note', body: 'A private hello only we should see.'}});
  assert.equal(note.status, 200, JSON.stringify(note.data));
  const noteId = note.data.id;

  const checkinA = await asA('/api/couple', {method: 'POST', body: {op: 'checkin', mood: 'grateful', answer: 'Sunny walk with you in mind.'}});
  assert.equal(checkinA.status, 200, JSON.stringify(checkinA.data));

  const registeredB = await asB('/api/auth/register', {
    method: 'POST',
    withCookie: false,
    body: {name: 'Maya', email: `couple-b-${stamp}@lovelink.test`, password},
  });
  assert.equal(registeredB.status, 200, JSON.stringify(registeredB.data));

  const accepted = await asB('/api/invite', {method: 'POST', body: {op: 'accept', code: invite.data.code}});
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.connected, true);

  const stateB = await asB('/api/state');
  assert.equal(stateB.status, 200, JSON.stringify(stateB.data));
  assert.equal(stateB.data.connected, true);
  assert.ok(stateB.data.memories.some((item) => item.title === 'Only linked partners should see this pier'), 'linked partner should see shared memories');

  const coupleB = await asB('/api/couple');
  assert.equal(coupleB.status, 200, JSON.stringify(coupleB.data));
  assert.equal(coupleB.data.connected, true);
  assert.ok(coupleB.data.notes.some((item) => item.id === noteId), 'linked partner should see shared notes');
  assert.equal(coupleB.data.checkIn.partner, 'hidden');
  assert.equal(coupleB.data.checkIn.mine, null);

  const checkinB = await asB('/api/couple', {method: 'POST', body: {op: 'checkin', mood: 'calm', answer: 'Missing your coffee laugh.'}});
  assert.equal(checkinB.status, 200, JSON.stringify(checkinB.data));
  assert.equal(checkinB.data.checkIn.mine?.answer, 'Missing your coffee laugh.');
  assert.equal(checkinB.data.checkIn.partner?.answer, 'Sunny walk with you in mind.');

  const registeredC = await asC('/api/auth/register', {
    method: 'POST',
    withCookie: false,
    body: {name: 'Riley', email: `couple-c-${stamp}@lovelink.test`, password},
  });
  assert.equal(registeredC.status, 200, JSON.stringify(registeredC.data));

  const coupleC = await asC('/api/couple');
  assert.equal(coupleC.status, 200, JSON.stringify(coupleC.data));
  assert.equal(coupleC.data.connected, false);
  assert.ok(!coupleC.data.notes.some((item) => item.id === noteId), 'third user must not see another couple’s notes');

  const steal = await asC('/api/couple', {method: 'POST', body: {op: 'delete-note', id: noteId}});
  assert.equal(steal.status, 404, JSON.stringify(steal.data));

  const reuse = await asC('/api/invite', {method: 'POST', body: {op: 'accept', token: invite.data.token}});
  assert.equal(reuse.status, 404, JSON.stringify(reuse.data));

  const stateC = await asC('/api/state');
  assert.equal(stateC.status, 200, JSON.stringify(stateC.data));
  assert.ok(!stateC.data.memories.some((item) => item.title === 'Only linked partners should see this pier'), 'third user must not receive another couple’s memories');

  const forgot = await asA('/api/auth/forgot', {method: 'POST', body: {email: `couple-a-${stamp}@lovelink.test`}});
  assert.equal(forgot.status, 200, JSON.stringify(forgot.data));

  console.log('PASS: two partners pair with a code, share notes/memories/check-ins, and a third user is denied.');
} finally {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
