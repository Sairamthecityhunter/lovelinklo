import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the partner-safety e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;

const port = process.env.E2E_PORT || String(3600 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
const testIp = `203.0.113.${(stamp % 200) + 20}`;
const password = 'correct-horse-safety-1';
const emailA = `safety-a-${stamp}@lovelink.test`;
const emailB = `safety-b-${stamp}@lovelink.test`;
const emailC = `safety-c-${stamp}@lovelink.test`;
const pool = new pg.Pool({connectionString: url});
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

async function pair(inviter, joiner) {
  const invite = await inviter('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal(invite.status, 200, JSON.stringify(invite.data));
  const accepted = await joiner('/api/invite', {method: 'POST', body: {op: 'accept', code: invite.data.code}});
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  return invite.data;
}

try {
  const asA = makeClient();
  const asB = makeClient();
  const asC = makeClient();

  assert.equal((await asA('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Alex', email: emailA, password}})).status, 200);
  assert.equal((await asB('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Maya', email: emailB, password}})).status, 200);
  assert.equal((await asC('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Riley', email: emailC, password}})).status, 200);

  const blockC = await asC('/api/safety', {method: 'POST', body: {op: 'block'}});
  assert.equal(blockC.status, 403, JSON.stringify(blockC.data));
  const reportC = await asC('/api/safety', {method: 'POST', body: {op: 'report', reason: 'spam', details: 'Trying to report a stranger.'}});
  assert.equal(reportC.status, 403, JSON.stringify(reportC.data));

  await pair(asA, asB);

  const sharedMemory = await asA('/api/state', {
    method: 'POST',
    body: {
      op: 'upsert',
      collection: 'memories',
      value: {
        id: `safety-memory-${stamp}`,
        title: 'Safety pier only partners should see',
        date: '2026-05-01',
        place: 'E2E pier',
        note: 'Block proof',
        image: '/images/coast.jpg',
        mediaKind: 'image',
        secret: false,
      },
    },
  });
  assert.equal(sharedMemory.status, 200, JSON.stringify(sharedMemory.data));
  const linkedB = await asB('/api/state');
  assert.ok(linkedB.data.memories.some((item) => item.title === 'Safety pier only partners should see'));

  const trip = await asA('/api/trips', {
    method: 'POST',
    body: {op: 'create', title: 'Safety getaway', destination: 'Hidden pier', status: 'planned', visibility: 100},
  });
  assert.equal(trip.status, 200, JSON.stringify(trip.data));
  const tripId = trip.data.upcoming.find((item) => item.title === 'Safety getaway')?.id;
  assert.ok(tripId);
  const gift = await asA('/api/gift-orders', {
    method: 'POST',
    body: {
      op: 'create',
      productId: 'mugs',
      recipientName: 'Maya',
      forPartner: true,
      addressLine1: '1 Safety Pier',
      city: 'London',
      postalCode: 'E1 1AA',
      country: 'United Kingdom',
    },
  });
  assert.equal(gift.status, 200, JSON.stringify(gift.data));
  const giftId = gift.data.created?.id;
  assert.ok(giftId);

  const stillC = await asC('/api/safety', {method: 'POST', body: {op: 'report', reason: 'spam', details: 'Still not their partner.'}});
  assert.equal(stillC.status, 403, JSON.stringify(stillC.data));

  const missingReason = await asA('/api/safety', {method: 'POST', body: {op: 'report', details: 'No reason selected.'}});
  assert.equal(missingReason.status, 400, JSON.stringify(missingReason.data));

  const details = `E2E report ${stamp}: they sent unwanted messages.`;
  const reported = await asA('/api/safety', {method: 'POST', body: {op: 'report', reason: 'harassment', details}});
  assert.equal(reported.status, 200, JSON.stringify(reported.data));
  assert.equal(reported.data.reported, true);
  assert.match(reported.data.confirmation, /will not be told/i);

  const stored = await pool.query(
    `SELECT r.reason, r.details, r.status, r.reporter_id, r.reported_id, u.flagged_for_review
     FROM partner_reports r
     JOIN auth_accounts a ON a.user_id = r.reporter_id
     JOIN users u ON u.id = r.reported_id
     WHERE a.email = $1 AND r.details = $2`,
    [emailA, details],
  );
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].reason, 'harassment');
  assert.equal(stored.rows[0].status, 'open');
  assert.equal(Number(stored.rows[0].flagged_for_review), 1);

  const safetyB = await asB('/api/safety');
  assert.equal(safetyB.status, 200, JSON.stringify(safetyB.data));
  assert.equal(safetyB.data.canBlock, true);
  assert.ok(!('reports' in safetyB.data));
  assert.ok(!('reporterId' in safetyB.data));
  assert.ok(!('reporter_id' in safetyB.data));
  assert.ok(!('flaggedForReview' in safetyB.data));
  assert.ok(!('flagged_for_review' in safetyB.data));
  assert.ok(!JSON.stringify(safetyB.data).includes(emailA), 'reported user must not see reporter email');
  assert.ok(!JSON.stringify(safetyB.data).includes(details), 'reported user must not see report details');

  const blocked = await asA('/api/safety', {method: 'POST', body: {op: 'block'}});
  assert.equal(blocked.status, 200, JSON.stringify(blocked.data));
  assert.equal(blocked.data.canBlock, false);
  assert.equal(blocked.data.connected, false);
  assert.equal(blocked.data.blocked[0]?.name, 'Maya');

  const stateA = await asA('/api/state');
  const stateB = await asB('/api/state');
  assert.equal(stateA.data.connected, false);
  assert.equal(stateB.data.connected, false);
  assert.ok(!stateB.data.memories?.some((item) => item.title === 'Safety pier only partners should see'));

  const tripsA = await asA('/api/trips');
  const tripsB = await asB('/api/trips');
  assert.ok(!tripsA.data.upcoming?.some((item) => item.id === tripId) && !tripsA.data.past?.some((item) => item.id === tripId));
  assert.ok(!tripsB.data.upcoming?.some((item) => item.id === tripId) && !tripsB.data.past?.some((item) => item.id === tripId));
  const leftoverTrips = await pool.query('SELECT id FROM couple_trips WHERE id = $1', [tripId]);
  assert.equal(leftoverTrips.rowCount, 0, 'block must silently purge couple trips');
  const giftsA = await asA('/api/gift-orders');
  const giftsB = await asB('/api/gift-orders');
  assert.ok(!giftsA.data.orders?.some((item) => item.id === giftId));
  assert.ok(!giftsB.data.orders?.some((item) => item.id === giftId));
  const leftoverGifts = await pool.query('SELECT id FROM gift_orders WHERE id = $1', [giftId]);
  assert.equal(leftoverGifts.rowCount, 0, 'block must silently purge couple gift orders');
  assert.ok(!JSON.stringify(blocked.data).includes('Safety getaway'));
  assert.ok(!JSON.stringify(safetyB.data).includes(giftId));

  const afterBlockC = await asC('/api/safety', {method: 'POST', body: {op: 'block'}});
  assert.equal(afterBlockC.status, 403, JSON.stringify(afterBlockC.data));

  const inviteA = await asA('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal(inviteA.status, 200, JSON.stringify(inviteA.data));
  const rejectCodeBA = await asB('/api/invite', {method: 'POST', body: {op: 'accept', code: inviteA.data.code}});
  assert.equal(rejectCodeBA.status, 403, JSON.stringify(rejectCodeBA.data));
  assert.match(rejectCodeBA.data.error, /block/i);
  const rejectTokenBA = await asB('/api/invite', {method: 'POST', body: {op: 'accept', token: inviteA.data.token}});
  assert.equal(rejectTokenBA.status, 403, JSON.stringify(rejectTokenBA.data));

  const inviteB = await asB('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal(inviteB.status, 200, JSON.stringify(inviteB.data));
  const rejectCodeAB = await asA('/api/invite', {method: 'POST', body: {op: 'accept', code: inviteB.data.code}});
  assert.equal(rejectCodeAB.status, 403, JSON.stringify(rejectCodeAB.data));
  const rejectTokenAB = await asA('/api/invite', {method: 'POST', body: {op: 'accept', token: inviteB.data.token}});
  assert.equal(rejectTokenAB.status, 403, JSON.stringify(rejectTokenAB.data));

  const unblock = await asA('/api/safety', {method: 'POST', body: {op: 'unblock', userId: blocked.data.blocked[0].userId}});
  assert.equal(unblock.status, 200, JSON.stringify(unblock.data));
  assert.equal(unblock.data.blocked.length, 0);
  const stillApart = await asA('/api/state');
  assert.equal(stillApart.data.connected, false, 'unblock must not re-pair');

  console.log('PASS: block unlinks, both pairing directions stay rejected, report flags the account, and strangers cannot block or report.');
} finally {
  await pool.end().catch(() => {});
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
