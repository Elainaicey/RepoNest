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
  BookmarkPlus,
  Check,
  ChevronDown,
  CircleAlert,
  Grid2X2,
  Heart,
  List,
  LoaderCircle,
  Search,
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
    activeTag ? { key: "tag", label: `标签：${activeTag.name}`, clear: () => setParams({ tag: null }) } : null,
    language ? { key: "language", label: `语言：${language}`, clear: () => setParams({ language: null }) } : null,
    status ? { key: "status", label: `状态：${status === "inbox" ? "待整理" : status === "exploring" ? "探索中" : "已采用"}`, clear: () => setParams({ status: null }) } : null
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  return (
    <div className="page-stack library-page">
      <PageHeader
        {...pageCopy}
        actions={<button className="button primary" onClick={() => setBookmarkOpen(true)}><BookmarkPlus size={18} /> 添加仓库</button>}
      />

      <section className="library-commandbar" aria-label="资料库工具栏">
        <label className="search-field">
          <Search size={19} />
          <input ref={searchInput} value={search} onChange={(event) => setParams({ search: event.target.value || null })} placeholder="搜索项目、笔记或标签…" />
          {search && <button onClick={() => setParams({ search: null })} aria-label="清空搜索"><X size={16} /></button>}
          <kbd>/</kbd>
        </label>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className={activeFilterCount ? "button filter-button active" : "button filter-button"}>
              <SlidersHorizontal size={17} /> 筛选
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              <ChevronDown size={15} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="filter-popover" align="end" sideOffset={10}>
              <div className="popover-heading"><strong>缩小范围</strong><span>组合条件精准定位收藏</span></div>
              <label><span>标签</span><select value={tag} onChange={(event) => setParams({ tag: event.target.value || null })}><option value="">全部标签</option>{tags.data?.tags.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.count}</option>)}</select></label>
              <label><span>编程语言</span><select value={language} onChange={(event) => setParams({ language: event.target.value || null })}><option value="">全部语言</option>{languages.map((item) => <option value={item.name} key={item.name}>{item.name} · {item.count}</option>)}</select></label>
              <label><span>处理状态</span><select value={status} onChange={(event) => setParams({ status: event.target.value || null })}><option value="">全部状态</option><option value="inbox">待整理</option><option value="exploring">探索中</option><option value="adopted">已采用</option></select></label>
              <button className="button ghost full" onClick={clearFilters}>重置筛选</button>
              <Popover.Arrow className="popover-arrow" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <label className="sort-control">
          <span>排序</span>
          <select value={sort} onChange={(event) => setParams({ sort: event.target.value })}>
            <option value="saved">最近收藏</option><option value="updated">最近活跃</option><option value="stars">最多 Star</option><option value="rating">个人评分</option><option value="name">项目名称</option>
          </select>
        </label>
        <div className="view-switcher" role="group" aria-label="视图">
          <button className={view === "grid" ? "active" : ""} onClick={() => setParams({ view: "grid" })} aria-label="卡片视图" aria-pressed={view === "grid"}><Grid2X2 size={17} /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setParams({ view: "list" })} aria-label="列表视图" aria-pressed={view === "list"}><List size={18} /></button>
        </div>
      </section>

      {filterChips.length > 0 && <div className="active-filter-chips" aria-label="当前筛选条件">{filterChips.map((chip) => <button className="active-filter-chip" key={chip.key} onClick={chip.clear}>{chip.label}<X size={14} /></button>)}<button className="clear-filter-chip" onClick={clearFilters}>清除全部</button></div>}

      <div className="library-summary">
        <button className="select-all" onClick={() => setSelectedIds(allSelected ? new Set() : new Set(data.map((item) => item.id)))} role="checkbox" aria-checked={allSelected}>
          <span data-selected={allSelected} /> {allSelected ? "取消全选" : "选择当前页"}
        </button>
        <span aria-live="polite">{repositories.isFetching && !repositories.isFetchingNextPage ? "正在更新…" : total === data.length ? `${total} 个项目` : `已显示 ${data.length} / ${total} 个项目`}</span>
      </div>

      {repositories.isPending ? (
        <div className={view === "grid" ? "repo-grid" : "repo-list"} aria-label="正在加载">
          {[0, 1, 2, 3, 4, 5].map((item) => <div className="repo-card skeleton-card" key={item} />)}
        </div>
      ) : repositories.isError ? (
        <div className="query-error-state" role="alert"><CircleAlert className="query-error-icon" size={24} /><h2>暂时无法读取资料库</h2><p>你的收藏没有丢失。请检查网络或服务状态后重新加载。</p><button className="button secondary" onClick={() => repositories.refetch()}>重新加载</button></div>
      ) : data.length ? (
        <>
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
                onOpen={() => { update.reset(); setParams({ repository: repository.id }); }}
                onUpdate={(changes) => update.mutate({ id: repository.id, changes })}
              />
            ))}
          </div>
          {repositories.hasNextPage && <div className="load-more-row"><button className="button secondary" onClick={() => repositories.fetchNextPage()} disabled={repositories.isFetchingNextPage}>{repositories.isFetchingNextPage ? <><LoaderCircle className="spinning" size={17} />正在加载…</> : `继续加载（剩余 ${Math.max(total - data.length, 0)} 项）`}</button></div>}
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Search size={23} /></span>
          <h2>{filterChips.length ? "没有符合条件的项目" : scope === "archived" ? "还没有归档项目" : scope === "favorites" ? "还没有特别关注" : "这里还很安静"}</h2>
          <p>{filterChips.length ? "调整筛选条件，或者换一个更短的关键词。" : scope === "archived" ? "不再需要频繁查看的项目可以归档到这里。" : "从 GitHub 同步，或手动添加一个值得留下的仓库。"}</p>
          <div className="empty-actions">{filterChips.length ? <button className="button secondary" onClick={clearFilters}>重置搜索与筛选</button> : <><button className="button primary" onClick={() => setBookmarkOpen(true)}><BookmarkPlus size={17} />添加仓库</button><button className="button secondary" onClick={() => router.push("/dashboard")}>前往同步中心</button></>}</div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bulk-bar" role="toolbar" aria-label="批量操作" aria-busy={bulkUpdate.isPending}>
          <div><span>{selectedIds.size}</span><strong>已选择</strong></div>
          <span className="bulk-divider" />
          <label><BookmarkPlus size={16} /><select disabled={bulkUpdate.isPending} defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate.mutate({ collectionId: event.target.value === "none" ? null : event.target.value }); event.target.value = ""; }}><option value="" disabled>移动到分组</option><option value="none">未分组</option>{collections.data?.collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><Check size={16} /><select disabled={bulkUpdate.isPending} defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate.mutate({ readStatus: event.target.value as ReadStatus }); event.target.value = ""; }}><option value="" disabled>设置状态</option><option value="inbox">待整理</option><option value="exploring">探索中</option><option value="adopted">已采用</option></select></label>
          <label><TagIcon size={16} /><select disabled={bulkUpdate.isPending} defaultValue="" onChange={(event) => { if (event.target.value) bulkUpdate.mutate(event.target.value === "clear" ? { tagIds: [] } : { addTagIds: [event.target.value] }); event.target.value = ""; }}><option value="" disabled>添加标签</option><option value="clear">清空全部标签</option>{tags.data?.tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={bulkUpdate.isPending} onClick={() => bulkUpdate.mutate({ favorite: true })}><Heart size={16} /> 关注</button>
          <button disabled={bulkUpdate.isPending} onClick={() => bulkUpdate.mutate({ archived: true })}><Archive size={16} /> 归档</button>
          <button className="bulk-close" onClick={() => setSelectedIds(new Set())} aria-label="取消选择"><X size={17} /></button>
        </div>
      )}

      <Dialog.Root open={bookmarkOpen} onOpenChange={setBookmarkOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-card compact-dialog">
            <div className="dialog-icon"><BookmarkPlus size={21} /></div>
            <Dialog.Title>添加 GitHub 仓库</Dialog.Title>
            <Dialog.Description>无需先 Star，粘贴项目地址即可把它收进 RepoNest。</Dialog.Description>
            <form onSubmit={(event) => { event.preventDefault(); addBookmark.mutate(); }}>
              <label className="field-label"><span>仓库地址</span><input autoFocus value={bookmark} onChange={(event) => setBookmark(event.target.value)} placeholder="github.com/owner/repository" required /></label>
              {addBookmark.isError && <p className="form-error" role="alert">无法读取这个仓库，请确认地址和 GitHub 授权后重试。</p>}
              <div className="dialog-actions"><Dialog.Close asChild><button className="button ghost" type="button">取消</button></Dialog.Close><button className="button primary" disabled={addBookmark.isPending}>{addBookmark.isPending ? "读取中…" : "添加到资料库"}</button></div>
            </form>
            <Dialog.Close asChild><button className="dialog-close icon-button" aria-label="关闭"><X size={18} /></button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {repositoryId && deepRepository.isPending && !activeRepository && <div className="drawer-loading" role="status"><LoaderCircle className="spinning" size={20} />正在读取项目详情…</div>}
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
