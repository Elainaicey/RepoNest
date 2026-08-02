import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");

test("repository listing exposes bounded pagination, totals, facets, and exact ids", () => {
  assert.match(source, /repository: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(source, /max\(100\)\.default\(48\)/);
  assert.match(source, /offset: z\.coerce\.number\(\)/);
  assert.match(source, /hasMore:/);
  assert.match(source, /facets: \{ languages:/);
  assert.match(source, /COALESCE\(r\.language, 'Other'\)/);
});

test("repository tag updates support additive and subtractive bulk semantics", () => {
  assert.match(source, /addTagIds:/);
  assert.match(source, /removeTagIds:/);
  assert.match(source, /conflicting_tag_changes/);
  assert.match(source, /ON CONFLICT DO NOTHING/);
  assert.match(source, /AND tag_id = ANY\(\$3::uuid\[\]\)/);
});

test("sync endpoints expose state and reject concurrent manual runs", () => {
  assert.match(source, /app\.get\("\/api\/sync\/status"/);
  assert.match(source, /error: "sync_in_progress"/);
  assert.match(source, /reply\.code\(409\)/);
});
