import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadEnvFiles} from '../lib/load-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFiles(root);

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL (or POSTGRES_URL) is required to apply migrations.');
  process.exit(1);
}

const folder = path.join(root, 'drizzle');
const useNeonSocket = process.env.NEON_WEBSOCKET === '1' || /neon\.tech/i.test(url);

if (useNeonSocket) {
  const [{drizzle}, {migrate}, neon, ws] = await Promise.all([
    import('drizzle-orm/neon-serverless'),
    import('drizzle-orm/neon-serverless/migrator'),
    import('@neondatabase/serverless'),
    import('ws'),
  ]);
  neon.neonConfig.webSocketConstructor = ws.default;
  const pool = new neon.Pool({connectionString: url});
  try {
    await migrate(drizzle(pool), {migrationsFolder: folder});
    console.log('Applied Postgres migrations from drizzle/ (Neon WebSocket)');
  } finally {
    await pool.end();
  }
} else {
  const [{drizzle}, {migrate}, pg] = await Promise.all([
    import('drizzle-orm/node-postgres'),
    import('drizzle-orm/node-postgres/migrator'),
    import('pg'),
  ]);
  const pool = new pg.default.Pool({connectionString: url});
  try {
    await migrate(drizzle(pool), {migrationsFolder: folder});
    console.log('Applied Postgres migrations from drizzle/');
  } finally {
    await pool.end();
  }
}
