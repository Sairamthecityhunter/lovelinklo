import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the gift-orders e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;

const port = process.env.E2E_PORT || String(3900 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
const testIp = `203.0.113.${(stamp % 200) + 60}`;
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
  const password = 'correct-horse-gifts-1';

  assert.equal((await asA('/api/gift-orders')).status, 401);

  assert.equal((await asA('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Alex', email: `gifts-a-${stamp}@lovelink.test`, password}})).status, 200);
  assert.equal((await asB('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Maya', email: `gifts-b-${stamp}@lovelink.test`, password}})).status, 200);
  assert.equal((await asC('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Riley', email: `gifts-c-${stamp}@lovelink.test`, password}})).status, 200);

  const invite = await asA('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal((await asB('/api/invite', {method: 'POST', body: {op: 'accept', code: invite.data.code}})).status, 200);

  const catalog = await asA('/api/gift-orders');
  assert.equal(catalog.status, 200, JSON.stringify(catalog.data));
  assert.ok(catalog.data.catalog.some((item) => item.id === 'roses'));
  assert.equal(catalog.data.payment.provider, 'pending_keys');

  const missing = await asA('/api/gift-orders', {
    method: 'POST',
    body: {
      op: 'create',
      productId: 'not-real',
      recipientName: 'Maya',
      addressLine1: '1 Pier',
      city: 'London',
      postalCode: 'E1 1AA',
      country: 'United Kingdom',
    },
  });
  assert.equal(missing.status, 400, JSON.stringify(missing.data));

  const created = await asA('/api/gift-orders', {
    method: 'POST',
    body: {
      op: 'create',
      productId: 'roses',
      recipientName: 'Maya',
      forPartner: true,
      addressLine1: '12 Harbor Lane',
      addressLine2: 'Apt 3',
      city: 'London',
      region: 'England',
      postalCode: 'E1 1AA',
      country: 'United Kingdom',
      message: 'Just because.',
    },
  });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  assert.equal(created.data.created?.status, 'pending_payment');
  assert.equal(created.data.created?.title, 'The just-because bouquet');
  assert.equal(created.data.created?.priceCents, 5800);
  const orderId = created.data.created.id;

  const listedB = await asB('/api/gift-orders');
  assert.ok(listedB.data.orders.some((item) => item.id === orderId), 'partner should see a gift ordered for them');

  const listedC = await asC('/api/gift-orders');
  assert.ok(!listedC.data.orders.some((item) => item.id === orderId), 'third user must not see the order');

  const steal = await asC('/api/gift-orders', {method: 'POST', body: {op: 'cancel', id: orderId}});
  assert.equal(steal.status, 404, JSON.stringify(steal.data));

  const cancelled = await asA('/api/gift-orders', {method: 'POST', body: {op: 'cancel', id: orderId}});
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.orders.find((item) => item.id === orderId)?.status, 'cancelled');

  const coffee = await asA('/api/gift-orders', {
    method: 'POST',
    body: {
      op: 'create',
      productId: 'coffee',
      recipientName: 'A friend',
      forPartner: false,
      addressLine1: '9 Cafe Row',
      city: 'Lisbon',
      postalCode: '1100-000',
      country: 'Portugal',
    },
  });
  assert.equal(coffee.status, 200, JSON.stringify(coffee.data));
  assert.equal(coffee.data.created?.recipientName, 'A friend');

  console.log('PASS: gift catalog orders create/list/cancel, partner visibility, auth, and pending_payment without live Stripe.');
} finally {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
