import test from 'node:test';
import assert from 'node:assert/strict';
import {toPostgresSql} from '../lib/d1-postgres.ts';

test('rewrites D1 placeholders and INSERT OR IGNORE', () => {
  assert.equal(
    toPostgresSql('INSERT OR IGNORE INTO couples (id, owner_id) VALUES (?, ?)'),
    'INSERT INTO couples (id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
  );
});

test('quotes mixed-case aliases so session userId survives Postgres', () => {
  const sql = toPostgresSql(
    'SELECT s.user_id AS userId, a.email AS email, u.profile_json AS profile FROM auth_sessions s WHERE s.token_hash = ? AND s.expires_at > ?',
  );
  assert.match(sql, /AS "userId"/);
  assert.match(sql, /AS email/);
  assert.match(sql, /\$1/);
  assert.match(sql, /\$2/);
  assert.doesNotMatch(sql, /AS MATERIALIZED/);
});

test('leaves WITH ... AS MATERIALIZED alone', () => {
  const sql = toPostgresSql(
    `WITH eligible AS MATERIALIZED (SELECT user_id FROM world_sessions WHERE token = ?) UPDATE world_sessions SET room_id = ?`,
  );
  assert.match(sql, /AS MATERIALIZED/);
  assert.doesNotMatch(sql, /AS "MATERIALIZED"/);
  assert.equal(sql.includes('$1') && sql.includes('$2'), true);
});
