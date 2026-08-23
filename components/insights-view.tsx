"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  Bookmark,
  CheckCircle2,
  CircleGauge,
  Heart,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Star,
  Tags
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
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
  const processed = data ? Math.max(data.summary.total - data.summary.inbox, 0) : 0;
  const completion = data ? Math.round((processed / Math.max(data.summary.total, 1)) * 100) : 0;
  const noteCoverage = data ? Math.round((data.summary.notes / Math.max(data.summary.total, 1)) * 100) : 0;
  const favoriteRatio = data ? Math.round((data.summary.favorites / Math.max(data.summary.total, 1)) * 100) : 0;
  const leadingLanguage = data?.languages[0];
  const leadingTag = data?.tags[0];

  return (
    <div className="page-stack experience-page insights-page">
      <PageHeader
        eyebrow="INSIGHTS"
        title="收藏洞察"
        description="把收藏规模、整理节奏和知识偏好汇成一张清晰、可行动的资料库画像。"
      />

      {insights.isError ? (
        <QueryErrorState
          title="暂时无法生成收藏洞察"
          description="统计数据没有完整返回。你的收藏与整理信息不会受到影响。"
          onRetry={() => insights.refetch()}
          retrying={insights.isFetching}
        />
      ) : insights.isPending ? (
        <div className="insights-loading" aria-busy="true" aria-label="正在加载收藏洞察">
          <div className="glass-hero skeleton-card insights-hero-skeleton" />
          <div className="insight-metric-grid">
            {[0, 1, 2, 3].map((item) => <div className="insight-metric-card glass-card skeleton-card" key={item} />)}
          </div>
          <div className="insights-grid">
            {[0, 1, 2, 3].map((item) => <div className="chart-card glass-card skeleton-card" key={item} />)}
          </div>
        </div>
      ) : data && data.summary.total === 0 ? (
        <div className="empty-state glass-empty insights-empty">
          <span className="empty-orbit" aria-hidden="true"><i /><i /></span>
          <span className="empty-icon"><BarChart3 size={22} /></span>
          <span className="section-kicker">YOUR LIBRARY, VISUALIZED</span>
          <h2>同步收藏，开始形成你的资料库画像</h2>
          <p>语言分布、整理状态、标签倾向和重点项目会随着你的使用自动汇总。</p>
          <Link className="button primary action-with-glow" href="/library">前往资料库 <ArrowUpRight size={16} /></Link>
        </div>
      ) : data && (
        <>
          <section className="glass-hero insights-hero" aria-labelledby="library-health-title">
            <div
              className="progress-orbit liquid-progress"
              style={{ "--progress": `${completion * 3.6}deg` } as CSSProperties}
              role="img"
              aria-label={`资料库已整理 ${completion}%`}
            >
              <span><strong>{completion}%</strong><small>已整理</small></span>
              <i className="progress-glint" aria-hidden="true" />
            </div>
            <div className="glass-hero-copy insights-hero-copy">
              <span className="hero-kicker"><Sparkles size={14} /> LIBRARY HEALTH</span>
              <h2 id="library-health-title">{completion >= 70 ? "你的资料库保持着清晰的节奏。" : "让待整理清单重新流动起来。"}</h2>
              <p>
                {completion >= 70
                  ? `已有 ${processed} 个项目完成初步整理，继续为重要收藏补充笔记和关联。`
                  : `还有 ${data.summary.inbox} 个项目等待判断。从状态、标签或一行笔记开始即可。`}
              </p>
              <Link className="button secondary" href="/library?status=inbox">整理待处理项目 <ArrowUpRight size={15} /></Link>
            </div>
            <div className="hero-signal-panel">
              <span className="signal-pulse" aria-hidden="true" />
              <small>本期资料库信号</small>
              <strong>{leadingLanguage ? `${leadingLanguage.name} 是最常见的语言` : "继续同步以发现偏好"}</strong>
              <span>{leadingTag ? `最常用标签：${leadingTag.name}` : "为项目添加标签，建立更多关联"}</span>
            </div>
          </section>

          <section className="insight-metric-grid" aria-label="资料库关键指标">
            <Link className="insight-metric-card glass-card interactive-card" href="/library">
              <span className="metric-icon iris"><Bookmark size={17} /></span>
              <span className="metric-copy"><small>有效收藏</small><strong>{data.summary.total}</strong><em>当前资料库规模</em></span>
              <ArrowUpRight className="metric-arrow" size={16} />
            </Link>
            <Link className="insight-metric-card glass-card interactive-card" href="/library?status=inbox">
              <span className="metric-icon amber"><CircleGauge size={17} /></span>
              <span className="metric-copy"><small>整理完成度</small><strong>{completion}%</strong><em>{data.summary.inbox} 个仍待处理</em></span>
              <ArrowUpRight className="metric-arrow" size={16} />
            </Link>
            <Link className="insight-metric-card glass-card interactive-card" href="/favorites">
              <span className="metric-icon ruby"><Heart size={17} /></span>
              <span className="metric-copy"><small>特别关注</small><strong>{data.summary.favorites}</strong><em>占全部收藏 {favoriteRatio}%</em></span>
              <ArrowUpRight className="metric-arrow" size={16} />
            </Link>
            <Link className="insight-metric-card glass-card interactive-card" href="/library">
              <span className="metric-icon sky"><MessageSquareText size={17} /></span>
              <span className="metric-copy"><small>个人笔记</small><strong>{data.summary.notes}</strong><em>覆盖收藏 {noteCoverage}%</em></span>
              <ArrowUpRight className="metric-arrow" size={16} />
            </Link>
          </section>

          <div className="section-heading-row insights-section-heading">
            <div>
              <span className="section-kicker">KNOWLEDGE MAP</span>
              <h2>资料库结构</h2>
              <p>每个图表都可以直接进入对应的项目列表。</p>
            </div>
            <Link className="text-action" href="/library">打开完整资料库 <ArrowUpRight size={15} /></Link>
          </div>

          <div className="insights-grid modern-insights-grid">
            <section className="chart-card glass-card language-chart" aria-labelledby="language-chart-title">
              <header className="chart-card-header">
                <div><span className="section-kicker">TECH STACK</span><h2 id="language-chart-title">语言分布</h2><p>当前收藏中最常出现的技术语言。</p></div>
                <span className="chart-icon iris"><BarChart3 size={19} /></span>
              </header>
              <div className="bar-list" role="list">
                {data.languages.length ? data.languages.map((item, index) => (
                  <div key={item.name} role="listitem">
                    <Link href={`/library?language=${encodeURIComponent(item.name)}`} aria-label={`查看 ${item.count} 个 ${item.name} 项目`}>
                      <span>{item.name}</span>
                    </Link>
                    <div className="bar-track" aria-hidden="true">
                      <i style={{ width: `${Math.max((item.count / maxLanguage) * 100, 6)}%` }} data-index={index} />
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                )) : <p className="chart-empty">同步收藏后将在这里生成分布。</p>}
              </div>
            </section>

            <section className="chart-card glass-card status-chart" aria-labelledby="status-chart-title">
              <header className="chart-card-header">
                <div><span className="section-kicker">WORKFLOW</span><h2 id="status-chart-title">处理状态</h2><p>从刚刚收藏到正式采用的推进情况。</p></div>
                <span className="chart-icon amber"><Lightbulb size={19} /></span>
              </header>
              <div className="stacked-bar elevated-stack" aria-hidden="true">
                {data.statuses.map((item) => <i key={item.name} data-status={item.name} style={{ width: `${(item.count / totalStatus) * 100}%` }} />)}
              </div>
              <div className="status-distribution" role="list">
                {data.statuses.map((item) => (
                  <Link className="status-distribution-row" href={`/library?status=${item.name}`} key={item.name} role="listitem">
                    <span className="status-marker" data-status={item.name} />
                    <span><strong>{statusLabels[item.name]}</strong><small>{item.count} 个项目</small></span>
                    <b>{Math.round((item.count / totalStatus) * 100)}%</b>
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
            </section>

            <section className="chart-card glass-card tag-chart" aria-labelledby="tag-chart-title">
              <header className="chart-card-header">
                <div><span className="section-kicker">TAXONOMY</span><h2 id="tag-chart-title">高频标签</h2><p>跨越收藏集的兴趣和场景线索。</p></div>
                <span className="chart-icon sky"><Tags size={19} /></span>
              </header>
              <div className="tag-cloud weighted-tag-cloud">
                {data.tags.length ? data.tags.map((item, index) => (
                  <Link
                    className="tag-chip insight-tag-chip"
                    data-color={item.color}
                    href={`/library?search=${encodeURIComponent(item.name)}`}
                    key={item.name}
                    style={{ "--weight": Math.min(index + 1, 5) } as CSSProperties}
                    aria-label={`${item.name}，${item.count} 个项目`}
                  >
                    {item.name}<small>{item.count}</small>
                  </Link>
                )) : (
                  <div className="chart-inline-empty">
                    <Tags size={18} />
                    <span>还没有标签关联</span>
                    <Link className="text-action" href="/tags">创建第一枚标签 <ArrowUpRight size={14} /></Link>
                  </div>
                )}
              </div>
            </section>

            <section className="chart-card glass-card signal-card" aria-labelledby="signal-card-title">
              <header className="chart-card-header">
                <div><span className="section-kicker">SIGNALS</span><h2 id="signal-card-title">资料库信号</h2><p>一眼看清哪些地方值得继续投入。</p></div>
                <span className="chart-icon jade"><Sparkles size={19} /></span>
              </header>
              <ul className="signal-list">
                <li>
                  <span className="signal-icon iris"><Star size={15} /></span>
                  <div><strong>{data.summary.stars} 个 GitHub 星标</strong><small>由 GitHub 自动同步，个人整理独立保留</small></div>
                  <CheckCircle2 size={15} aria-label="同步正常" />
                </li>
                <li>
                  <span className="signal-icon ruby"><Heart size={15} /></span>
                  <div><strong>{data.summary.favorites} 个重点项目</strong><small>{favoriteRatio <= 10 ? "重点清晰，保持现在的精选节奏" : "可以重新审视重点范围，让信号更鲜明"}</small></div>
                  <Link href="/favorites" aria-label="查看重点项目"><ArrowUpRight size={15} /></Link>
                </li>
                <li>
                  <span className="signal-icon amber"><Bookmark size={15} /></span>
                  <div><strong>{data.summary.inbox} 个项目待整理</strong><small>补上状态、分组或标签即可完成初步处理</small></div>
                  <Link href="/library?status=inbox" aria-label="查看待整理项目"><ArrowUpRight size={15} /></Link>
                </li>
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
