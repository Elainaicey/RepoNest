"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  CircleDot,
  GitBranch as Github,
  Heart,
  RefreshCw,
  Sparkles,
  Tags
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/app/providers";
import { api, ApiError } from "@/lib/api";
import { demoRepositories, demoTags } from "@/lib/demo-data";
import { relativeTime } from "@/lib/format";
import type { Insights, Repository, User } from "@/lib/types";
import { PageHeader } from "./page-header";
import { QueryErrorState } from "./query-error-state";
import { RepositoryCard } from "./repository-card";

const demoInsights: Insights = {
  summary: { total: 36, stars: 32, favorites: 6, notes: 14, inbox: 8 },
  languages: [{ name: "TypeScript", count: 15 }, { name: "JavaScript", count: 10 }, { name: "Rust", count: 6 }],
  statuses: [{ name: "inbox", count: 8 }, { name: "exploring", count: 17 }, { name: "adopted", count: 11 }],
  tags: demoTags.map((tag) => ({ name: tag.name, color: tag.color, count: tag.count ?? 0 }))
};

export function DashboardView({ demo = false }: { demo?: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const repositoryQuery = useQuery({ queryKey: ["repositories", "dashboard"], queryFn: () => api<{ repositories: Repository[] }>("/api/repositories?scope=all&sort=saved"), enabled: !demo });
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/api/me"), enabled: !demo });
  const insightQuery = useQuery({ queryKey: ["insights"], queryFn: () => api<Insights>("/api/insights"), enabled: !demo });
  const sync = useMutation({
    mutationFn: () => api<{ count: number; syncedAt: string; truncated: boolean }>("/api/sync", { method: "POST" }),
    onSuccess: async (result) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["repositories"] }), queryClient.invalidateQueries({ queryKey: ["me"] }), queryClient.invalidateQueries({ queryKey: ["insights"] })]);
      notify(result.truncated ? "同步已达到上限" : "同步完成", `已核对 ${result.count} 个 GitHub 星标。`, result.truncated ? "info" : "success");
    },
    onError: (error) => notify(
      error instanceof ApiError && error.status === 409 ? "同步已经在进行" : "同步失败",
      error instanceof ApiError && error.status === 409 ? "无需重复启动，请稍候查看结果。" : "GitHub 暂时不可用，请稍后重试。",
      error instanceof ApiError && error.status === 409 ? "info" : "error"
    )
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { favorite?: boolean; archived?: boolean } }) => api(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repositories"] }),
    onError: () => notify("更新失败", "没有修改这个项目，请稍后重试。", "error")
  });

  const loading = !demo && (repositoryQuery.isPending || me.isPending || insightQuery.isPending);
  const failed = !demo && (repositoryQuery.isError || me.isError || insightQuery.isError);

  if (failed) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader
          eyebrow="OVERVIEW"
          title="暂时无法打开概览"
          description="你的收藏和整理信息仍安全保存在服务器上。"
        />
        <QueryErrorState
          description="概览数据没有完整返回。可以重新请求资料库、账户和洞察数据。"
          onRetry={() => Promise.all([
            repositoryQuery.refetch(),
            me.refetch(),
            insightQuery.refetch()
          ])}
          retrying={repositoryQuery.isFetching || me.isFetching || insightQuery.isFetching}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-stack dashboard-page" aria-busy="true">
        <PageHeader
          eyebrow="OVERVIEW"
          title="正在准备你的资料库"
          description="正在汇总收藏、处理进度和最近同步状态。"
        />
        <section className="stats-grid" aria-label="正在加载资料库统计">
          {[0, 1, 2, 3].map((item) => (
            <article className="stat-card skeleton-card" key={item} style={{ minHeight: 108 }} />
          ))}
        </section>
        <div className="dashboard-bento" aria-hidden="true">
          <section className="workflow-card skeleton-card" />
          <section className="rediscover-card skeleton-card" />
          <section className="dashboard-tags-card skeleton-card" />
        </div>
        <span className="sr-only">正在加载概览</span>
      </div>
    );
  }

  const repositories = demo ? demoRepositories : repositoryQuery.data?.repositories ?? [];
  const insights = demo ? demoInsights : insightQuery.data;
  const stats = [
    { label: "有效收藏", value: insights?.summary.total ?? repositories.length, icon: Github, color: "iris", detail: `${insights?.summary.stars ?? 0} 个来自 Star` },
    { label: "待整理", value: insights?.summary.inbox ?? 0, icon: CircleDot, color: "amber", detail: "补充标签或状态" },
    { label: "特别关注", value: insights?.summary.favorites ?? 0, icon: Heart, color: "ruby", detail: "当前重点项目" },
    { label: "已有笔记", value: insights?.summary.notes ?? 0, icon: CheckCircle2, color: "jade", detail: "形成个人上下文" }
  ];
  const statusCount = (name: string) => insights?.statuses.find((item) => item.name === name)?.count ?? 0;
  const spotlight = repositories.find((item) => item.rating >= 4 && item.note) ?? repositories[0];

  if (!repositories.length) {
    return (
      <div className="page-stack dashboard-page">
        <PageHeader
          eyebrow="OVERVIEW"
          title={`欢迎回来，${me.data?.name?.split(" ")[0] || me.data?.login || "开发者"}`}
          description="资料库已经准备好。先同步 GitHub 星标，或手动收下第一个仓库。"
          actions={(
            <button className="button secondary" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCw className={sync.isPending ? "spinning" : ""} size={17} />
              {sync.isPending ? "正在同步…" : "同步 GitHub"}
            </button>
          )}
        />
        <div className="empty-state">
          <span className="empty-icon"><Github size={22} /></span>
          <h2>建立你的第一份收藏索引</h2>
          <p>同步现有 GitHub Star，随后就能用收藏集、标签、状态、评分和笔记持续整理。</p>
          <div className="page-actions">
            <button className="button primary" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCw className={sync.isPending ? "spinning" : ""} size={16} />
              {sync.isPending ? "正在同步…" : "立即同步"}
            </button>
            <Link className="button secondary" href="/library">手动添加仓库</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page">
      <PageHeader
        eyebrow="OVERVIEW"
        title={demo ? "一个更有秩序的收藏空间" : `欢迎回来，${me.data?.name?.split(" ")[0] || me.data?.login || "开发者"}`}
        description={demo ? "这是一份只读演示。真实空间会自动同步 GitHub，并保留全部个人整理。" : `上次同步${relativeTime(me.data?.lastSyncedAt ?? null)}。从待整理清单继续，或者重新发现一项旧收藏。`}
        actions={demo ? <Link className="button primary" href="/login"><Github size={17} />连接 GitHub</Link> : <button className="button secondary" onClick={() => sync.mutate()} disabled={sync.isPending}><RefreshCw className={sync.isPending ? "spinning" : ""} size={17} />{sync.isPending ? "正在同步…" : "同步 GitHub"}</button>}
      />

      <section className="stats-grid" aria-label="资料库统计">
        {stats.map(({ label, value, icon: Icon, color, detail }) => <article className="stat-card" key={label}><span className="stat-icon" data-color={color}><Icon size={18} /></span><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div><i /></article>)}
      </section>

      <div className="dashboard-bento">
        <section className="workflow-card">
          <header><div><p className="eyebrow">COLLECTION FLOW</p><h2>收藏处理进度</h2></div><Link href={demo ? "/login" : "/insights"}>查看洞察 <ArrowRight size={14} /></Link></header>
          <div className="workflow-lanes">
            <Link href={demo ? "/login" : "/library?status=inbox"}><span data-status="inbox"><Bookmark size={17} /></span><div><strong>待整理</strong><small>刚收藏，等待归类</small></div><b>{statusCount("inbox")}</b></Link>
            <Link href={demo ? "/login" : "/library?status=exploring"}><span data-status="exploring"><Sparkles size={17} /></span><div><strong>探索中</strong><small>正在阅读与评估</small></div><b>{statusCount("exploring")}</b></Link>
            <Link href={demo ? "/login" : "/library?status=adopted"}><span data-status="adopted"><CheckCircle2 size={17} /></span><div><strong>已采用</strong><small>已经进入工作流</small></div><b>{statusCount("adopted")}</b></Link>
          </div>
        </section>

        <section className="rediscover-card">
          <div className="rediscover-orb"><Sparkles size={18} /></div><p className="eyebrow">REDISCOVER</p><h2>从旧收藏里找回一条线索</h2>
          {spotlight ? <div className="spotlight-repo"><span className="repo-avatar">{spotlight.owner.slice(0, 2).toUpperCase()}</span><div><strong>{spotlight.fullName}</strong><p>{spotlight.note || spotlight.description}</p></div></div> : <p>同步 GitHub 后，这里会推荐值得再次查看的项目。</p>}
          <Link href={demo ? "/login" : spotlight?.url ?? "/library"} target={!demo && spotlight ? "_blank" : undefined}>重新打开 <ArrowRight size={15} /></Link>
        </section>

        <section className="dashboard-tags-card">
          <header><div><p className="eyebrow">YOUR TAXONOMY</p><h2>高频标签</h2></div><Tags size={18} /></header>
          <div>{(insights?.tags ?? []).slice(0, 7).map((tag) => <span className="tag-chip" data-color={tag.color} key={tag.name}>{tag.name}<small>{tag.count}</small></span>)}</div>
          <Link href={demo ? "/login" : "/tags"}>管理标签 <ArrowRight size={14} /></Link>
        </section>
      </div>

      <section className="section-stack" id="library">
        <div className="section-heading"><div><p className="eyebrow">RECENTLY SAVED</p><h2>最近收下的项目</h2></div><Link href={demo ? "/login" : "/library"}>打开资料库 <ArrowRight size={15} /></Link></div>
        <div className="repo-grid dashboard-repo-grid">
          {repositories.slice(0, 6).map((repository) => (
            <RepositoryCard
              demo={demo}
              href={demo ? "/login" : `/library?repository=${encodeURIComponent(repository.id)}`}
              repository={repository}
              key={repository.id}
              onUpdate={demo ? undefined : (changes) => update.mutate({ id: repository.id, changes })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
