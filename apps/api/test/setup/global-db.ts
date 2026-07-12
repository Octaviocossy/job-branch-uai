import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function setup() {
  config({ path: resolve(__dirname, "../../.env.test") });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), {
    migrationsFolder: resolve(__dirname, "../../drizzle"),
  });
  await pool.end();
}
