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

// "componentes", "formularios" and "modulos" are never truncated here: that catalog is seed data, synced at
// boot by SincronizarMatrizUseCase. "persona_componentes" empties through the usuarios -> personas cascade.
export async function truncateAll(db: TestDatabase) {
  // "usuarios" and "empresas" sit at the root of every FK chain (applications/cv_versions/personas
  // off usuarios; vacantes off empresas) — CASCADE clears every dependent table transitively.
  await db.execute(sql`TRUNCATE TABLE "usuarios", "empresas" RESTART IDENTITY CASCADE`);
}
