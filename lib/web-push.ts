import webpush from 'web-push';
import {db} from '@/lib/server';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  kind: string;
};

function vapidKeys() {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || '').trim();
  if (!publicKey || !privateKey || !subject) return null;
  return {publicKey, privateKey, subject};
}

export function vapidPublicKey() {
  return vapidKeys()?.publicKey || null;
}

function statusOf(error: unknown) {
  const err = error as {statusCode?: number; status?: number};
  return err.statusCode || err.status || 0;
}

export async function deliverPush(userId: string, payload: PushPayload) {
  const database = db();
  const now = new Date().toISOString();
  await database.prepare(
    'INSERT INTO push_outbox (id, user_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(crypto.randomUUID(), userId, payload.kind, payload.title, payload.body, now).run();
  const keys = vapidKeys();
  if (!keys) return {sent: 0, skipped: true};
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  const rows = await database.prepare(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
  ).bind(userId).all<{endpoint: string; p256dh: string; auth: string}>();
  let sent = 0;
  for (const row of rows.results) {
    try {
      await webpush.sendNotification(
        {endpoint: row.endpoint, keys: {p256dh: row.p256dh, auth: row.auth}},
        JSON.stringify({title: payload.title, body: payload.body, url: payload.url || '/us', kind: payload.kind}),
      );
      sent += 1;
    } catch (error) {
      const status = statusOf(error);
      if (status === 404 || status === 410) {
        await database.prepare(
          'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
        ).bind(userId, row.endpoint).run();
      }
    }
  }
  return {sent, skipped: false};
}
