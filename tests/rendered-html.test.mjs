import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${pathname}-${process.pid}-${Date.now()}`
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" }
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 })
      }
    },
    {
      waitUntil() {},
      passThroughOnException() {}
    }
  );
}

test("server-renders the public RepoNest product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>RepoNest/);
  assert.match(html, /让每一颗 Star/);
  assert.match(html, /自动同步 GitHub 星标/);
  assert.match(html, /0\.1\.0/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships real routes for authentication, demo and the product", async () => {
  const [login, demo, packageJson, appShell] = await Promise.all([
    render("/login"),
    render("/demo"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8")
  ]);

  assert.equal(login.status, 200);
  assert.match(await login.text(), /连接 GitHub/);
  assert.equal(demo.status, 200);
  assert.match(await demo.text(), /演示空间/);
  assert.match(packageJson, /"version": "0\.1\.0"/);
  assert.match(appShell, /href: "\/stars"/);
  await access(new URL("server/migrations/001_initial.sql", templateRoot));
  await assert.rejects(access(new URL("app/RepoNestApp.tsx", templateRoot)));
});
