import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);
let webServer;
let origin;
let serverOutput = "";

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitUntilReady(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The standalone server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Standalone Web server did not start.\n${serverOutput}`);
}

test.before(async () => {
  const port = await availablePort();
  origin = `http://127.0.0.1:${port}`;
  webServer = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  webServer.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  webServer.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  await waitUntilReady(origin);
});

test.after(async () => {
  if (!webServer || webServer.exitCode !== null) return;
  webServer.kill("SIGTERM");
  await new Promise((resolve) => webServer.once("exit", resolve));
});

function render(pathname = "/") {
  return fetch(`${origin}${pathname}`, {
    headers: { accept: "text/html" }
  });
}

test("server-renders the public RepoNest product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>RepoNest/);
  assert.match(html, /收藏不该只是/);
  assert.match(html, /沉睡的星标/);
  assert.match(html, /你的 GitHub 知识空间/);
  assert.match(html, /0\.1\.0/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships real routes for authentication, demo and the product", async () => {
  const [login, demo, tags, insights, library, packageJson, appShell] = await Promise.all([
    render("/login"),
    render("/demo"),
    render("/tags"),
    render("/insights"),
    render("/library"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8")
  ]);

  assert.equal(login.status, 200);
  assert.match(await login.text(), /连接你的 GitHub/);
  assert.equal(demo.status, 200);
  assert.match(await demo.text(), /演示空间/);
  assert.equal(tags.status, 200);
  assert.equal(insights.status, 200);
  assert.equal(library.status, 200);
  assert.match(packageJson, /"version": "0\.1\.0"/);
  assert.match(appShell, /href: "\/stars"/);
  await access(new URL("server/migrations/001_initial.sql", templateRoot));
  await access(new URL("server/migrations/002_organization.sql", templateRoot));
  assert.match(appShell, /href: "\/tags"/);
  assert.match(appShell, /href: "\/insights"/);
  await assert.rejects(access(new URL("app/RepoNestApp.tsx", templateRoot)));
});
