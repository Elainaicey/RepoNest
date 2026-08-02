import type { SyncResult } from "./github.js";

export type SyncReason = "initial" | "manual" | "scheduled";

export type SyncStatus =
  | { state: "idle" }
  | {
      state: "running";
      reason: SyncReason;
      startedAt: string;
    }
  | {
      state: "succeeded";
      reason: SyncReason;
      startedAt: string;
      finishedAt: string;
      count: number;
      truncated: boolean;
    }
  | {
      state: "failed";
      reason: SyncReason;
      startedAt: string;
      finishedAt: string;
      error: "github_sync_failed";
    };

export class SyncInProgressError extends Error {
  constructor() {
    super("A GitHub synchronization is already running for this user.");
    this.name = "SyncInProgressError";
  }
}

type SyncRunner = (userId: string) => Promise<SyncResult>;

export function createSyncCoordinator(run: SyncRunner) {
  const statuses = new Map<string, SyncStatus>();

  return {
    getStatus(userId: string): SyncStatus {
      return statuses.get(userId) ?? { state: "idle" };
    },

    start(userId: string, reason: SyncReason): Promise<SyncResult> {
      if (statuses.get(userId)?.state === "running") {
        throw new SyncInProgressError();
      }

      const startedAt = new Date().toISOString();
      statuses.set(userId, { state: "running", reason, startedAt });

      return run(userId).then(
        (result) => {
          statuses.set(userId, {
            state: "succeeded",
            reason,
            startedAt,
            finishedAt: result.syncedAt,
            count: result.count,
            truncated: result.truncated
          });
          return result;
        },
        (error: unknown) => {
          statuses.set(userId, {
            state: "failed",
            reason,
            startedAt,
            finishedAt: new Date().toISOString(),
            error: "github_sync_failed"
          });
          throw error;
        }
      );
    }
  };
}
