"use client";

import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";

export default function ProductError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="RECOVERY"
        title="这个页面没有顺利打开"
        description="RepoNest 已保留当前会话和资料库数据，可以直接重新加载页面。"
      />
      <QueryErrorState
        title="页面加载遇到问题"
        description="这通常是一次临时错误。如果重试后仍未恢复，请查看服务端日志。"
        onRetry={reset}
      />
    </div>
  );
}
