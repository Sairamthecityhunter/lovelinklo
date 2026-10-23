import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "@/lib/d1-postgres";
import * as schema from "./schema";

export function getDb() {
  const pool = getPool();
  if (!pool) {
    throw new Error(
      "DATABASE_URL is unavailable. Set DATABASE_URL (or POSTGRES_URL) to a Postgres connection string before using the database.",
    );
  }

  return drizzle(pool, { schema });
}
