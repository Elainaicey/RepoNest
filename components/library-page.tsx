"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronDown,
  CircleAlert,
  CloudOff,
  FolderOpen,
  Grid2X2,
  Heart,
  List,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Search,
  Sparkles,
  SlidersHorizontal,
  Tag as TagIcon,
  X
} from "lucide-react";
import { Dialog, Popover } from "radix-ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  addTagIds?: string[];
  removeTagIds?: string[];
  opened?: boolean;
};
type LibraryResponse = {
  repositories: Repository[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  facets: { languages: Array<{ name: string; count: number }> };
};

const PAGE_SIZE = 30;
const sorts: Sort[] = ["saved", "updated", "stars", "name", "rating"];
const statuses: ReadStatus[] = ["inbox", "exploring", "adopted"];

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export function LibraryPage({ scope, collectionId, collectionName }: {
  scope: RepositoryScope;
  collectionId?: string;
  collectionName?: string;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmark, setBookmark] = useState("");

  const search = searchParams.get("search") ?? "";
  const deferredSearch = useDebouncedValue(search, 280);
  const tag = searchParams.get("tag") ?? "";
  const language = searchParams.get("language") ?? "";
  const requestedStatus = searchParams.get("status") as ReadStatus | null;
  const status = requestedStatus && statuses.includes(requestedStatus) ? requestedStatus : "";
  const requestedSort = searchParams.get("sort") as Sort | null;
  const sort = requestedSort && sorts.includes(requestedSort) ? requestedSort : "saved";
  const view: View = searchParams.get("view") === "list" ? "list" : "grid";
  const repositoryId = searchParams.get("repository");

  const setParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === "sort" && value === "saved") || (key === "view" && value === "grid")) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const clearFilters = () => setParams({ search: null, tag: null, language: null, status: null });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filterKey = `${scope}|${collectionId ?? ""}|${deferredSearch}|${tag}|${language}|${status}|${sort}`;
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>(() => ({ key: filterKey, ids: new Set() }));
  const selectedIds = selection.key === filterKey ? selection.ids : new Set<string>();
  const setSelectedIds = (next: Set<string> | ((current: Set<string>) => Set<string>)) => {
    setSelection((current) => {
      const visibleSelection = current.key === filterKey ? current.ids : new Set<string>();
      return {
        key: filterKey,
        ids: typeof next === "function" ? next(visibleSelection) : next
      };
    });
  };

  const repositories = useInfiniteQuery({
    queryKey: ["repositories", scope, collectionId, deferredSearch, tag, language, status, sort],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        scope,
        sort,
        limit: String(PAGE_SIZE),
        offset: String(pageParam)
      });
      if (collectionId) params.set("collection", collectionId);
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (tag) params.set("tag", tag);
      if (language) params.set("language", language);
      if (status) params.set("status", status);
      return api<LibraryResponse>(`/api/repositories?${params.toString()}`, { signal });
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => lastPage.hasMore ? Number(lastPageParam) + lastPage.repositories.length : undefined,
    placeholderData: keepPreviousData
  });
  const deepRepository = useQuery({
    queryKey: ["repository", scope, repositoryId],
    queryFn: ({ signal }) => api<LibraryResponse>(`/api/repositories?scope=${scope}&repository=${repositoryId}&limit=1`, { signal }),
    enabled: Boolean(repositoryId)
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
      queryClient.invalidateQueries({ queryKey: ["repository"] }),
      queryClient.invalidateQueries({ queryKey: ["collections"] }),
      queryClient.invalidateQueries({ queryKey: ["tags"] }),
      queryClient.invalidateQueries({ queryKey: ["insights"] })
    ]);
  };
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Changes }) =>
      api(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: async (_result, variables) => {
      await invalidateLibrary();
      const isDrawerSave = variables.changes.note !== undefined || variables.changes.collectionId !== undefined || variables.changes.rating !== undefined || variables.changes.readStatus !== undefined || variables.changes.tagIds !== undefined;
      if (isDrawerSave) {
        setParams({ repository: null });
        notify("整理信息已保存", "分组、标签、状态与笔记已经更新。 ");
      } else if (variables.changes.archived !== undefined) {
        notify(variables.changes.archived ? "项目已归档" : "项目已移出归档");
      } else if (variables.changes.favorite !== undefined) {
        notify(variables.changes.favorite ? "已加入特别关注" : "已取消特别关注");
      }
    },
    onError: () => notify("保存失败", "草稿和当前页面都没有丢失，请稍后重试。", "error")
  });
  const markOpened = useMutation({
    mutationFn: (id: string) => api(`/api/repositories/${id}`, { method: "PATCH", body: JSON.stringify({ opened: true }) })
  });
  const removeRepository = useMutation({
    mutationFn: (id: string) => api(`/api/repositories/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setParams({ repository: null });
      await invalidateLibrary();
      notify("项目已从资料库移除", "后续同步不会自动把它重新加入；手动添加可以恢复。", "info");
    },
    onError: () => notify("无法移除项目", "没有修改任何数据，请稍后重试。", "error")
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
    onError: () => notify("批量操作失败", "没有修改任何项目，请重试。", "error")
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
    },
    onError: () => notify("无法添加这个仓库", "请确认地址、仓库权限和 GitHub 授权后重试。", "error")
  });

  const data = useMemo(() => repositories.data?.pages.flatMap((page) => page.repositories) ?? [], [repositories.data]);
  const firstPage = repositories.data?.pages[0];
  const total = firstPage?.total ?? data.length;
  const languages = firstPage?.facets.languages ?? [];
  const activeRepository = data.find((repository) => repository.id === repositoryId) ?? deepRepository.data?.repositories[0] ?? null;
  const resolvedCollectionName = collectionName ?? collections.data?.collections.find((item) => item.id === collectionId)?.name;
  const pageCopy = resolvedCollectionName
    ? { eyebrow: "COLLECTION", title: resolvedCollectionName, description: "围绕一条学习、工作或灵感线索组织起来的项目空间。" }
    : copy[scope];
  const activeFilterCount = [tag, language, status].filter(Boolean).length;
  const allSelected = data.length > 0 && data.every((repository) => selectedIds.has(repository.id));
  const activeTag = tags.data?.tags.find((item) => item.id === tag);
  const filterChips = [
    search ? { key: "search", label: `关键词：${search}`, clear: () => setParams({ search: null }) } : null,
    tag ? { key: "tag", label: `标签：${activeTag?.name ?? "已选择"}`, clear: () => setParams({ tag: null }) } : null,
    language ? { key: "language", label: `语言：${language}`, clear: () => setParams({ language: null }) } : null,
    status ? { key: "status", label: `状态：${status === "inbox" ? "待整理" : status === "exploring" ? "探索中" : "已采用"}`, clear: () => setParams({ status: null }) } : null
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const isSearchSettling = search !== deferredSearch;
  const hasMetadataError = collections.isError || tags.isError;
  const loadedPercent = total > 0 ? Math.min((data.length / total) * 100, 100) : 0;
  const emptyState = filterChips.length
    ? {
        icon: PackageSearch,
        title: "没有找到匹配的项目",
        description: "试试更短的关键词，或减少一个筛选条件。你的原始收藏不会受到影响。"
      }
    : scope === "archived"
      ? {
          icon: Archive,
          title: "归档空间还是空的",
          description: "把暂时不需要频繁查看的项目收进这里，资料和整理记录都会保留。"
        }
      : scope === "favorites"
        ? {
            icon: Heart,
            title: "还没有特别关注",
            description: "把真正影响当前工作或学习的项目加入关注，形成一份短而清晰的焦点清单。"
          }
        : scope === "bookmarks"
          ? {
              icon: Bookmark,
              title: "稍后收藏还是空的",
              description: "粘贴 GitHub 仓库地址，先收下线索，再决定是否深入探索或正式采用。"
            }
          : {
              icon: Sparkles,
              title: "建立你的第一份项目资料库",
              description: "从 GitHub 同步已有 Star，或手动收藏一个值得留下的仓库。"
            };
  const EmptyStateIcon = emptyState.icon;

  return (
    <div className="page-stack library-page library-workspace">
      <PageHeader
        {...pageCopy}
        actions={(
          <button className="button primary library-add-button" onClick={() => setBookmarkOpen(true)} type="button">
            <BookmarkPlus size={18} aria-hidden="true" /> 添加仓库
          </button>
        )}
      />

      <section className="library-command-center" aria-labelledby="library-command-title">
        <header className="library-command-heading">
          <div>
            <span className="library-command-kicker"><Sparkles size={13} aria-hidden="true" /> 探索与整理</span>
            <h2 id="library-command-title">找到下一项值得投入的项目</h2>
            <p>搜索会同时匹配仓库信息、标签与私人笔记。</p>
          </div>
          <div className="library-result-overview" aria-live="polite">
            <strong>{repositories.isPending ? "—" : total.toLocaleString()}</strong>
            <span>{filterChips.length ? "个匹配项目" : "个项目在当前空间"}</span>
          </div>
        </header>

        <div className="library-commandbar" role="search" aria-label="搜索与筛选资料库">
        <label className="search-field library-search-field">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">搜索资料库</span>
          <input
            ref={searchInput}
            type="search"
            value={search}
            onChange={(event) => setParams({ search: event.target.value || null })}
            placeholder="搜索项目、描述、笔记或标签…"
            aria-controls="repository-results"
            aria-keyshortcuts="/"
          />
          {isSearchSettling && <LoaderCircle className="spinning search-pending-icon" size={15} aria-label="正在搜索" />}
          {search && <button onClick={() => setParams({ search: null })} aria-label="清空搜索" type="button"><X size={16} /></button>}
          <kbd aria-hidden="true">/</kbd>
        </label>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className={activeFilterCount ? "button filter-button active" : "button filter-button"} type="button" aria-label={activeFilterCount ? `筛选，已启用 ${activeFilterCount} 项` : "筛选资料库"}>
              <SlidersHorizontal size={17} aria-hidden="true" /> 筛选
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="filter-popover library-filter-popover" align="end" sideOffset={10}>
              <div className="popover-heading">
                <span className="popover-heading-icon"><SlidersHorizontal size={16} aria-hidden="true" /></span>
                <span><strong>精确筛选</strong><small>组合条件，缩小探索范围</small></span>
              </div>
              {hasMetadataError && (
                <div className="filter-data-warning" role="status">
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>部分分类信息读取失败</span>
                  <button type="button" onClick={() => { collections.refetch(); tags.refetch(); }}>重试</button>
                </div>
              )}
              <label>
                <span>标签</span>
                <select value={tag} onChange={(event) => setParams({ tag: event.target.value || null })} disabled={tags.isPending}>
                  <option value="">{tags.isPending ? "正在读取标签…" : "全部标签"}</option>
                  {tags.data?.tags.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.count ?? 0}</option>)}
                </select>
              </label>
              <label>
                <span>编程语言</span>
                <select value={language} onChange={(event) => setParams({ language: event.target.value || null })}>
                  <option value="">全部语言</option>
                  {languages.map((item) => <option value={item.name} key={item.name}>{item.name} · {item.count}</option>)}
                </select>
              </label>
              <label>
                <span>推进状态</span>
                <select value={status} onChange={(event) => setParams({ status: event.target.value || null })}>
                  <option value="">全部状态</option><option value="inbox">待整理</option><option value="exploring">探索中</option><option value="adopted">已采用</option>
                </select>
              </label>
              <div className="filter-popover-actions">
                <button className="button ghost" onClick={clearFilters} type="button" disabled={activeFilterCount === 0}>重置</button>
                <Popover.Close asChild><button className="button secondary" type="button">完成</button></Popover.Close>
              </div>
              <Popover.Arrow className="popover-arrow" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <label className="sort-control library-sort-control">
          <span>排序方式</span>
          <select value={sort} onChange={(event) => setParams({ sort: event.target.value })}>
            <option value="saved">最近收藏</option><option value="updated">最近活跃</option><option value="stars">最多 Star</option><option value="rating">个人评分</option><option value="name">项目名称</option>
          </select>
        </label>
        <div className="view-switcher library-view-switcher" role="group" aria-label="结果布局">
          <button className={view === "grid" ? "active" : ""} onClick={() => setParams({ view: "grid" })} aria-label="切换到卡片视图" aria-pressed={view === "grid"} type="button" title="卡片视图"><Grid2X2 size={17} aria-hidden="true" /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setParams({ view: "list" })} aria-label="切换到列表视图" aria-pressed={view === "list"} type="button" title="列表视图"><List size={18} aria-hidden="true" /></button>
        </div>
        </div>

        {filterChips.length > 0 && (
          <div className="active-filter-chips library-filter-trail" aria-label="当前筛选条件">
            <span>正在查看</span>
            {filterChips.map((chip) => (
              <button className="active-filter-chip" key={chip.key} onClick={chip.clear} type="button" aria-label={`移除筛选：${chip.label}`}>
                {chip.label}<X size={14} aria-hidden="true" />
              </button>
            ))}
            <button className="clear-filter-chip" onClick={clearFilters} type="button">清除全部</button>
          </div>
        )}
      </section>

      <div className="library-summary library-result-toolbar">
        <button
          className="select-all library-select-all"
          onClick={() => setSelectedIds(allSelected ? new Set() : new Set(data.map((item) => item.id)))}
          role="checkbox"
          aria-checked={someSelected ? "mixed" : allSelected}
          aria-label={allSelected ? `取消选择已加载的 ${data.length} 个项目` : `选择已加载的 ${data.length} 个项目`}
          type="button"
          disabled={data.length === 0}
        >
          <span className="selection-box" data-selected={allSelected || someSelected} data-indeterminate={someSelected} aria-hidden="true">
            {allSelected && <Check size={12} />}
            {someSelected && <span />}
          </span>
          {allSelected ? "取消全选" : someSelected ? `已选择 ${selectedIds.size} 项` : "选择已加载项目"}
        </button>
        <div className="library-result-status" aria-live="polite" aria-atomic="true">
          {repositories.isFetching && !repositories.isFetchingNextPage ? (
            <><LoaderCircle className="spinning" size={14} aria-hidden="true" /> 正在刷新结果</>
          ) : total === data.length ? (
            `共 ${total.toLocaleString()} 个项目`
          ) : (
            `已显示 ${data.length.toLocaleString()} / ${total.toLocaleString()} 个项目`
          )}
        </div>
      </div>

      {repositories.isPending ? (
        <section className="library-results library-results-loading" id="repository-results" aria-busy="true" aria-label="正在加载资料库">
          <div className={view === "grid" ? "repo-grid" : "repo-list"}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div className="repo-card skeleton-card repo-card-skeleton" key={item} aria-hidden="true">
                <span className="skeleton-avatar" /><span className="skeleton-title" /><span className="skeleton-copy" /><span className="skeleton-copy short" /><span className="skeleton-footer" />
              </div>
            ))}
          </div>
          <span className="sr-only" role="status">正在读取你的项目资料库，请稍候。</span>
        </section>
      ) : repositories.isError ? (
        <section className="query-error-state library-state-panel" id="repository-results" role="alert">
          <span className="state-visual error" aria-hidden="true"><CloudOff size={26} /></span>
          <span className="state-eyebrow">连接中断</span>
          <h2>暂时无法读取资料库</h2>
          <p>你的收藏与整理记录仍然安全。请检查网络或服务状态，然后重新加载。</p>
          <div className="state-actions">
            <button className="button primary" onClick={() => repositories.refetch()} type="button"><RefreshCw size={16} aria-hidden="true" />重新加载</button>
            <button className="button ghost" onClick={() => router.push("/dashboard")} type="button">返回概览</button>
          </div>
        </section>
      ) : data.length ? (
        <section className="library-results" id="repository-results" aria-labelledby="library-results-title" aria-busy={repositories.isFetching || isSearchSettling} data-updating={repositories.isFetching || isSearchSettling}>
          <h2 className="sr-only" id="library-results-title">项目结果</h2>
          <div className={view === "grid" ? "repo-grid" : "repo-list"} data-layout={view}>
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
                onOpen={() => { update.reset(); setParams({ repository: repository.id }); }}
                onUpdate={(changes) => update.mutate({ id: repository.id, changes })}
              />
            ))}
          </div>
          {repositories.hasNextPage && (
            <div className="load-more-row library-pagination">
              <div className="load-more-progress" aria-hidden="true"><span style={{ width: `${loadedPercent}%` }} /></div>
              <p>已浏览 {data.length.toLocaleString()} 项，还有 {Math.max(total - data.length, 0).toLocaleString()} 项等待探索</p>
              <button className="button secondary" onClick={() => repositories.fetchNextPage()} disabled={repositories.isFetchingNextPage} type="button">
                {repositories.isFetchingNextPage ? <><LoaderCircle className="spinning" size={17} aria-hidden="true" />正在加载…</> : <><ArrowDown size={17} aria-hidden="true" />继续加载</>}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="empty-state library-state-panel" id="repository-results">
          <span className="state-visual empty" aria-hidden="true"><EmptyStateIcon size={26} /></span>
          <span className="state-eyebrow">{filterChips.length ? "换个探索角度" : "从这里开始"}</span>
          <h2>{emptyState.title}</h2>
          <p>{emptyState.description}</p>
          <div className="empty-actions state-actions">
            {filterChips.length ? (
              <button className="button secondary" onClick={clearFilters} type="button"><SlidersHorizontal size={16} aria-hidden="true" />重置搜索与筛选</button>
            ) : (
              <>
                <button className="button primary" onClick={() => setBookmarkOpen(true)} type="button"><BookmarkPlus size={17} aria-hidden="true" />添加仓库</button>
                <button className="button secondary" onClick={() => router.push("/dashboard")} type="button">前往同步中心</button>
              </>
            )}
          </div>
        </section>
      )}

      {selectedIds.size > 0 && (
        <aside className="bulk-bar library-bulk-dock" role="toolbar" aria-label={`对已选择的 ${selectedIds.size} 个项目执行批量操作`} aria-busy={bulkUpdate.isPending}>
          <div className="bulk-selection-summary">
            <span>{selectedIds.size}</span>
            <strong>个项目</strong>
            <small>批量整理</small>
          </div>
          <span className="bulk-divider" aria-hidden="true" />
          <div className="bulk-action-group">
            <label>
              <FolderOpen size={16} aria-hidden="true" />
              <span className="sr-only">移动到收藏集</span>
              <select
                aria-label="将已选项目移动到收藏集"
                disabled={bulkUpdate.isPending || collections.isPending}
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) bulkUpdate.mutate({ collectionId: event.target.value === "none" ? null : event.target.value });
                  event.target.value = "";
                }}
              >
                <option value="" disabled>{collections.isPending ? "读取收藏集…" : "移动到收藏集"}</option>
                <option value="none">未分组</option>
                {collections.data?.collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <Check size={16} aria-hidden="true" />
              <span className="sr-only">设置推进状态</span>
              <select
                aria-label="设置已选项目的推进状态"
                disabled={bulkUpdate.isPending}
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) bulkUpdate.mutate({ readStatus: event.target.value as ReadStatus });
                  event.target.value = "";
                }}
              >
                <option value="" disabled>设置状态</option><option value="inbox">待整理</option><option value="exploring">探索中</option><option value="adopted">已采用</option>
              </select>
            </label>
            <label>
              <TagIcon size={16} aria-hidden="true" />
              <span className="sr-only">添加或清空标签</span>
              <select
                aria-label="为已选项目添加或清空标签"
                disabled={bulkUpdate.isPending || tags.isPending}
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) bulkUpdate.mutate(event.target.value === "clear" ? { tagIds: [] } : { addTagIds: [event.target.value] });
                  event.target.value = "";
                }}
              >
                <option value="" disabled>{tags.isPending ? "读取标签…" : "添加标签"}</option>
                <option value="clear">清空全部标签</option>
                {tags.data?.tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <span className="bulk-divider" aria-hidden="true" />
          <div className="bulk-quick-actions">
            <button disabled={bulkUpdate.isPending} onClick={() => bulkUpdate.mutate({ favorite: true })} type="button"><Heart size={16} aria-hidden="true" /> 关注</button>
            <button disabled={bulkUpdate.isPending} onClick={() => bulkUpdate.mutate({ archived: true })} type="button"><Archive size={16} aria-hidden="true" /> 归档</button>
          </div>
          {bulkUpdate.isPending && <LoaderCircle className="spinning bulk-pending-icon" size={17} aria-label="正在更新所选项目" />}
          <button className="bulk-close" onClick={() => setSelectedIds(new Set())} aria-label="取消全部选择" type="button" disabled={bulkUpdate.isPending}><X size={17} aria-hidden="true" /></button>
        </aside>
      )}

      <Dialog.Root open={bookmarkOpen} onOpenChange={setBookmarkOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay bookmark-dialog-overlay" />
          <Dialog.Content className="dialog-card compact-dialog bookmark-dialog" aria-describedby="bookmark-dialog-description">
            <div className="dialog-icon bookmark-dialog-icon"><BookmarkPlus size={21} aria-hidden="true" /></div>
            <span className="dialog-eyebrow">快速收藏</span>
            <Dialog.Title>添加 GitHub 仓库</Dialog.Title>
            <Dialog.Description id="bookmark-dialog-description">无需先 Star。RepoNest 会读取公开项目资料，并把它加入当前资料库。</Dialog.Description>
            <form className="bookmark-dialog-form" onSubmit={(event) => { event.preventDefault(); addBookmark.mutate(); }}>
              <label className="field-label">
                <span>仓库地址或 owner/name</span>
                <div className="repository-url-field">
                  <span aria-hidden="true">github.com/</span>
                  <input
                    autoFocus
                    value={bookmark}
                    onChange={(event) => { setBookmark(event.target.value); if (addBookmark.isError) addBookmark.reset(); }}
                    placeholder="owner/repository"
                    required
                    spellCheck="false"
                    autoComplete="off"
                    aria-invalid={addBookmark.isError}
                    aria-describedby={addBookmark.isError ? "bookmark-error" : "bookmark-help"}
                  />
                </div>
                <small id="bookmark-help">支持完整 GitHub URL，私有仓库需要当前授权可访问。</small>
              </label>
              {addBookmark.isError && <p className="form-error" id="bookmark-error" role="alert"><CircleAlert size={15} aria-hidden="true" />无法读取这个仓库，请确认地址和 GitHub 授权后重试。</p>}
              <div className="dialog-actions">
                <Dialog.Close asChild><button className="button ghost" type="button" disabled={addBookmark.isPending}>取消</button></Dialog.Close>
                <button className="button primary" disabled={addBookmark.isPending || !bookmark.trim()}>
                  {addBookmark.isPending ? <><LoaderCircle className="spinning" size={16} aria-hidden="true" />正在读取…</> : <><BookmarkPlus size={16} aria-hidden="true" />添加到资料库</>}
                </button>
              </div>
            </form>
            <Dialog.Close asChild><button className="dialog-close icon-button" aria-label="关闭添加仓库对话框" type="button" disabled={addBookmark.isPending}><X size={18} aria-hidden="true" /></button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {repositoryId && deepRepository.isPending && !activeRepository && (
        <div className="drawer-loading drawer-load-toast" role="status"><LoaderCircle className="spinning" size={20} aria-hidden="true" /><span><strong>正在打开项目</strong><small>读取整理信息与 GitHub 数据…</small></span></div>
      )}
      {repositoryId && !activeRepository && (deepRepository.isError || deepRepository.isSuccess) && (
        <div className="drawer-loading drawer-load-toast error" role="alert">
          <CircleAlert size={19} aria-hidden="true" />
          <span><strong>{deepRepository.isError ? "无法打开项目详情" : "这个项目已不在资料库中"}</strong><small>{deepRepository.isError ? "请检查连接后重试。" : "链接可能已经失效。"}</small></span>
          {deepRepository.isError && <button type="button" onClick={() => deepRepository.refetch()} aria-label="重新读取项目详情"><RefreshCw size={15} aria-hidden="true" /></button>}
          <button type="button" onClick={() => setParams({ repository: null })} aria-label="关闭提示"><X size={15} aria-hidden="true" /></button>
        </div>
      )}
      {activeRepository && (
        <RepositoryDrawer
          key={activeRepository.id}
          repository={activeRepository}
          collections={collections.data?.collections ?? []}
          tags={tags.data?.tags ?? []}
          open
          onOpenChange={(next) => { if (!next) setParams({ repository: null }); }}
          onSave={(changes) => update.mutate({ id: activeRepository.id, changes })}
          onVisit={() => markOpened.mutate(activeRepository.id)}
          onDelete={() => removeRepository.mutate(activeRepository.id)}
          saving={update.isPending}
          deleting={removeRepository.isPending}
          saveError={update.isError}
        />
      )}
    </div>
  );
}
