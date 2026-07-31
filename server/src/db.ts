import { readFile, readdir } from "node:fs/promises";
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
  const migrationsDir = join(currentDir, "../migrations");
  const migrations = (await readdir(migrationsDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right));

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations"
    );
    const appliedNames = new Set(applied.rows.map((row) => row.name));

    for (const migration of migrations) {
      if (appliedNames.has(migration)) continue;
      const sql = await readFile(join(migrationsDir, migration), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [migration]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}
