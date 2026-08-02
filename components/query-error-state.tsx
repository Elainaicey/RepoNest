"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export function QueryErrorState({
  title = "暂时无法读取数据",
  description = "连接可能刚刚中断。请检查网络后重试，已有数据不会受到影响。",
  onRetry,
  retrying = false
}: {
  title?: string;
  description?: string;
  onRetry: () => void | Promise<unknown>;
  retrying?: boolean;
}) {
  return (
    <div className="query-error-state" role="alert" aria-live="assertive">
      <TriangleAlert className="query-error-icon" size={22} />
      <h2>{title}</h2>
      <p>{description}</p>
      <button
        className="button secondary"
        disabled={retrying}
        onClick={() => void onRetry()}
        type="button"
      >
        <RefreshCw className={retrying ? "spinning" : ""} size={16} />
        {retrying ? "正在重试…" : "重新加载"}
      </button>
    </div>
  );
}
