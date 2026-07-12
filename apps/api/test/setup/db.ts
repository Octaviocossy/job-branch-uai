import { resolve } from "node:path";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/database/schema/index";

if (!process.env.DATABASE_URL) {
  config({ path: resolve(__dirname, "../../.env.test") });
}

export type TestDatabase = NodePgDatabase<typeof schema>;

export function makeTestDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  return { pool, db };
}

export async function truncateAll(db: TestDatabase) {
  await db.execute(sql`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE`);
}
