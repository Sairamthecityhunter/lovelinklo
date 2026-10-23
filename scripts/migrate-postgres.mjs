import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {drizzle} from 'drizzle-orm/node-postgres';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL (or POSTGRES_URL) is required to apply migrations.');
  process.exit(1);
}

const pool = new pg.Pool({connectionString: url});
try {
  const db = drizzle(pool);
  await migrate(db, {migrationsFolder: path.join(root, 'drizzle')});
  console.log('Applied Postgres migrations from drizzle/');
} finally {
  await pool.end();
}
