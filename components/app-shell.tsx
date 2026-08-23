"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Boxes,
  CircleDot,
  Command,
  GitBranch as Github,
  Heart,
  LayoutDashboard,
  Library,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  WifiOff,
  X
} from "lucide-react";
import { Dialog, Popover } from "radix-ui";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme, useToast } from "@/app/providers";
import { api, ApiError } from "@/lib/api";
import { demoCollections, demoRepositories, demoUser } from "@/lib/demo-data";
import { relativeTime } from "@/lib/format";
import type { Collection, Repository, User } from "@/lib/types";
import { Brand } from "./brand";
import { ParticleField } from "./particle-field";

const navigation = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/library", label: "全部收藏", icon: Library },
  { href: "/library?status=inbox", label: "待整理", icon: CircleDot },
  { href: "/stars", label: "GitHub 星标", icon: Github },
  { href: "/bookmarks", label: "稍后收藏", icon: Bookmark },
  { href: "/favorites", label: "特别关注", icon: Heart },
  { href: "/archived", label: "归档", icon: Archive }
];

const intelligenceNavigation = [
  { href: "/tags", label: "标签", icon: Tags },
  { href: "/insights", label: "收藏洞察", icon: BarChart3 }
];

type SyncStatus = {
  state: "idle" | "running" | "succeeded" | "failed";
  reason?: "initial" | "manual" | "scheduled";
  startedAt?: string;
  finishedAt?: string;
  count?: number;
  truncated?: boolean;
  error?: "github_sync_failed";
  lastSyncedAt?: string | null;
};

