"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bookmark, Heart, Lightbulb, MessageSquareText, Star, Tags } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Insights } from "@/lib/types";
import { PageHeader } from "./page-header";
import { QueryErrorState } from "./query-error-state";

const statusLabels = { inbox: "待整理", exploring: "探索中", adopted: "已采用" };

export function InsightsView() {
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => api<Insights>("/api/insights") });
  const data = insights.data;
  const maxLanguage = Math.max(...(data?.languages.map((item) => item.count) ?? [1]));
  const totalStatus = data?.statuses.reduce((sum, item) => sum + item.count, 0) || 1;
  const completion = data ? Math.round(((data.summary.total - data.summary.inbox) / Math.max(data.summary.total, 1)) * 100) : 0;

  return (
    <div className="page-stack insights-page">
      <PageHeader eyebrow="INSIGHTS" title="收藏洞察" description="从积累中看见偏好、处理进度与知识结构，决定下一步应该整理什么。" />
      {insights.isError ? (
        <QueryErrorState
          title="暂时无法生成收藏洞察"
          description="统计数据没有完整返回。你的收藏与整理信息不会受到影响。"
          onRetry={() => insights.refetch()}
          retrying={insights.isFetching}
        />
      ) : insights.isPending ? <div className="insights-skeleton" aria-label="正在加载收藏洞察"><div /><div /><div /></div> : data && data.summary.total === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><BarChart3 size={22} /></span>
          <h2>同步收藏后，这里会形成你的资料库画像</h2>
          <p>语言、处理状态、标签和重点项目会随着整理过程自动汇总。</p>
          <Link className="button primary" href="/library">前往资料库</Link>
        </div>
      ) : data && (
        <>
          <section className="insights-hero">
            <div className="progress-orbit" style={{ "--progress": `${completion * 3.6}deg` } as React.CSSProperties}><span><strong>{completion}%</strong><small>已处理</small></span></div>
            <div><p className="eyebrow">LIBRARY HEALTH</p><h2>{completion >= 70 ? "你的资料库保持得很好。" : "先从待整理清单开始。"}</h2><p>状态、笔记和标签把短暂的收藏行为转化为可以长期使用的知识资产。</p><Link className="button secondary" href="/library?status=inbox">整理待处理项目</Link></div>
            <div className="insight-mini-stats"><span><Bookmark size={16} /><strong>{data.summary.total}</strong><small>有效收藏</small></span><span><MessageSquareText size={16} /><strong>{data.summary.notes}</strong><small>个人笔记</small></span><span><Heart size={16} /><strong>{data.summary.favorites}</strong><small>特别关注</small></span></div>
          </section>
          <div className="insights-grid">
            <section className="chart-card language-chart"><header><div><p className="eyebrow">TECH STACK</p><h2>语言分布</h2></div><BarChart3 size={19} /></header><div className="bar-list">{data.languages.length ? data.languages.map((item, index) => <div key={item.name}><Link href={`/library?language=${encodeURIComponent(item.name)}`} aria-label={`查看 ${item.name} 项目`}><span>{item.name}</span></Link><div><i style={{ width: `${Math.max((item.count / maxLanguage) * 100, 6)}%` }} data-index={index} /></div><strong>{item.count}</strong></div>) : <p className="chart-empty">同步收藏后将在这里生成分布。</p>}</div></section>
            <section className="chart-card status-chart"><header><div><p className="eyebrow">WORKFLOW</p><h2>处理状态</h2></div><Lightbulb size={19} /></header><div className="status-distribution">{data.statuses.map((item) => <div key={item.name}><span data-status={item.name} /><div><Link href={`/library?status=${item.name}`} style={{ display: "flex", flexDirection: "column" }}><strong>{statusLabels[item.name]}</strong><small>{Math.round((item.count / totalStatus) * 100)}% · {item.count} 个</small></Link></div></div>)}</div><div className="stacked-bar">{data.statuses.map((item) => <i key={item.name} data-status={item.name} style={{ width: `${(item.count / totalStatus) * 100}%` }} />)}</div></section>
            <section className="chart-card tag-chart"><header><div><p className="eyebrow">TAXONOMY</p><h2>高频标签</h2></div><Tags size={19} /></header><div className="tag-cloud">{data.tags.length ? data.tags.map((item, index) => <Link className="tag-chip" data-color={item.color} href={`/library?search=${encodeURIComponent(item.name)}`} key={item.name} style={{ "--weight": Math.min(index + 1, 5) } as React.CSSProperties}>{item.name}<small>{item.count}</small></Link>) : <Link href="/tags">创建第一枚标签</Link>}</div></section>
            <section className="chart-card signal-card"><header><div><p className="eyebrow">SIGNALS</p><h2>资料库信号</h2></div><Star size={19} /></header><ul><li><span className="signal-icon iris"><Star size={15} /></span><div><strong>{data.summary.stars} 个 GitHub 星标</strong><small>由 GitHub 自动同步并保留个人整理</small></div></li><li><span className="signal-icon ruby"><Heart size={15} /></span><div><strong>{data.summary.favorites} 个重点项目</strong><small>建议保持在总收藏的 10% 以内</small></div></li><li><span className="signal-icon amber"><Bookmark size={15} /></span><div><strong>{data.summary.inbox} 个项目待整理</strong><small>补上状态、分组或标签即可完成处理</small></div></li></ul></section>
          </div>
        </>
      )}
    </div>
  );
}
