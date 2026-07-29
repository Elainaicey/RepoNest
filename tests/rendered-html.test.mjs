import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the RepoNest 0.1.0 product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>RepoNest/);
  assert.match(html, /把星标变成/);
  assert.match(html, /YOUR DEVELOPER LIBRARY/);
  assert.match(html, /同步 GitHub/);
  assert.match(html, /0\.1\.0/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships without the disposable starter preview", async () => {
  const [packageJson, layout, page] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"name": "reponest"/);
  assert.match(packageJson, /"version": "0\.1\.0"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(layout, /RepoNest/);
  assert.match(page, /RepoNestApp/);
  await assert.rejects(
    access(new URL("../app/_sites-preview", templateRoot)),
  );
});
