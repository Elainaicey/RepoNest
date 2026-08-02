import assert from "node:assert/strict";
import test from "node:test";

process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
const { createSyncCoordinator, SyncInProgressError } = await import(
  "../dist/sync.js"
);

test("coordinates one sync per user and records successful state", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const coordinator = createSyncCoordinator(() => pending);
  const first = coordinator.start("user-1", "manual");

  assert.deepEqual(coordinator.getStatus("unknown"), { state: "idle" });
  assert.equal(coordinator.getStatus("user-1").state, "running");
  assert.throws(
    () => coordinator.start("user-1", "scheduled"),
    SyncInProgressError
  );

  const result = {
    count: 12,
    syncedAt: new Date().toISOString(),
    truncated: false
  };
  finish(result);
  assert.deepEqual(await first, result);
  assert.deepEqual(coordinator.getStatus("user-1"), {
    state: "succeeded",
    reason: "manual",
    startedAt: coordinator.getStatus("user-1").startedAt,
    finishedAt: result.syncedAt,
    count: 12,
    truncated: false
  });
});

test("records a safe public failure without retaining error details", async () => {
  const coordinator = createSyncCoordinator(async () => {
    throw new Error("sensitive upstream response");
  });

  await assert.rejects(coordinator.start("user-2", "scheduled"));
  const status = coordinator.getStatus("user-2");
  assert.equal(status.state, "failed");
  assert.equal(status.error, "github_sync_failed");
  assert.equal(JSON.stringify(status).includes("sensitive"), false);
});