function Shell({ user, collections, children, demo = false }: {
  user: User;
  collections: Collection[];
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shortcut = "⌘ / Ctrl K";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchNeedle = commandSearch.trim().toLocaleLowerCase();
  const commands = useMemo(() => [
    ...navigation,
    ...intelligenceNavigation,
    ...collections.map((collection) => ({ href: `/collections/${collection.id}`, label: collection.name, icon: Boxes })),
    { href: "/settings", label: "设置", icon: Settings }
  ].filter((item) => item.label.toLocaleLowerCase().includes(searchNeedle)), [collections, searchNeedle]);

  const repositorySearch = useQuery({
    queryKey: ["repository-search", searchNeedle],
    queryFn: ({ signal }) => api<{ repositories: Repository[] }>(
      `/api/repositories?scope=all&sort=updated&limit=6&search=${encodeURIComponent(commandSearch.trim())}`,
      { signal }
    ),
    enabled: commandOpen && !demo && searchNeedle.length >= 2,
    staleTime: 15_000
  });
  const repositoryResults = demo
    ? demoRepositories.filter((repository) =>
        `${repository.fullName} ${repository.description ?? ""} ${repository.tags.map((tag) => tag.name).join(" ")}`
          .toLocaleLowerCase()
          .includes(searchNeedle)
      ).slice(0, 6)
    : repositorySearch.data?.repositories ?? [];

  const syncStatus = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => api<SyncStatus>("/api/sync/status"),
    enabled: !demo,
    refetchInterval: (query) => query.state.data?.state === "running" ? 2_000 : 30_000
  });
  const sync = useMutation({
    mutationFn: () => api<{ count: number; syncedAt: string; truncated: boolean }>("/api/sync", { method: "POST" }),
    onMutate: () => queryClient.setQueryData<SyncStatus>(["sync-status"], () => ({
      state: "running",
      reason: "manual",
      startedAt: new Date().toISOString(),
    })),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["insights"] }),
        queryClient.invalidateQueries({ queryKey: ["sync-status"] })
      ]);
      notify(
        result.truncated ? "同步完成，但已达到同步上限" : "GitHub 同步完成",
        `已核对 ${result.count} 个星标${result.truncated ? "，未改动未拉取到的旧项目" : "。"}`,
        result.truncated ? "info" : "success"
      );
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      notify(
        error instanceof ApiError && error.status === 409 ? "同步已经在进行" : "同步失败",
        error instanceof ApiError && error.status === 409 ? "无需重复启动，请稍候查看结果。" : "GitHub 暂时不可用，请稍后重试。",
        error instanceof ApiError && error.status === 409 ? "info" : "error"
      );
    }
  });

  const go = (href: string) => {
    setCommandOpen(false);
    setCommandSearch("");
    router.push(demo ? "/login" : href);
  };
  const goToRepository = (repository: Repository) => {
    setCommandOpen(false);
    setCommandSearch("");
    if (demo) {
      window.open(repository.url, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(`/library?repository=${repository.id}`);
  };
  const isActive = (href: string) => {
    const [path, query = ""] = href.split("?");
    if (pathname !== path && !(path !== "/" && pathname.startsWith(`${path}/`))) return false;
    const expected = new URLSearchParams(query);
    if (expected.size > 0) return [...expected].every(([key, value]) => searchParams.get(key) === value);
    if (path === "/library" && searchParams.get("status")) return false;
    return true;
  };
  const itemClass = (href: string) => !demo && isActive(href) ? "nav-item active" : "nav-item";
  const currentSync = syncStatus.data;
  const syncing = sync.isPending || currentSync?.state === "running";
  const syncHasError = currentSync?.state === "failed";
  const syncLabel = syncing ? "正在同步" : syncHasError ? "同步异常" : user.lastSyncedAt ? `已同步${relativeTime(user.lastSyncedAt)}` : "等待首次同步";

  const shellLinks = [...navigation, ...intelligenceNavigation];
  const currentPage = [...shellLinks, { href: "/settings", label: "空间与偏好" }, ...collections.map((collection) => ({ href: `/collections/${collection.id}`, label: collection.name }))]
    .find((item) => isActive(item.href))?.label ?? "RepoNest";

  return (
    <div className="app-frame">
      <ParticleField className="app-particle-field" density={36_000} maxParticles={38} connectionDistance={118} interactionRadius={145} />
      <a className="skip-link" href="#workspace-content">跳到主要内容</a>
      <aside className="sidebar">
        <div className="sidebar-ambient" aria-hidden="true" />
        <div className="sidebar-head"><Brand /><span className="version-badge">0.1</span></div>
        <nav className="primary-nav" aria-label="主导航">
          <p className="nav-caption">工作空间</p>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={itemClass(href)} href={demo ? (href === "/dashboard" ? "/demo" : "/login") : href} key={href} aria-current={isActive(href) && !demo ? "page" : undefined}><span className="nav-icon"><Icon size={17} /></span><span>{label}</span></Link>
          ))}
          <p className="nav-caption collection-caption">组织与洞察</p>
          {intelligenceNavigation.map(({ href, label, icon: Icon }) => (
            <Link className={itemClass(href)} href={demo ? "/login" : href} key={href} aria-current={isActive(href) && !demo ? "page" : undefined}><span className="nav-icon"><Icon size={17} /></span><span>{label}</span></Link>
          ))}
          <div className="nav-caption-row"><p className="nav-caption collection-caption">收藏集</p><Link href={demo ? "/login" : "/settings#collections"} aria-label="管理收藏集"><Plus size={14} /></Link></div>
          {collections.slice(0, 7).map((collection) => (
            <Link className={itemClass(`/collections/${collection.id}`)} href={demo ? "/login" : `/collections/${collection.id}`} key={collection.id} aria-current={!demo && pathname === `/collections/${collection.id}` ? "page" : undefined}>
              <span className="collection-dot" data-color={collection.color} aria-hidden="true" /><span>{collection.name}</span><small>{collection.count}</small>
            </Link>
          ))}
          {collections.length > 7 && <Link className="nav-item nav-view-all" href={demo ? "/login" : "/settings#collections"}><span className="nav-icon"><Boxes size={17} /></span><span>查看全部收藏集</span></Link>}
        </nav>
        <div className="sidebar-foot">
          {demo && <div className="demo-chip"><Sparkles size={15} />演示空间</div>}
          {!demo && <Link className="sidebar-private-card" href="/settings#data"><span><ShieldCheck size={16} /></span><div><strong>私人空间</strong><small>本地持久化 · 可导出</small></div><ArrowUpRight size={14} /></Link>}
          <Link className="user-card" href={demo ? "/login" : "/settings"}>
            <span className="user-avatar"><Image src={user.avatarUrl} alt="" width={36} height={36} unoptimized /><i /></span>
            <span><strong>{user.name || user.login}</strong><small>@{user.login}</small></span><Settings size={16} />
          </Link>
        </div>
      </aside>

      <div className="workspace">
        <div className="workspace-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <header className="workspace-topbar">
          <div className="topbar-context"><span>我的空间</span><i>/</i><strong>{currentPage}</strong></div>
          <button className="global-search-trigger" onClick={() => setCommandOpen(true)}><Search size={16} /><span>搜索仓库、页面或收藏集…</span><kbd>⌘ K</kbd></button>
          <div className="topbar-actions">
            {demo ? <span className="sync-indicator"><i />只读演示</span> : (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button className="sync-indicator sync-trigger" data-state={syncHasError ? "error" : syncing ? "running" : "ready"}><i />{syncLabel}</button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content className="sync-popover" align="end" sideOffset={10}>
                    <header><span className="sync-popover-icon" data-state={syncHasError ? "error" : syncing ? "running" : "ready"}><RefreshCw className={syncing ? "spinning" : ""} size={17} /></span><div><strong>GitHub 星标同步</strong><small>{syncing ? "正在读取并核对你的 Star" : `上次同步${relativeTime(user.lastSyncedAt)}`}</small></div></header>
                    {syncHasError && <p className="sync-error" role="alert">上次同步没有完成。你的现有整理数据未受影响。</p>}
                    {currentSync?.truncated && <p className="sync-note">已达到 MAX_SYNC_PAGES 上限，未拉取部分不会被误判为取消 Star。</p>}
                    <button className="button secondary full" disabled={syncing} onClick={() => sync.mutate()}><RefreshCw className={syncing ? "spinning" : ""} size={16} />{syncing ? "同步进行中…" : "立即同步"}</button>
                    <Popover.Arrow className="popover-arrow" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
            <button className="icon-button" onClick={toggleTheme} aria-label={`切换到${theme === "light" ? "深色" : "浅色"}主题`}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
          </div>
        </header>
        <header className="mobile-bar"><Brand /><div><button className="icon-button" onClick={() => setCommandOpen(true)} aria-label="搜索"><Search size={19} /></button><button className="icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="打开更多导航"><Menu size={20} /></button></div></header>
        <main className="workspace-main" id="workspace-content">{children}</main>
        <nav className="mobile-nav" aria-label="移动端导航">
          {[navigation[0], navigation[1], navigation[3]].map(({ href, label, icon: Icon }) => (
            <Link className={!demo && isActive(href) ? "active" : ""} href={demo ? (href === "/dashboard" ? "/demo" : "/login") : href} key={href} aria-current={!demo && isActive(href) ? "page" : undefined}><Icon size={20} /><span>{label.replace("GitHub ", "")}</span></Link>
          ))}
          <button className={mobileMenuOpen ? "mobile-more-trigger active" : "mobile-more-trigger"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><Menu size={20} /><span>更多</span></button>
        </nav>
      </div>

      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal><Dialog.Overlay className="command-overlay" /><Dialog.Content className="command-palette" aria-describedby="command-description">
          <Dialog.Title className="sr-only">全局搜索与快捷命令</Dialog.Title><Dialog.Description className="sr-only" id="command-description">搜索仓库、页面、收藏集和功能</Dialog.Description>
          <div className="command-input"><Search size={20} /><input autoFocus value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="搜索仓库、页面或收藏集…" aria-label="全局搜索" /><Dialog.Close asChild><button aria-label="关闭"><X size={18} /></button></Dialog.Close></div>
          <div className="command-results">
            {searchNeedle.length >= 2 && <>
              <p>仓库</p>
              {repositorySearch.isFetching && !demo ? <div className="command-loading">正在搜索资料库…</div> : repositoryResults.map((repository) => (
                <button className="command-repository" key={repository.id} onClick={() => goToRepository(repository)}><span className="repo-avatar">{repository.owner.slice(0, 2).toUpperCase()}</span><span><strong>{repository.fullName}</strong><small>{repository.description || "暂无简介"}</small></span><small>{repository.language || "Repository"}</small></button>
              ))}
            </>}
            <p>{searchNeedle ? "页面与收藏集" : "快速前往"}</p>
            {commands.map(({ href, label, icon: Icon }) => <button key={href} onClick={() => go(href)}><span><Icon size={18} /></span><strong>{label}</strong><small>前往</small></button>)}
            {!commands.length && !repositoryResults.length && !(repositorySearch.isFetching && !demo) && <div className="command-empty">没有找到匹配结果，试试仓库名、标签或更短的关键词。</div>}
          </div>
          <footer><span><Command size={14} /> {shortcut} 打开</span><span>Tab 导航</span><span>Esc 关闭</span></footer>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <Dialog.Portal><Dialog.Overlay className="mobile-more-overlay" /><Dialog.Content className="mobile-more-sheet" aria-describedby="mobile-menu-description">
          <div className="mobile-more-handle" aria-hidden="true" />
          <header className="mobile-more-header"><div><Dialog.Title>更多</Dialog.Title><Dialog.Description id="mobile-menu-description">访问全部空间、组织工具与设置</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="关闭更多导航"><X size={19} /></button></Dialog.Close></header>
          <nav className="mobile-more-grid" aria-label="全部导航">
            {shellLinks.map(({ href, label, icon: Icon }) => <Link className="mobile-more-item" href={demo ? "/login" : href} key={href} onClick={() => setMobileMenuOpen(false)}><span><Icon size={19} /></span>{label}</Link>)}
          </nav>
          {collections.length > 0 && <section className="mobile-more-section"><p>收藏集</p><div className="mobile-more-grid">{collections.map((collection) => <Link className="mobile-more-item" href={demo ? "/login" : `/collections/${collection.id}`} key={collection.id} onClick={() => setMobileMenuOpen(false)}><span className="collection-dot" data-color={collection.color} />{collection.name}<small>{collection.count}</small></Link>)}</div></section>}
          <footer className="mobile-more-actions"><button className="button secondary" onClick={toggleTheme}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}切换到{theme === "light" ? "深色" : "浅色"}主题</button><Link className="button secondary" href={demo ? "/login" : "/settings"} onClick={() => setMobileMenuOpen(false)}><Settings size={17} />空间设置</Link></footer>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/api/me") });
  const collections = useQuery({ queryKey: ["collections"], queryFn: () => api<{ collections: Collection[] }>("/api/collections"), enabled: Boolean(me.data) });
  useEffect(() => { if (me.error instanceof ApiError && me.error.status === 401) router.replace("/login"); }, [me.error, router]);
  if (me.isPending || (me.data && collections.isPending)) return <div className="loading-screen"><Brand /><span className="loading-line" /><p>正在打开你的资料库…</p></div>;
  if (me.isError && !(me.error instanceof ApiError && me.error.status === 401)) return <div className="loading-screen shell-error-state"><WifiOff size={28} /><h1>暂时无法连接 RepoNest</h1><p>你的数据仍然安全地保存在服务器上。请检查网络后重试。</p><button className="button secondary" onClick={() => me.refetch()}>重新连接</button></div>;
  if (!me.data) return <div className="loading-screen"><Brand /><p>正在前往登录页面…</p></div>;
  return <Shell user={me.data} collections={collections.data?.collections ?? []}>{children}</Shell>;
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  return <Shell user={demoUser} collections={demoCollections} demo>{children}</Shell>;
}
