"use client";

import {
  Archive,
  ArrowUpRight,
  Bookmark,
  ExternalLink,
  GitFork,
  Heart,
  MessageSquareText,
  MoreHorizontal,
  Star
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useRouter } from "next/navigation";
import { compactNumber, relativeTime } from "@/lib/format";
import type { Repository } from "@/lib/types";
import { InteractiveSurface } from "./interactive-surface";

const statusCopy = {
  inbox: "待整理",
  exploring: "探索中",
  adopted: "已采用"
};

export function RepositoryCard({
  repository,
  onUpdate,
  onOpen,
  selected = false,
  onSelect,
  view = "grid",
  demo = false,
  href
}: {
  repository: Repository;
  onUpdate?: (update: { favorite?: boolean; archived?: boolean }) => void;
  onOpen?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  view?: "grid" | "list";
  demo?: boolean;
  href?: string;
}) {
  const router = useRouter();
  const canOpen = Boolean(onOpen || href);
  const visibleTags = repository.tags.slice(0, 3);
  const hiddenTagCount = Math.max(repository.tags.length - visibleTags.length, 0);
  const timestamp = demo ? "最近更新" : relativeTime(repository.pushedAt || repository.updatedAt);

  const openRepository = () => {
    if (onOpen) onOpen();
    else if (href) router.push(href);
  };

  const identity = (
    <>
      <span className="repo-avatar repo-card-avatar" aria-hidden="true">
        {repository.owner.slice(0, 2).toUpperCase()}
      </span>
      <span className="repo-identity-copy">
        <small className="repo-owner">{repository.owner}</small>
        <strong className="repo-name">{repository.name}</strong>
      </span>
    </>
  );

  const body = (
    <>
      <p className="repo-description">{repository.description || "这个仓库暂时没有填写简介。"}</p>
      <div className="repo-labels repo-card-taxonomy" aria-label="项目分类信息">
        <span className="status-chip" data-status={repository.readStatus}>
          <span className="status-chip-dot" aria-hidden="true" />
          {statusCopy[repository.readStatus]}
        </span>
        {repository.collectionName && (
          <span className="collection-chip"><Bookmark size={12} aria-hidden="true" /> {repository.collectionName}</span>
        )}
        {repository.rating > 0 && (
          <span className="rating-chip" aria-label={`个人评分 ${repository.rating} 星`}>
            <Star size={12} fill="currentColor" aria-hidden="true" /> {repository.rating}
          </span>
        )}
        {visibleTags.map((tag) => (
          <span className="tag-chip" data-color={tag.color} key={tag.id}>{tag.name}</span>
        ))}
        {hiddenTagCount > 0 && <span className="tag-overflow-chip" aria-label={`另有 ${hiddenTagCount} 个标签`}>+{hiddenTagCount}</span>}
      </div>
    </>
  );

  const card = (
    <article
      className={`repo-card repo-card-interactive ${selected ? "selected" : ""} ${view === "list" ? "repo-card-list" : ""}`}
      data-view={view}
      data-status={repository.readStatus}
      aria-label={`${repository.fullName}，${statusCopy[repository.readStatus]}`}
    >
      <span className="repo-card-spotlight" aria-hidden="true" />

      {onSelect && (
        <button
          className="select-control repo-card-select"
          data-selected={selected}
          onClick={onSelect}
          aria-label={selected ? `取消选择 ${repository.fullName}` : `选择 ${repository.fullName}`}
          role="checkbox"
          aria-checked={selected}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      )}

      <header className="repo-card-top repo-card-header">
        {canOpen ? (
          <button className="repo-identity" onClick={openRepository} type="button" aria-label={`打开 ${repository.fullName} 详情`}>
            {identity}
          </button>
        ) : (
          <div className="repo-identity static">{identity}</div>
        )}

        <div className="repo-card-actions">
          {!demo && onUpdate && (
            <button
              className={repository.favorite ? "icon-button selected" : "icon-button"}
              onClick={() => onUpdate({ favorite: !repository.favorite })}
              aria-label={repository.favorite ? `取消特别关注 ${repository.fullName}` : `特别关注 ${repository.fullName}`}
              aria-pressed={repository.favorite}
              type="button"
            >
              <Heart size={16} fill={repository.favorite ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-button" aria-label={`${repository.fullName} 的更多操作`} type="button">
                <MoreHorizontal size={17} aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu-content repo-card-menu" align="end" sideOffset={8}>
                <DropdownMenu.Label className="menu-label">{repository.fullName}</DropdownMenu.Label>
                {canOpen && (
                  <DropdownMenu.Item className="menu-item" onSelect={openRepository}>
                    <MessageSquareText size={15} aria-hidden="true" /> 编辑整理信息
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item className="menu-item" asChild>
                  <a href={repository.url} target="_blank" rel="noreferrer" aria-label={`在 GitHub 打开 ${repository.fullName}`}>
                    <ExternalLink size={15} aria-hidden="true" /> 在 GitHub 打开
                  </a>
                </DropdownMenu.Item>
                {!demo && onUpdate && (
                  <>
                    <DropdownMenu.Separator className="menu-separator" />
                    <DropdownMenu.Item className="menu-item" onSelect={() => onUpdate({ archived: !repository.archived })}>
                      <Archive size={15} aria-hidden="true" /> {repository.archived ? "移出归档" : "归档项目"}
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {canOpen ? (
        <button className="repo-card-body repo-card-primary-action" onClick={openRepository} type="button" aria-label={`查看 ${repository.fullName} 的整理信息`}>
          {body}
        </button>
      ) : (
        <div className="repo-card-body static">{body}</div>
      )}

      {repository.note && (
        <div className="repo-note repo-card-note">
          <MessageSquareText size={14} aria-hidden="true" />
          <span><span className="sr-only">私人笔记：</span>{repository.note}</span>
        </div>
      )}

      <footer className="repo-card-footer">
        <div className="repo-meta repo-card-stats" aria-label="GitHub 项目数据">
          {repository.language && (
            <span><i className="language-dot" aria-hidden="true" />{repository.language}</span>
          )}
          <span aria-label={`${repository.stars.toLocaleString()} 个 Star`}><Star size={14} aria-hidden="true" />{compactNumber(repository.stars)}</span>
          <span aria-label={`${repository.forks.toLocaleString()} 个 Fork`}><GitFork size={14} aria-hidden="true" />{compactNumber(repository.forks)}</span>
          {repository.source === "bookmark" && <span><Bookmark size={13} aria-hidden="true" />手动收藏</span>}
        </div>
        <div className="repo-card-tail">
          <span className="quiet-action repo-card-timestamp">{timestamp}</span>
          {canOpen && <span className="repo-card-open-hint" aria-hidden="true">查看 <ArrowUpRight size={13} /></span>}
        </div>
      </footer>
    </article>
  );

  if (view === "list") return card;

  return (
    <InteractiveSurface
      className={`repo-card-surface ${selected ? "selected" : ""}`}
      maxTilt={2.4}
      lift={4}
      glowColor="var(--v2-iris)"
    >
      {card}
    </InteractiveSurface>
  );
}
