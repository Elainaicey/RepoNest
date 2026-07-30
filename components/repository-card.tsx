"use client";

import {
  Archive,
  ExternalLink,
  GitFork,
  Heart,
  MessageSquareText,
  Star
} from "lucide-react";
import type { Repository } from "@/lib/types";
import { compactNumber, relativeTime } from "@/lib/format";

export function RepositoryCard({
  repository,
  onUpdate,
  demo = false
}: {
  repository: Repository;
  onUpdate?: (update: { favorite?: boolean; archived?: boolean }) => void;
  demo?: boolean;
}) {
  return (
    <article className="repo-card">
      <div className="repo-card-top">
        <div className="repo-identity">
          <span className="repo-avatar">{repository.owner.slice(0, 2).toUpperCase()}</span>
          <div>
            <p>{repository.owner}</p>
            <h3>{repository.name}</h3>
          </div>
        </div>
        <div className="repo-card-actions">
          <button
            className={repository.favorite ? "icon-button selected" : "icon-button"}
            onClick={() =>
              !demo && onUpdate?.({ favorite: !repository.favorite })
            }
            aria-label={repository.favorite ? "取消特别关注" : "设为特别关注"}
            title={repository.favorite ? "取消特别关注" : "特别关注"}
          >
            <Heart size={16} fill={repository.favorite ? "currentColor" : "none"} />
          </button>
          <a
            className="icon-button"
            href={repository.url}
            target="_blank"
            rel="noreferrer"
            aria-label="在 GitHub 中打开"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
      <p className="repo-description">
        {repository.description || "这个仓库暂时没有填写简介。"}
      </p>
      <div className="topic-row">
        {repository.topics.slice(0, 3).map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>
      {repository.note && (
        <div className="repo-note">
          <MessageSquareText size={14} />
          <span>{repository.note}</span>
        </div>
      )}
      <footer className="repo-card-footer">
        <div className="repo-meta">
          {repository.language && (
            <span>
              <i className="language-dot" />
              {repository.language}
            </span>
          )}
          <span>
            <Star size={14} />
            {compactNumber(repository.stars)}
          </span>
          <span>
            <GitFork size={14} />
            {compactNumber(repository.forks)}
          </span>
        </div>
        <button
          className="quiet-action"
          onClick={() => !demo && onUpdate?.({ archived: !repository.archived })}
          title={repository.archived ? "移出归档" : "归档"}
        >
          <Archive size={14} />
          {repository.archived ? "恢复" : relativeTime(repository.updatedAt)}
        </button>
      </footer>
    </article>
  );
}
