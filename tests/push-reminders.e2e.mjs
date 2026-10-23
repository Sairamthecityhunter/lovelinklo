import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is required for the push-reminders e2e test.');
  process.exit(1);
}

process.env.AUTH_SECRET ||= 'local-e2e-auth-secret-not-for-production-use';
process.env.SESSION_SECRET ||= process.env.AUTH_SECRET;
process.env.CRON_SECRET ||= 'e2e-cron-secret';
const cronSecret = process.env.CRON_SECRET;

const port = process.env.E2E_PORT || String(3700 + Math.floor(Math.random() * 200));
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const stamp = Date.now();
const testIp = `198.51.100.${(stamp % 200) + 20}`;
const password = 'correct-horse-push-1';
const emailA = `push-a-${stamp}@lovelink.test`;
const emailB = `push-b-${stamp}@lovelink.test`;
const pool = new pg.Pool({connectionString: url});
let child;

function makeClient() {
  let cookie = '';
  return async function request(path, {method = 'GET', body, withCookie = true, headers: extra = {}} = {}) {
    const headers = {'Content-Type': 'application/json', 'X-Forwarded-For': testIp, ...extra};
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

async function userIdFor(email) {
  const result = await pool.query('SELECT user_id FROM auth_accounts WHERE email = $1', [email]);
  assert.equal(result.rowCount, 1, 'missing user for ' + email);
  return result.rows[0].user_id;
}

async function outbox(userId, kind) {
  const result = kind
    ? await pool.query('SELECT kind, title, body FROM push_outbox WHERE user_id = $1 AND kind = $2 ORDER BY created_at', [userId, kind])
    : await pool.query('SELECT kind, title, body FROM push_outbox WHERE user_id = $1 ORDER BY created_at', [userId]);
  return result.rows;
}

async function setTimezoneUtc(userId) {
  const row = await pool.query('SELECT profile_json FROM users WHERE id = $1', [userId]);
  const profile = JSON.parse(row.rows[0].profile_json);
  profile.myTimezone = 'UTC';
  await pool.query('UPDATE users SET profile_json = $1 WHERE id = $2', [JSON.stringify(profile), userId]);
}

if (!process.env.BASE_URL) {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], {
    cwd: root,
    env: {
      ...process.env,
      AUTH_SECRET: process.env.AUTH_SECRET,
      CRON_SECRET: cronSecret,
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
  const asA = makeClient();
  const asB = makeClient();

  assert.equal((await asA('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Alex', email: emailA, password}})).status, 200);
  assert.equal((await asB('/api/auth/register', {method: 'POST', withCookie: false, body: {name: 'Maya', email: emailB, password}})).status, 200);
  const userA = await userIdFor(emailA);
  const userB = await userIdFor(emailB);
  await setTimezoneUtc(userA);
  await setTimezoneUtc(userB);

  const invite = await asA('/api/invite', {method: 'POST', body: {op: 'create'}});
  assert.equal(invite.status, 200, JSON.stringify(invite.data));
  const accepted = await asB('/api/invite', {method: 'POST', body: {op: 'accept', code: invite.data.code}});
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));

  const closeA = await asA('/api/closeness');
  const closeB = await asB('/api/closeness');
  assert.equal(closeA.status, 200, JSON.stringify(closeA.data));
  assert.equal(closeA.data.level, 100);
  assert.equal(closeB.data.level, 100);

  const endpointA = `https://push.example.test/e2e/${stamp}/a`;
  const endpointB = `https://push.example.test/e2e/${stamp}/b`;
  const keys = {p256dh: 'p256dh-key-e2e-aaaa', auth: 'auth-e2e'};

  const saved = await asA('/api/push', {method: 'POST', body: {op: 'subscribe', endpoint: endpointA, keys}});
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.subscribed, true);
  const listed = await asA('/api/push');
  assert.equal(listed.data.subscribed, true);
  const storedSub = await pool.query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userA]);
  assert.equal(storedSub.rowCount, 1);
  assert.equal(storedSub.rows[0].endpoint, endpointA);

  const removed = await asA('/api/push', {method: 'POST', body: {op: 'unsubscribe', endpoint: endpointA}});
  assert.equal(removed.status, 200, JSON.stringify(removed.data));
  assert.equal(removed.data.subscribed, false);
  const afterRemove = await pool.query('SELECT endpoint FROM push_subscriptions WHERE user_id = $1', [userA]);
  assert.equal(afterRemove.rowCount, 0);
  const listedOff = await asA('/api/push');
  assert.equal(listedOff.data.subscribed, false);

  assert.equal((await asA('/api/push', {method: 'POST', body: {op: 'subscribe', endpoint: endpointA, keys}})).status, 200);
  assert.equal((await asB('/api/push', {method: 'POST', body: {op: 'subscribe', endpoint: endpointB, keys}})).status, 200);

  const note100 = await asA('/api/couple', {method: 'POST', body: {op: 'note', body: `Favorite note ${stamp}`}});
  assert.equal(note100.status, 200, JSON.stringify(note100.data));
  const notesAt100 = await outbox(userB, 'love-note');
  assert.equal(notesAt100.length, 1, 'closeness 100 should push a love note');
  assert.match(notesAt100[0].body, /Alex|partner/i);

  assert.equal((await asB('/api/closeness', {method: 'POST', body: {op: 'set', level: 50}})).status, 200);
  const note50 = await asA('/api/couple', {method: 'POST', body: {op: 'note', body: `Close note ${stamp}`}});
  assert.equal(note50.status, 200, JSON.stringify(note50.data));
  assert.equal((await outbox(userB, 'love-note')).length, 1, 'closeness 50 should not push a love note');

  assert.equal((await asB('/api/closeness', {method: 'POST', body: {op: 'set', level: 25}})).status, 200);
  const note25 = await asA('/api/couple', {method: 'POST', body: {op: 'note', body: `Quiet note ${stamp}`}});
  assert.equal(note25.status, 200, JSON.stringify(note25.data));
  assert.equal((await outbox(userB, 'love-note')).length, 1, 'closeness 25 should not push a love note');

  await pool.query('DELETE FROM closeness WHERE owner_user_id = $1 AND target_user_id = $2', [userB, userA]);
  const noteNone = await asA('/api/couple', {method: 'POST', body: {op: 'note', body: `No-level note ${stamp}`}});
  assert.equal(noteNone.status, 200, JSON.stringify(noteNone.data));
  assert.equal((await outbox(userB, 'love-note')).length, 1, 'no closeness level should not push');
  assert.equal((await asB('/api/closeness', {method: 'POST', body: {op: 'set', level: 100}})).status, 200);

  const birthday = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'birthday',
      label: 'Maya birthday',
      personUserId: userB,
      name: 'Maya',
      month: 3,
      day: 15,
      interests: ['film photography', 'coffee'],
    },
  });
  assert.equal(birthday.status, 200, JSON.stringify(birthday.data));
  const anniversary = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'anniversary',
      label: 'Our anniversary',
      personUserId: userB,
      name: 'Maya',
      month: 6,
      day: 20,
      interests: ['travel'],
    },
  });
  assert.equal(anniversary.status, 200, JSON.stringify(anniversary.data));
  const extraBirthday = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'birthday',
      label: 'Quiet birthday',
      personUserId: userB,
      name: 'Maya',
      month: 4,
      day: 10,
      interests: ['hiking'],
    },
  });
  assert.equal(extraBirthday.status, 200, JSON.stringify(extraBirthday.data));
  const extraAnniversary = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'anniversary',
      label: 'Quiet anniversary',
      personUserId: userB,
      name: 'Maya',
      month: 5,
      day: 1,
      interests: ['pasta'],
    },
  });
  assert.equal(extraAnniversary.status, 200, JSON.stringify(extraAnniversary.data));
  const simpleBirthday = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'birthday',
      label: 'Simple birthday',
      personUserId: userB,
      name: 'Maya',
      month: 8,
      day: 20,
      interests: ['vinyl'],
    },
  });
  assert.equal(simpleBirthday.status, 200, JSON.stringify(simpleBirthday.data));

  const prefsFull = await asA('/api/special-days', {method: 'POST', body: {op: 'prefs', mode: 'full', lead: '1d'}});
  assert.equal(prefsFull.status, 200, JSON.stringify(prefsFull.data));
  assert.equal(prefsFull.data.prefs.mode, 'full');
  assert.equal(prefsFull.data.prefs.lead, '1d');

  const unauthorized = await fetch(base + '/api/cron/reminders', {method: 'GET'});
  assert.equal(unauthorized.status, 401);
  const wrong = await fetch(base + '/api/cron/reminders', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: 'Bearer wrong-secret'},
    body: JSON.stringify({at: '2026-03-14T00:30:00.000Z'}),
  });
  assert.equal(wrong.status, 401);

  async function runCron(at) {
    return asA('/api/cron/reminders', {
      method: 'POST',
      body: {at},
      headers: {Authorization: `Bearer ${cronSecret}`},
    });
  }

  const cron100 = await runCron('2026-03-14T00:30:00.000Z');
  assert.equal(cron100.status, 200, JSON.stringify(cron100.data));
  assert.equal(cron100.data.sent, 1);
  const birthdayPushes = await outbox(userA, 'special:birthday:24h');
  assert.equal(birthdayPushes.length, 1, 'level 100 should remind one day before a birthday');
  assert.match(birthdayPushes[0].body, /tomorrow/i);
  assert.match(birthdayPushes[0].body, /Idea:/);
  assert.match(birthdayPushes[0].body, /film photography/i);

  const cronDedupe = await runCron('2026-03-14T00:30:00.000Z');
  assert.equal(cronDedupe.status, 200, JSON.stringify(cronDedupe.data));
  assert.equal(cronDedupe.data.sent, 0, 'cron must not send the same reminder twice');
  assert.equal((await outbox(userA, 'special:birthday:24h')).length, 1);

  assert.equal((await asA('/api/closeness', {method: 'POST', body: {op: 'set', level: 50}})).status, 200);
  const cron50 = await runCron('2026-06-19T00:30:00.000Z');
  assert.equal(cron50.status, 200, JSON.stringify(cron50.data));
  assert.equal(cron50.data.sent, 1);
  const anniversaryPushes = await outbox(userA, 'special:anniversary:24h');
  assert.equal(anniversaryPushes.length, 1, 'level 50 should remind one day before each special day');
  assert.match(anniversaryPushes[0].body, /Our anniversary|anniversary/i);

  assert.equal((await asA('/api/closeness', {method: 'POST', body: {op: 'set', level: 25}})).status, 200);
  const cron25Birthday = await runCron('2026-04-09T00:30:00.000Z');
  assert.equal(cron25Birthday.status, 200, JSON.stringify(cron25Birthday.data));
  assert.equal(cron25Birthday.data.sent, 1, 'level 25 should remind one day before a birthday');
  const cron25Anniversary = await runCron('2026-04-30T00:30:00.000Z');
  assert.equal(cron25Anniversary.status, 200, JSON.stringify(cron25Anniversary.data));
  assert.equal(cron25Anniversary.data.sent, 0, 'level 25 should not remind for non-birthday days');
  assert.equal((await outbox(userA, 'special:anniversary:24h')).length, 1);

  const prefsSimple = await asA('/api/special-days', {method: 'POST', body: {op: 'prefs', mode: 'simple', lead: '1h'}});
  assert.equal(prefsSimple.status, 200, JSON.stringify(prefsSimple.data));
  const cronSimple = await runCron('2026-08-19T23:30:00.000Z');
  assert.equal(cronSimple.status, 200, JSON.stringify(cronSimple.data));
  assert.equal(cronSimple.data.sent, 1);
  const simplePushes = await outbox(userA, 'special:birthday:1h');
  assert.equal(simplePushes.length, 1, 'simple mode should send a birthday reminder at the chosen lead time');
  assert.match(simplePushes[0].body, /hour/i);
  assert.doesNotMatch(simplePushes[0].body, /Idea:/);

  const bDays = await asB('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'birthday',
      label: 'Alex birthday',
      personUserId: userA,
      name: 'Alex',
      month: 1,
      day: 2,
      interests: ['tea'],
    },
  });
  assert.equal(bDays.status, 200, JSON.stringify(bDays.data));

  const beforeBlockB = await outbox(userB);
  const blocked = await asA('/api/safety', {method: 'POST', body: {op: 'block'}});
  assert.equal(blocked.status, 200, JSON.stringify(blocked.data));

  const closenessLeft = await pool.query(
    'SELECT * FROM closeness WHERE (owner_user_id = $1 AND target_user_id = $2) OR (owner_user_id = $2 AND target_user_id = $1)',
    [userA, userB],
  );
  assert.equal(closenessLeft.rowCount, 0, 'block must delete closeness both ways');
  const daysLeft = await pool.query(
    'SELECT * FROM special_days WHERE (owner_user_id = $1 AND person_user_id = $2) OR (owner_user_id = $2 AND person_user_id = $1)',
    [userA, userB],
  );
  assert.equal(daysLeft.rowCount, 0, 'block must delete special days referring to each other');
  const remindersLeft = await pool.query(
    'SELECT * FROM sent_reminders WHERE owner_user_id = $1 OR owner_user_id = $2',
    [userA, userB],
  );
  assert.equal(remindersLeft.rowCount, 0, 'block must clear reminder log rows between the pair');

  const afterBlockB = await outbox(userB);
  assert.equal(afterBlockB.length, beforeBlockB.length, 'blocked user must not receive a notification');
  assert.ok(!afterBlockB.some((row) => row.kind === 'block-confirmed'));
  const blockConfirmed = await outbox(userA, 'block-confirmed');
  assert.equal(blockConfirmed.length, 1);
  assert.match(blockConfirmed[0].body, /not notified/i);

  const safetyB = await asB('/api/safety');
  assert.equal(safetyB.status, 200, JSON.stringify(safetyB.data));
  assert.ok(!JSON.stringify(safetyB.data).includes('block-confirmed'));
  assert.ok(!JSON.stringify(safetyB.data).toLowerCase().includes('you were blocked'));

  const updated = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'create',
      type: 'custom',
      label: 'Coffee day',
      name: 'Aunt June',
      month: 9,
      day: 9,
      interests: ['pastries'],
    },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.data));
  const dayId = updated.data.days.find((day) => day.label === 'Coffee day').id;
  const edited = await asA('/api/special-days', {
    method: 'POST',
    body: {
      op: 'update',
      id: dayId,
      type: 'custom',
      label: 'Coffee morning',
      name: 'Aunt June',
      month: 9,
      day: 10,
      interests: ['pastries', 'tea'],
    },
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.data));
  assert.ok(edited.data.days.some((day) => day.label === 'Coffee morning' && day.day === 10));
  const deleted = await asA('/api/special-days', {method: 'POST', body: {op: 'delete', id: dayId}});
  assert.equal(deleted.status, 200, JSON.stringify(deleted.data));
  assert.ok(!deleted.data.days.some((day) => day.id === dayId));

  console.log('PASS: push subscribe/unsubscribe, note targeting by closeness, reminder timing, cron dedupe, cron auth, and quiet block cleanup.');
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
