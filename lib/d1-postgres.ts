import pg from 'pg';

const INT8_OID = 20;
const NUMERIC_OID = 1700;
pg.types.setTypeParser(INT8_OID, (value) => Number(value));
pg.types.setTypeParser(NUMERIC_OID, (value) => Number(value));

export type D1Meta = {changes: number; last_row_id: number};
export type D1Result<T = Record<string, unknown>> = {
 success: boolean;
 results: T[];
 meta: D1Meta;
};

export type D1PreparedStatement = {
 bind(...values: unknown[]): D1PreparedStatement;
 first<T = Record<string, unknown>>(): Promise<T | null>;
 all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
 run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
};

export type D1DatabaseLike = {
 prepare(sql: string): D1PreparedStatement;
 batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
};

type BoundStatement = {sql: string; params: unknown[]};

const globalForPg = globalThis as unknown as {__lovelinkPgPool?: pg.Pool};

export function databaseUrl() {
 return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

export function getPool() {
 const url = databaseUrl();
 if (!url) return null;
 if (!globalForPg.__lovelinkPgPool) {
  globalForPg.__lovelinkPgPool = new pg.Pool({
   connectionString: url,
   max: Number(process.env.PG_POOL_MAX || 5),
  });
 }
 return globalForPg.__lovelinkPgPool;
}

/** Convert D1/SQLite SQL (bound `?` placeholders) into node-postgres SQL. */
export function toPostgresSql(sql: string) {
 let out = sql;
 const ignore = /\bINSERT OR IGNORE INTO\b/i.test(out);
 out = out.replace(/\bINSERT OR IGNORE INTO\b/gi, 'INSERT INTO');
 out = out.replace(/\bORDER BY RANDOM\(\)/gi, 'ORDER BY random()');
 if (ignore && !/\bON CONFLICT\b/i.test(out)) {
  out = out.replace(/\s*;\s*$/, '') + ' ON CONFLICT DO NOTHING';
 }
 let index = 0;
 out = out.replace(/\?/g, () => `$${++index}`);
 return out;
}

function asResult<T>(rows: T[], rowCount: number | null): D1Result<T> {
 return {success: true, results: rows, meta: {changes: rowCount ?? 0, last_row_id: 0}};
}

class PgStatement implements D1PreparedStatement {
 constructor(private readonly db: PgDatabase, private readonly sql: string, private readonly params: unknown[] = []) {}
 bind(...values: unknown[]) {
  return new PgStatement(this.db, this.sql, values);
 }
 async first<T = Record<string, unknown>>() {
  const result = await this.db.exec(this.sql, this.params);
  return (result.rows[0] as T) ?? null;
 }
 async all<T = Record<string, unknown>>() {
  const result = await this.db.exec(this.sql, this.params);
  return asResult(result.rows as T[], result.rowCount);
 }
 async run<T = Record<string, unknown>>() {
  const result = await this.db.exec(this.sql, this.params);
  return asResult(result.rows as T[], result.rowCount);
 }
 toBound(): BoundStatement {
  return {sql: this.sql, params: this.params};
 }
}

export class PgDatabase implements D1DatabaseLike {
 constructor(private readonly pool: pg.Pool) {}
 prepare(sql: string) {
  return new PgStatement(this, sql);
 }
 async exec(sql: string, params: unknown[] = []) {
  return this.pool.query(toPostgresSql(sql), params);
 }
 async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
  const client = await this.pool.connect();
  try {
   await client.query('BEGIN');
   const results: D1Result<T>[] = [];
   for (const statement of statements) {
    const bound = (statement as PgStatement).toBound();
    const result = await client.query(toPostgresSql(bound.sql), bound.params);
    results.push(asResult(result.rows as T[], result.rowCount));
   }
   await client.query('COMMIT');
   return results;
  } catch (error) {
   try { await client.query('ROLLBACK'); } catch { /* keep the original error */ }
   throw error;
  } finally {
   client.release();
  }
 }
}

export function createDatabase(): D1DatabaseLike | undefined {
 const pool = getPool();
 return pool ? new PgDatabase(pool) : undefined;
}
