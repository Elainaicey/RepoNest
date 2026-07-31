import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { config } from "./config.js";

export type QueryResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  rows: T[];
  rowCount: number;
};

export type DbClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  release(): void;
};

if (!config.DATABASE_PATH.includes("://")) {
  await mkdir(config.DATABASE_PATH, { recursive: true });
}

const database = await PGlite.create(config.DATABASE_PATH);

function normalize<T extends Record<string, unknown>>(
  result: Awaited<ReturnType<PGlite["query"]>>
): QueryResult<T> {
  return {
    rows: result.rows as T[],
    rowCount: result.affectedRows ?? result.rows.length
  };
}

async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
) {
  return normalize<T>(await database.query(sql, params));
}

let queue = Promise.resolve();

async function acquire() {
  const previous = queue;
  let release: () => void = () => {};
  queue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  return release;
}

export const pool = {
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ) {
    const release = await acquire();
    try {
      return await query<T>(sql, params);
    } finally {
      release();
    }
  },

  async connect(): Promise<DbClient> {
    const unlock = await acquire();
    let released = false;
    return {
      query,
      async exec(sql: string) {
        await database.exec(sql);
      },
      release() {
        if (released) return;
        released = true;
        unlock();
      }
    };
  }
};

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
        await client.exec(sql);
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
  await queue;
  await database.close();
}
