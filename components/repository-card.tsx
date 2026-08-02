"use client";

import {
  Archive,
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
import type { Repository } from "@/lib/types";
import { compactNumber, relativeTime } from "@/lib/format";

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
  const openRepository = () => {
    if (onOpen) onOpen();
    else if (href) router.push(href);
  };
  const identity = <><span className="repo-avatar">{repository.owner.slice(0, 2).toUpperCase()}</span><span><small>{repository.owner}</small><strong>{repository.name}</strong></span></>;
  const body = <><p className="repo-description">{repository.description || "这个仓库暂时没有填写简介。"}</p><div className="repo-labels"><span className="status-chip" data-status={repository.readStatus}>{statusCopy[repository.readStatus]}</span>{repository.collectionName && <span className="collection-chip"><Bookmark size={12} /> {repository.collectionName}</span>}{repository.rating > 0 && <span className="rating-chip" aria-label={`个人评分 ${repository.rating} 星`}><Star size={12} fill="currentColor" /> {repository.rating}</span>}{repository.tags.slice(0, 3).map((tag) => <span className="tag-chip" data-color={tag.color} key={tag.id}>{tag.name}</span>)}</div></>;

  return (
    <article
      className={`repo-card ${selected ? "selected" : ""} ${view === "list" ? "repo-card-list" : ""}`}
      onDoubleClick={canOpen ? openRepository : undefined}
    >
      {onSelect && (
        <button
          className="select-control"
          data-selected={selected}
          onClick={onSelect}
          aria-label={selected ? `取消选择 ${repository.fullName}` : `选择 ${repository.fullName}`}
          role="checkbox"
          aria-checked={selected}
        >
          <span />
        </button>
      )}
      <div className="repo-card-top">
        {canOpen ? <button className="repo-identity" onClick={openRepository} type="button" aria-label={`打开 ${repository.fullName} 详情`}>{identity}</button> : <div className="repo-identity static">{identity}</div>}
        <div className="repo-card-actions">
          {!demo && onUpdate && <button
            className={repository.favorite ? "icon-button selected" : "icon-button"}
            onClick={() => onUpdate({ favorite: !repository.favorite })}
            aria-label={repository.favorite ? "取消特别关注" : "设为特别关注"}
            aria-pressed={repository.favorite}
          >
            <Heart size={16} fill={repository.favorite ? "currentColor" : "none"} />
          </button>}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-button" aria-label="更多操作">
                <MoreHorizontal size={17} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu-content" align="end" sideOffset={8}>
                {canOpen && <DropdownMenu.Item className="menu-item" onSelect={openRepository}>
                  <MessageSquareText size={15} /> 编辑整理信息
                </DropdownMenu.Item>}
                <DropdownMenu.Item className="menu-item" asChild>
                  <a href={repository.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} /> 在 GitHub 打开
                  </a>
                </DropdownMenu.Item>
                {!demo && onUpdate && <><DropdownMenu.Separator className="menu-separator" />
                <DropdownMenu.Item
                  className="menu-item"
                  onSelect={() => onUpdate({ archived: !repository.archived })}
                >
                  <Archive size={15} /> {repository.archived ? "移出归档" : "归档项目"}
                </DropdownMenu.Item></>}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {canOpen ? <button className="repo-card-body" onClick={openRepository} type="button" aria-label={`查看 ${repository.fullName} 的整理信息`}>{body}</button> : <div className="repo-card-body static">{body}</div>}

      {repository.note && (
        <div className="repo-note">
          <MessageSquareText size={14} />
          <span>{repository.note}</span>
        </div>
      )}
      <footer className="repo-card-footer">
        <div className="repo-meta">
          {repository.language && (
            <span><i className="language-dot" />{repository.language}</span>
          )}
          <span><Star size={14} />{compactNumber(repository.stars)}</span>
          <span><GitFork size={14} />{compactNumber(repository.forks)}</span>
          {repository.source === "bookmark" && <span><Bookmark size={13} />手动收藏</span>}
        </div>
        <span className="quiet-action">{demo ? "最近更新" : relativeTime(repository.pushedAt || repository.updatedAt)}</span>
      </footer>
    </article>
  );
}
