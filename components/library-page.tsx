"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  Collection,
  Repository,
  RepositoryScope
} from "@/lib/types";
import { PageHeader } from "./page-header";
import { RepositoryCard } from "./repository-card";

const copy: Record<
  RepositoryScope,
  { eyebrow: string; title: string; description: string }
> = {
  all: {
    eyebrow: "LIBRARY",
    title: "全部收藏",
    description: "你的 GitHub 星标与手动收藏，集中在一个安静、可搜索的资料库里。"
  },
  stars: {
    eyebrow: "GITHUB",
    title: "GitHub 星标",
    description: "由 GitHub 自动同步，并保留你添加的分类、关注与笔记。"
  },
  bookmarks: {
    eyebrow: "BOOKMARKS",
    title: "稍后收藏",
    description: "保存尚未 Star、但值得在之后认真阅读的 GitHub 仓库。"
  },
  favorites: {
    eyebrow: "FOCUS",
    title: "特别关注",
    description: "把最重要的项目留在伸手可及的位置。"
  },
  archived: {
    eyebrow: "ARCHIVE",
    title: "归档",
    description: "暂时收起不常使用的项目，而不丢失你的整理成果。"
  }
};

export function LibraryPage({
  scope,
  collectionId,
  collectionName
}: {
  scope: RepositoryScope;
  collectionId?: string;
  collectionName?: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showBookmark, setShowBookmark] = useState(false);
  const [bookmark, setBookmark] = useState("");
  const repositories = useQuery({
    queryKey: ["repositories", scope, collectionId],
    queryFn: () => {
      const query = new URLSearchParams({ scope });
      if (collectionId) query.set("collection", collectionId);
      return api<{ repositories: Repository[] }>(
        `/api/repositories?${query.toString()}`
      );
    }
  });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<{ collections: Collection[] }>("/api/collections")
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
  const addBookmark = useMutation({
    mutationFn: () =>
      api("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify({ repository: bookmark, collectionId: collectionId ?? null })
      }),
    onSuccess: () => {
      setBookmark("");
      setShowBookmark(false);
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
    }
  });

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return repositories.data?.repositories ?? [];
    return (repositories.data?.repositories ?? []).filter((repository) =>
      `${repository.fullName} ${repository.description ?? ""} ${repository.topics.join(" ")}`
        .toLocaleLowerCase()
        .includes(needle)
    );
  }, [repositories.data, search]);

  const resolvedCollectionName =
    collectionName ??
    collections.data?.collections.find(
      (collection) => collection.id === collectionId
    )?.name;
  const pageCopy = resolvedCollectionName
    ? {
        eyebrow: "COLLECTION",
        title: resolvedCollectionName,
        description: "一个有边界的小空间，承接同一条学习或工作线索。"
      }
    : copy[scope];

  return (
    <div className="page-stack">
      <PageHeader
        {...pageCopy}
        actions={
          <button className="button secondary" onClick={() => setShowBookmark(true)}>
            <BookmarkPlus size={17} />
            添加仓库
          </button>
        }
      />

      {showBookmark && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            addBookmark.mutate();
          }}
        >
          <div>
            <strong>添加 GitHub 仓库</strong>
            <span>粘贴 URL，或输入 owner/repository</span>
          </div>
          <input
            autoFocus
            value={bookmark}
            onChange={(event) => setBookmark(event.target.value)}
            placeholder="https://github.com/owner/repository"
            required
          />
          <button className="button primary" disabled={addBookmark.isPending}>
            {addBookmark.isPending ? "正在保存…" : "保存"}
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => setShowBookmark(false)}
          >
            取消
          </button>
          {addBookmark.isError && (
            <p className="form-error">无法读取这个仓库，请检查地址后重试。</p>
          )}
        </form>
      )}

      <div className="library-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索名称、简介或主题…"
          />
        </label>
        <div className="result-count">
          <SlidersHorizontal size={15} />
          {visible.length} 个项目
          {collections.data && <span>· {collections.data.collections.length} 个收藏集</span>}
        </div>
      </div>

      {repositories.isPending ? (
        <div className="repo-grid" aria-label="正在加载">
          {[0, 1, 2, 3].map((item) => (
            <div className="repo-card skeleton-card" key={item} />
          ))}
        </div>
      ) : visible.length ? (
        <div className="repo-grid">
          {visible.map((repository) => (
            <RepositoryCard
              repository={repository}
              key={repository.id}
              onUpdate={(changes) => update.mutate({ id: repository.id, changes })}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Search size={22} />
          </span>
          <h2>这里还很安静</h2>
          <p>
            {search
              ? "没有找到匹配的项目，试试更短的关键词。"
              : "从 GitHub 同步，或手动添加一个值得留下的仓库。"}
          </p>
        </div>
      )}
    </div>
  );
}
