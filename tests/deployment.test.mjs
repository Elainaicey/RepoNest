import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("production Compose defines one hardened, persistent application", async () => {
  const compose = await readFile(new URL("docker-compose.yml", root), "utf8");

  assert.match(compose, /^services:\s*\n\s{2}app:/m);
  assert.equal((compose.match(/^\s{2}[a-z][a-z0-9-]*:\s*$/gm) ?? []).length, 1);
  assert.match(compose, /ghcr\.io\/elainaicey\/reponest:/);
  assert.match(compose, /REPONEST_DATA_DIR:-\.\/data}:\/data/);
  assert.match(compose, /127\.0\.0\.1:\$\{REPONEST_PORT:-3000}:3000/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /cap_drop:\s*\n\s+- ALL/);
  assert.match(compose, /max-size: \$\{REPONEST_LOG_MAX_SIZE:-10m}/);
  assert.doesNotMatch(compose, /postgres:|reponest-web|reponest-api|DATABASE_URL/);
});

test("the image contains Web, API, embedded storage, and a unified gateway", async () => {
  const [dockerfile, supervisor, entrypoint] = await Promise.all([
    readFile(new URL("Dockerfile", root), "utf8"),
    readFile(new URL("deploy/supervisor.mjs", root), "utf8"),
    readFile(new URL("deploy/docker-entrypoint.sh", root), "utf8")
  ]);

  assert.match(dockerfile, /dist\/standalone \.\/web/);
  assert.match(dockerfile, /\/build\/api\/dist \.\/api\/dist/);
  assert.match(dockerfile, /DATABASE_PATH=\/data\/database/);
  assert.match(dockerfile, /ENTRYPOINT \["\/sbin\/tini"/);
  assert.match(supervisor, /path\.startsWith\("\/api\/"\)/);
  assert.match(supervisor, /webPort = 3001/);
  assert.match(supervisor, /apiPort = 4000/);
  assert.match(entrypoint, /su-exec reponest:reponest/);
  await assert.rejects(access(new URL("Dockerfile.api", root)));
});

test("deployment tooling only supports the current single-container model", async () => {
  const [control, installer, guide, caddy, workflow] = await Promise.all([
    readFile(new URL("deploy/reponestctl", root), "utf8"),
    readFile(new URL("deploy/install.sh", root), "utf8"),
    readFile(new URL("deploy/README.md", root), "utf8"),
    readFile(new URL("deploy/Caddyfile.example", root), "utf8"),
    readFile(new URL(".github/workflows/docker-publish.yml", root), "utf8")
  ]);

  for (const command of ["health", "update", "backup", "restore", "doctor"]) {
    assert.match(control, new RegExp(`${command}[)| ]`));
  }
  assert.doesNotMatch(control, /migrate-volume|legacy|reponest-data/i);
  assert.doesNotMatch(installer, /legacy|migrate-volume|systemd/i);
  assert.match(installer, /\.reponest-install/);
  assert.match(installer, /not an empty RepoNest 0\.1\.0 installation directory/);
  assert.match(guide, /Exactly one container/);
  assert.match(guide, /data\/database/);
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:3000/);
  assert.doesNotMatch(caddy, /@api|4000/);
  assert.match(workflow, /elainaicey\/reponest/);
  assert.doesNotMatch(workflow, /matrix|reponest-web|reponest-api/);
});
