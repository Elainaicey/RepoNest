import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000
});

export async function migrate() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationPath = join(currentDir, "../migrations/001_initial.sql");
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
}

export async function closeDatabase() {
  await pool.end();
}
