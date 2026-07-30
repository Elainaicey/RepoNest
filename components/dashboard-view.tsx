"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Check,
  GitBranch as Github,
  Heart,
  RefreshCw,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { demoRepositories } from "@/lib/demo-data";
import { relativeTime } from "@/lib/format";
import type { Repository, User } from "@/lib/types";
import { PageHeader } from "./page-header";
import { RepositoryCard } from "./repository-card";

export function DashboardView({ demo = false }: { demo?: boolean }) {
  const queryClient = useQueryClient();
  const repositoryQuery = useQuery({
    queryKey: ["repositories", "all"],
    queryFn: () => api<{ repositories: Repository[] }>("/api/repositories?scope=all"),
    enabled: !demo
  });
  const archivedQuery = useQuery({
    queryKey: ["repositories", "archived"],
    queryFn: () =>
      api<{ repositories: Repository[] }>("/api/repositories?scope=archived"),
    enabled: !demo
  });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/me"),
    enabled: !demo
  });
  const sync = useMutation({
    mutationFn: () => api<{ count: number; syncedAt: string }>("/api/sync", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });
  const update = useMutation({
    mutationFn: ({
      id,
      changes
    }: {
      id: string;
      changes: { favorite?: boolean; archived?: boolean };
    }) =>
      api(`/api/repositories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes)
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
  });

  const repositories = demo
    ? demoRepositories
    : repositoryQuery.data?.repositories ?? [];
  const stats = [
    {
      label: "GitHub 星标",
      value: repositories.filter((repository) => repository.starred).length,
      icon: Github,
      color: "iris"
    },
    {
      label: "稍后收藏",
      value: repositories.filter((repository) => repository.source === "bookmark").length,
      icon: Bookmark,
      color: "sky"
    },
    {
      label: "特别关注",
      value: repositories.filter((repository) => repository.favorite).length,
      icon: Heart,
      color: "ruby"
    },
    {
      label: "已归档",
      value: demo ? 3 : archivedQuery.data?.repositories.length ?? 0,
      icon: Check,
      color: "jade"
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="OVERVIEW"
        title={demo ? "欢迎来到 RepoNest" : "今天想找回什么？"}
        description={
          demo
            ? "这是一份只读演示数据。真实空间会自动同步你的 GitHub 星标。"
            : `上次同步${relativeTime(me.data?.lastSyncedAt ?? null)}。你的整理结果由自己的服务器保存。`
        }
        actions={
          demo ? (
            <Link className="button primary" href="/login">
              <Github size={17} />
              连接 GitHub
            </Link>
          ) : (
            <button
              className="button secondary"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
            >
              <RefreshCw className={sync.isPending ? "spinning" : ""} size={17} />
              {sync.isPending ? "正在同步…" : "立即同步"}
            </button>
          )
        }
      />

      <section className="stats-grid" aria-label="资料库统计">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article className="stat-card" key={label}>
            <span className="stat-icon" data-color={color}>
              <Icon size={18} />
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="insight-card">
        <span className="insight-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <p className="eyebrow">QUIET ORGANIZATION</p>
          <h2>收藏只是开始，重新发现才是价值。</h2>
          <p>
            用收藏集承接长期主题，把值得持续跟进的项目加入特别关注，其余内容可以安静地留在搜索里。
          </p>
        </div>
        <Link href={demo ? "/login" : "/stars"}>
          打开资料库
          <ArrowRight size={16} />
        </Link>
      </section>

      <section className="section-stack" id="library">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENTLY ADDED</p>
            <h2>最近收下的项目</h2>
          </div>
          <Link href={demo ? "/login" : "/stars"}>
            查看全部 <ArrowRight size={15} />
          </Link>
        </div>
        <div className="repo-grid">
          {repositories.slice(0, 6).map((repository) => (
            <RepositoryCard
              demo={demo}
              repository={repository}
              key={repository.id}
              onUpdate={(changes) => update.mutate({ id: repository.id, changes })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
