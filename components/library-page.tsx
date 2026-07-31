"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BookmarkPlus,
  Check,
  ChevronDown,
  Grid2X2,
  Heart,
  List,
  Search,
  SlidersHorizontal,
  Tag as TagIcon,
  X
} from "lucide-react";
import { Dialog, Popover } from "radix-ui";
import { useDeferredValue, useMemo, useState } from "react";
import { useToast } from "@/app/providers";
import { api } from "@/lib/api";
import type { Collection, ReadStatus, Repository, RepositoryScope, Tag } from "@/lib/types";
import { PageHeader } from "./page-header";
import { RepositoryCard } from "./repository-card";
import { RepositoryDrawer } from "./repository-drawer";

const copy: Record<RepositoryScope, { eyebrow: string; title: string; description: string }> = {
  all: { eyebrow: "LIBRARY", title: "全部收藏", description: "把星标、稍后阅读和个人整理汇聚为一套可执行的资料库。" },
  stars: { eyebrow: "GITHUB", title: "GitHub 星标", description: "自动同步 GitHub Star，再用分组、标签和状态建立自己的知识结构。" },
  bookmarks: { eyebrow: "BOOKMARKS", title: "稍后收藏", description: "先收下尚未 Star 的项目，再决定是否深入探索或正式采用。" },
  favorites: { eyebrow: "FOCUS", title: "特别关注", description: "保持一份短而有力的清单，聚焦真正影响当前工作的项目。" },
  archived: { eyebrow: "ARCHIVE", title: "归档", description: "收起已结束的线索，同时完整保留分组、标签、评分和笔记。" }
};

type Sort = "saved" | "updated" | "stars" | "name" | "rating";
type View = "grid" | "list";
type Changes = Partial<Pick<Repository, "favorite" | "archived" | "note" | "collectionId" | "rating" | "readStatus">> & {
  tagIds?: string[];
  opened?: boolean;
};

