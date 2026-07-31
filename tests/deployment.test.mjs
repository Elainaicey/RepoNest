import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("production compose uses host-visible persistence and isolated services", async () => {
  const compose = await readFile(new URL("docker-compose.yml", root), "utf8");

  assert.match(compose, /REPONEST_DATA_DIR:-\.\/data\/postgres/);
  assert.doesNotMatch(compose, /^volumes:\s*\n\s+reponest-data:/m);
  assert.match(compose, /name: reponest-data-network\s+internal: true/);
  assert.match(compose, /max-size: \$\{REPONEST_LOG_MAX_SIZE:-10m\}/);
  assert.match(compose, /cap_drop:\s*\n\s+- ALL/);
  assert.match(compose, /POSTGRES_PASSWORD:\?Set POSTGRES_PASSWORD in \.env/);
});

test("deployment control covers safe lifecycle and data operations", async () => {
  const [control, installer, guide, timer] = await Promise.all([
    readFile(new URL("deploy/reponestctl", root), "utf8"),
    readFile(new URL("deploy/install.sh", root), "utf8"),
    readFile(new URL("deploy/README.md", root), "utf8"),
    readFile(new URL("deploy/systemd/reponest-backup.timer", root), "utf8")
  ]);

  for (const command of ["health", "update", "backup", "restore", "migrate-volume", "doctor"]) {
    assert.match(control, new RegExp(`${command.replace("-", "\\-")}[)| ]`));
  }
  assert.match(control, /Type RESTORE to continue/);
  assert.match(control, /pre-restore-/);
  assert.match(control, /test -f \/target\/PG_VERSION/);
  assert.match(control, /old volume was retained/i);
  assert.match(installer, /Preserved existing .*\.env/);
  assert.match(guide, /\/opt\/reponest\/data\/postgres/);
  assert.match(timer, /Persistent=true/);
  assert.match(timer, /OnCalendar=/);
});
