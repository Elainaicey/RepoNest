import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const temporaryRoot = await mkdtemp(join(tmpdir(), "reponest-sync-"));
process.env.DATABASE_PATH = join(temporaryRoot, "database");
process.env.NODE_ENV = "test";
process.env.MAX_SYNC_PAGES = "1";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");

const { encrypt } = await import("../dist/crypto.js");
const { closeDatabase, migrate, pool } = await import("../dist/db.js");
const { syncStars } = await import("../dist/github.js");

const userId = randomUUID();
const oldRepositoryId = randomUUID();
const hiddenRepositoryId = randomUUID();
const originalFetch = globalThis.fetch;

function githubRepository(id, fullName) {
  const [owner, name] = fullName.split("/");
  return {
    id,
    name,
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    homepage: null,
    description: `Repository ${fullName}`,
    language: "TypeScript",
    stargazers_count: id,
    forks_count: 1,
    open_issues_count: 0,
    topics: ["test"],
    pushed_at: "2026-01-01T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    owner: { login: owner },
    license: { spdx_id: "MIT" }
  };
}

function starredItem(id, fullName) {
  return {
    starred_at: "2026-01-02T00:00:00.000Z",
    repo: githubRepository(id, fullName)
  };
}

await migrate();
await pool.query(
  `INSERT INTO users (
     id, github_id, login, avatar_url, access_token_encrypted
   ) VALUES ($1, $2, $3, $4, $5)`,
  [userId, 4242, "sync-owner", "https://example.com/avatar", encrypt("token")]
);
await pool.query(
  `INSERT INTO repositories (
     id, github_id, owner, name, full_name, url
   ) VALUES
     ($1, 900, 'legacy', 'kept', 'legacy/kept', 'https://github.com/legacy/kept'),
     ($2, 1000, 'owner0', 'repo0', 'owner0/repo0', 'https://github.com/owner0/repo0')`,
  [oldRepositoryId, hiddenRepositoryId]
);
await pool.query(
  `INSERT INTO user_repositories (
     user_id, repository_id, source, starred, hidden
   ) VALUES
     ($1, $2, 'github-star', true, false),
     ($1, $3, 'github-star', true, true)`,
  [userId, oldRepositoryId, hiddenRepositoryId]
);

test("a truncated sync never removes unseen stars or revives ignored items", async () => {
  const batch = Array.from({ length: 100 }, (_, index) =>
    starredItem(1000 + index, `owner${index}/repo${index}`)
  );
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => batch
  });

  const result = await syncStars(userId);
  assert.equal(result.truncated, true);
  assert.equal(result.count, 100);

  const oldRepository = await pool.query(
    `SELECT starred FROM user_repositories
      WHERE user_id = $1 AND repository_id = $2`,
    [userId, oldRepositoryId]
  );
  assert.equal(oldRepository.rows[0].starred, true);

  const ignoredRepository = await pool.query(
    `SELECT hidden FROM user_repositories
      WHERE user_id = $1 AND repository_id = $2`,
    [userId, hiddenRepositoryId]
  );
  assert.equal(ignoredRepository.rows[0].hidden, true);
});

test("a complete sync safely clears stars missing from GitHub", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [starredItem(1000, "owner0/repo0")]
  });

  const result = await syncStars(userId);
  assert.equal(result.truncated, false);
  const oldRepository = await pool.query(
    `SELECT starred FROM user_repositories
      WHERE user_id = $1 AND repository_id = $2`,
    [userId, oldRepositoryId]
  );
  assert.equal(oldRepository.rows[0].starred, false);
});

test.after(async () => {
  globalThis.fetch = originalFetch;
  await closeDatabase();
  await rm(temporaryRoot, { recursive: true, force: true });
});
