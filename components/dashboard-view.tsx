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
import { api } from "@/lib/api";
import { demoRepositories, demoTags } from "@/lib/demo-data";
import { relativeTime } from "@/lib/format";
import type { Insights, Repository, User } from "@/lib/types";
import { PageHeader } from "./page-header";
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
    mutationFn: () => api<{ count: number; syncedAt: string }>("/api/sync", { method: "POST" }),
    onSuccess: async (result) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["repositories"] }), queryClient.invalidateQueries({ queryKey: ["me"] }), queryClient.invalidateQueries({ queryKey: ["insights"] })]);
      notify("同步完成", `已核对 ${result.count} 个 GitHub 星标。`);
    },
    onError: () => notify("同步失败", "GitHub 暂时不可用，请稍后重试。")
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { favorite?: boolean; archived?: boolean } }) => api(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repositories"] })
  });

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
            <Link href={demo ? "/login" : "/library"}><span data-status="inbox"><Bookmark size={17} /></span><div><strong>待整理</strong><small>刚收藏，等待归类</small></div><b>{statusCount("inbox")}</b></Link>
            <Link href={demo ? "/login" : "/library"}><span data-status="exploring"><Sparkles size={17} /></span><div><strong>探索中</strong><small>正在阅读与评估</small></div><b>{statusCount("exploring")}</b></Link>
            <Link href={demo ? "/login" : "/library"}><span data-status="adopted"><CheckCircle2 size={17} /></span><div><strong>已采用</strong><small>已经进入工作流</small></div><b>{statusCount("adopted")}</b></Link>
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
          {repositories.slice(0, 6).map((repository) => <RepositoryCard demo={demo} repository={repository} key={repository.id} onUpdate={(changes) => update.mutate({ id: repository.id, changes })} />)}
        </div>
      </section>
    </div>
  );
}
