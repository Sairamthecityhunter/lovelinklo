import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the payment-plans e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;

const port = process.env.E2E_PORT || String(4100 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
const testIp = `203.0.113.${(stamp % 200) + 20}`;
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
  const password = 'correct-horse-plans-1';

  assert.equal((await asA('/api/billing')).status, 401);

  assert.equal((await asA('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Alex', email: `plans-a-${stamp}@lovelink.test`, password}})).status, 200);
  assert.equal((await asB('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Maya', email: `plans-b-${stamp}@lovelink.test`, password}})).status, 200);
  assert.equal((await asC('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Riley', email: `plans-c-${stamp}@lovelink.test`, password}})).status, 200);

  const invite = await asA('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal((await asB('/api/invite', {method: 'POST', body: {op: 'accept', code: invite.data.code}})).status, 200);

  const free = await asA('/api/billing');
  assert.equal(free.status, 200, JSON.stringify(free.data));
  assert.equal(free.data.plus, false);
  assert.equal(free.data.mode, 'demo');
  assert.equal(free.data.priceCents, 499);

  const gift = await asA('/api/gift-orders', {
    method: 'POST',
    body: {
      op: 'create',
      productId: 'roses',
      recipientName: 'Maya',
      forPartner: true,
      addressLine1: '12 Harbor Lane',
      city: 'London',
      postalCode: 'E1 1AA',
      country: 'United Kingdom',
    },
  });
  assert.equal(gift.status, 200, JSON.stringify(gift.data));
  const orderId = gift.data.created.id;

  const gated = await asA('/api/payment-plans', {
    method: 'POST',
    body: {op: 'create', giftOrderId: orderId, installments: 3, splitWithPartner: true},
  });
  assert.equal(gated.status, 403, JSON.stringify(gated.data));

  const started = await asA('/api/billing', {method: 'POST', body: {op: 'start-plus'}});
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.plus, true);
  assert.equal(started.data.mode, 'demo');
  assert.equal(started.data.checkoutUrl, null);

  const asBPlus = await asB('/api/billing');
  assert.equal(asBPlus.data.plus, true, 'partner should share the couple Plus plan');

  const created = await asA('/api/payment-plans', {
    method: 'POST',
    body: {op: 'create', giftOrderId: orderId, installments: 3, splitWithPartner: true},
  });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  assert.equal(created.data.plans.length, 1);
  assert.equal(created.data.plans[0].installments.length, 3);
  assert.equal(created.data.plans[0].progress.complete, false);
  const [first, second, third] = created.data.plans[0].installments;
  assert.equal(first.amountCents + second.amountCents + third.amountCents, 5800);
  assert.equal(first.mine, true);
  assert.equal(second.mine, false);

  const steal = await asC('/api/payment-plans', {method: 'POST', body: {op: 'pay', installmentId: first.id}});
  assert.equal(steal.status, 404, JSON.stringify(steal.data));

  const partnerEarly = await asB('/api/payment-plans', {method: 'POST', body: {op: 'pay', installmentId: first.id}});
  assert.equal(partnerEarly.status, 403, JSON.stringify(partnerEarly.data));

  const payFirst = await asA('/api/payment-plans', {method: 'POST', body: {op: 'pay', installmentId: first.id}});
  assert.equal(payFirst.status, 200, JSON.stringify(payFirst.data));
  assert.equal(payFirst.data.plans[0].installments[0].status, 'paid');
  assert.equal(payFirst.data.checkoutUrl, null);

  const paySecond = await asB('/api/payment-plans', {method: 'POST', body: {op: 'pay', installmentId: second.id}});
  assert.equal(paySecond.status, 200, JSON.stringify(paySecond.data));

  const payThird = await asA('/api/payment-plans', {method: 'POST', body: {op: 'pay', installmentId: third.id}});
  assert.equal(payThird.status, 200, JSON.stringify(payThird.data));
  assert.equal(payThird.data.plans[0].status, 'completed');
  assert.equal(payThird.data.plans[0].progress.complete, true);

  const orders = await asA('/api/gift-orders');
  assert.equal(orders.data.orders.find((item) => item.id === orderId)?.status, 'paid');

  const outsider = await asC('/api/payment-plans');
  assert.ok(!outsider.data.plans.some((plan) => plan.id === created.data.plans[0].id), 'third user must not see the plan');

  const again = await asA('/api/billing', {method: 'POST', body: {op: 'start-plus'}});
  assert.equal(again.status, 409, JSON.stringify(again.data));

  console.log('PASS: demo Plus, gift installment split, partner contribution, paid order, and isolation.');
} finally {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