export function LibraryPage({ scope, collectionId, collectionName }: {
  scope: RepositoryScope;
  collectionId?: string;
  collectionName?: string;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [tag, setTag] = useState("");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState<ReadStatus | "">("");
  const [sort, setSort] = useState<Sort>("saved");
  const [view, setView] = useState<View>("grid");
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmark, setBookmark] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeRepository, setActiveRepository] = useState<Repository | null>(null);

  const repositoryParams = new URLSearchParams({ scope, sort });
  if (collectionId) repositoryParams.set("collection", collectionId);
  if (deferredSearch.trim()) repositoryParams.set("search", deferredSearch.trim());
  if (tag) repositoryParams.set("tag", tag);
  if (language) repositoryParams.set("language", language);
  if (status) repositoryParams.set("status", status);

  const repositories = useQuery({
    queryKey: ["repositories", scope, collectionId, deferredSearch, tag, language, status, sort],
    queryFn: () => api<{ repositories: Repository[] }>(`/api/repositories?${repositoryParams.toString()}`)
  });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<{ collections: Collection[] }>("/api/collections")
  });
  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api<{ tags: Tag[] }>("/api/tags")
  });

  const invalidateLibrary = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["repositories"] }),
      queryClient.invalidateQueries({ queryKey: ["collections"] }),
      queryClient.invalidateQueries({ queryKey: ["tags"] }),
      queryClient.invalidateQueries({ queryKey: ["insights"] })
    ]);
  };
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Changes }) =>
      api(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: async () => {
      await invalidateLibrary();
      setActiveRepository(null);
      notify("整理信息已保存", "分组、标签与笔记已经更新。 ");
    },
    onError: () => notify("保存失败", "请稍后重试，或检查服务端日志。")
  });
  const bulkUpdate = useMutation({
    mutationFn: (changes: Changes) => api("/api/repositories/bulk", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], changes })
    }),
    onSuccess: async () => {
      const count = selectedIds.size;
      setSelectedIds(new Set());
      await invalidateLibrary();
      notify(`已更新 ${count} 个项目`);
    },
    onError: () => notify("批量操作失败", "没有修改任何项目，请重试。")
  });
  const addBookmark = useMutation({
    mutationFn: () => api("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ repository: bookmark, collectionId: collectionId ?? null })
    }),
    onSuccess: async () => {
      setBookmark("");
      setBookmarkOpen(false);
      await invalidateLibrary();
      notify("仓库已收藏", "RepoNest 已从 GitHub 读取并保存项目资料。")
    }
  });

  const data = useMemo(() => repositories.data?.repositories ?? [], [repositories.data]);
  const languages = useMemo(
    () => [...new Set(data.map((repository) => repository.language).filter(Boolean) as string[])].sort(),
    [data]
  );
  const resolvedCollectionName = collectionName ?? collections.data?.collections.find((item) => item.id === collectionId)?.name;
  const pageCopy = resolvedCollectionName
    ? { eyebrow: "COLLECTION", title: resolvedCollectionName, description: "围绕一条学习、工作或灵感线索组织起来的项目空间。" }
    : copy[scope];
  const activeFilterCount = [tag, language, status].filter(Boolean).length;
  const allSelected = data.length > 0 && data.every((repository) => selectedIds.has(repository.id));

  return (
    <div className="page-stack library-page">
      <PageHeader
        {...pageCopy}
        actions={
          <button className="button primary" onClick={() => setBookmarkOpen(true)}>
            <BookmarkPlus size={17} /> 添加仓库
          </button>
        }
      />

      <section className="library-commandbar" aria-label="资料库工具栏">
        <label className="search-field">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索项目、笔记或标签…" />
          {search && <button onClick={() => setSearch("")} aria-label="清空搜索"><X size={15} /></button>}
          <kbd>⌘ K</kbd>
        </label>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className={activeFilterCount ? "button filter-button active" : "button filter-button"}>
              <SlidersHorizontal size={16} /> 筛选
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              <ChevronDown size={14} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="filter-popover" align="end" sideOffset={10}>
              <div className="popover-heading"><strong>缩小范围</strong><span>组合条件精准定位收藏</span></div>
              <label><span>标签</span><select value={tag} onChange={(event) => setTag(event.target.value)}><option value="">全部标签</option>{tags.data?.tags.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.count}</option>)}</select></label>
              <label><span>编程语言</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="">全部语言</option>{languages.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
              <label><span>处理状态</span><select value={status} onChange={(event) => setStatus(event.target.value as ReadStatus | "")}><option value="">全部状态</option><option value="inbox">待整理</option><option value="exploring">探索中</option><option value="adopted">已采用</option></select></label>
              <button className="button ghost full" onClick={() => { setTag(""); setLanguage(""); setStatus(""); }}>重置筛选</button>
              <Popover.Arrow className="popover-arrow" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <label className="sort-control">
          <span>排序</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="saved">最近收藏</option><option value="updated">最近活跃</option><option value="stars">最多 Star</option><option value="rating">个人评分</option><option value="name">项目名称</option>
          </select>
        </label>
        <div className="view-switcher" role="group" aria-label="视图">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="卡片视图"><Grid2X2 size={16} /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="列表视图"><List size={17} /></button>
        </div>
      </section>

      <div className="library-summary">
        <button className="select-all" onClick={() => setSelectedIds(allSelected ? new Set() : new Set(data.map((item) => item.id)))}>
          <span data-selected={allSelected} /> {allSelected ? "取消全选" : "全选"}
        </button>
        <span>{repositories.isFetching ? "正在更新…" : `${data.length} 个项目`}</span>
        {activeFilterCount > 0 && <button onClick={() => { setTag(""); setLanguage(""); setStatus(""); }}>清除全部条件 <X size={13} /></button>}
      </div>

      {repositories.isPending ? (
        <div className={view === "grid" ? "repo-grid" : "repo-list"} aria-label="正在加载">
          {[0, 1, 2, 3, 4, 5].map((item) => <div className="repo-card skeleton-card" key={item} />)}
        </div>
      ) : data.length ? (
        <div className={view === "grid" ? "repo-grid" : "repo-list"}>
          {data.map((repository) => (
            <RepositoryCard
              repository={repository}
              key={repository.id}
              selected={selectedIds.has(repository.id)}
              view={view}
              onSelect={() => setSelectedIds((current) => {
                const next = new Set(current);
                if (next.has(repository.id)) next.delete(repository.id); else next.add(repository.id);
                return next;
              })}
              onOpen={() => setActiveRepository(repository)}
              onUpdate={(changes) => update.mutate({ id: repository.id, changes })}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Search size={22} /></span>
          <h2>{activeFilterCount || search ? "没有符合条件的项目" : "这里还很安静"}</h2>
          <p>{activeFilterCount || search ? "调整筛选条件，或者换一个更短的关键词。" : "从 GitHub 同步，或手动添加一个值得留下的仓库。"}</p>
          {(activeFilterCount > 0 || search) && <button className="button secondary" onClick={() => { setSearch(""); setTag(""); setLanguage(""); setStatus(""); }}>重置搜索与筛选</button>}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bulk-bar" role="toolbar" aria-label="批量操作">
          <div><span>{selectedIds.size}</span><strong>已选择</strong></div>
          <span className="bulk-divider" />
          <label><BookmarkPlus size={15} /><select defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate.mutate({ collectionId: event.target.value === "none" ? null : event.target.value }); event.target.value = ""; }}><option value="" disabled>移动到分组</option><option value="none">未分组</option>{collections.data?.collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><Check size={15} /><select defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate.mutate({ readStatus: event.target.value as ReadStatus }); event.target.value = ""; }}><option value="" disabled>设置状态</option><option value="inbox">待整理</option><option value="exploring">探索中</option><option value="adopted">已采用</option></select></label>
          <label><TagIcon size={15} /><select defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate.mutate({ tagIds: event.target.value === "none" ? [] : [event.target.value] }); event.target.value = ""; }}><option value="" disabled>设置标签</option><option value="none">清空标签</option>{tags.data?.tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button onClick={() => bulkUpdate.mutate({ favorite: true })}><Heart size={15} /> 关注</button>
          <button onClick={() => bulkUpdate.mutate({ archived: true })}><Archive size={15} /> 归档</button>
          <button className="bulk-close" onClick={() => setSelectedIds(new Set())} aria-label="取消选择"><X size={16} /></button>
        </div>
      )}

      <Dialog.Root open={bookmarkOpen} onOpenChange={setBookmarkOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-card compact-dialog">
            <div className="dialog-icon"><BookmarkPlus size={20} /></div>
            <Dialog.Title>添加 GitHub 仓库</Dialog.Title>
            <Dialog.Description>无需先 Star，粘贴项目地址即可把它收进 RepoNest。</Dialog.Description>
            <form onSubmit={(event) => { event.preventDefault(); addBookmark.mutate(); }}>
              <label className="field-label"><span>仓库地址</span><input autoFocus value={bookmark} onChange={(event) => setBookmark(event.target.value)} placeholder="github.com/owner/repository" required /></label>
              {addBookmark.isError && <p className="form-error">无法读取这个仓库，请确认地址和 GitHub 授权后重试。</p>}
              <div className="dialog-actions"><Dialog.Close asChild><button className="button ghost" type="button">取消</button></Dialog.Close><button className="button primary" disabled={addBookmark.isPending}>{addBookmark.isPending ? "读取中…" : "添加到资料库"}</button></div>
            </form>
            <Dialog.Close asChild><button className="dialog-close icon-button" aria-label="关闭"><X size={17} /></button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {activeRepository && (
        <RepositoryDrawer
          key={activeRepository.id}
          repository={activeRepository}
          collections={collections.data?.collections ?? []}
          tags={tags.data?.tags ?? []}
          open
          onOpenChange={(open) => { if (!open) setActiveRepository(null); }}
          onSave={(changes) => update.mutate({ id: activeRepository.id, changes })}
          saving={update.isPending}
        />
      )}
    </div>
  );
}
