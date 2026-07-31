"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  BarChart3,
  Bookmark,
  Boxes,
  Command,
  GitBranch as Github,
  Heart,
  LayoutDashboard,
  Library,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tags,
  X
} from "lucide-react";
import { Dialog } from "radix-ui";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers";
import { api, ApiError } from "@/lib/api";
import { demoCollections, demoUser } from "@/lib/demo-data";
import type { Collection, User } from "@/lib/types";
import { Brand } from "./brand";

const navigation = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/library", label: "全部收藏", icon: Library },
  { href: "/stars", label: "GitHub 星标", icon: Github },
  { href: "/bookmarks", label: "稍后收藏", icon: Bookmark },
  { href: "/favorites", label: "特别关注", icon: Heart },
  { href: "/archived", label: "归档", icon: Archive }
];

const intelligenceNavigation = [
  { href: "/tags", label: "标签", icon: Tags },
  { href: "/insights", label: "收藏洞察", icon: BarChart3 }
];

function Shell({ user, collections, children, demo = false }: {
  user: User;
  collections: Collection[];
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");

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

  const commands = useMemo(() => [
    ...navigation,
    ...intelligenceNavigation,
    ...collections.map((collection) => ({ href: `/collections/${collection.id}`, label: collection.name, icon: Boxes })),
    { href: "/settings", label: "设置", icon: Settings }
  ].filter((item) => item.label.toLocaleLowerCase().includes(commandSearch.trim().toLocaleLowerCase())), [collections, commandSearch]);
  const go = (href: string) => {
    setCommandOpen(false);
    setCommandSearch("");
    router.push(demo ? "/login" : href);
  };
  const itemClass = (href: string) => !demo && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))) ? "nav-item active" : "nav-item";

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-head"><Brand /><span className="version-badge">0.1</span></div>
        <nav className="primary-nav" aria-label="主导航">
          <p className="nav-caption">工作空间</p>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={itemClass(href)} href={demo ? "/demo" : href} key={href}><Icon size={17} /><span>{label}</span></Link>
          ))}
          <p className="nav-caption collection-caption">组织与洞察</p>
          {intelligenceNavigation.map(({ href, label, icon: Icon }) => (
            <Link className={itemClass(href)} href={demo ? "/login" : href} key={href}><Icon size={17} /><span>{label}</span></Link>
          ))}
          <div className="nav-caption-row"><p className="nav-caption collection-caption">收藏集</p><Link href={demo ? "/login" : "/settings"} aria-label="管理收藏集">+</Link></div>
          {collections.slice(0, 7).map((collection) => (
            <Link className={itemClass(`/collections/${collection.id}`)} href={demo ? "/demo" : `/collections/${collection.id}`} key={collection.id}>
              <span className="collection-dot" data-color={collection.color} aria-hidden="true" /><span>{collection.name}</span><small>{collection.count}</small>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          {demo && <div className="demo-chip"><Sparkles size={14} />演示空间</div>}
          <Link className="user-card" href={demo ? "/login" : "/settings"}>
            <Image src={user.avatarUrl} alt="" width={31} height={31} unoptimized />
            <span><strong>{user.name || user.login}</strong><small>@{user.login}</small></span><Settings size={16} />
          </Link>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar">
          <button className="global-search-trigger" onClick={() => setCommandOpen(true)}><Search size={16} /><span>搜索资料库或快速前往…</span><kbd>⌘ K</kbd></button>
          <div className="topbar-actions">
            <span className="sync-indicator"><i /> 已连接</span>
            <button className="icon-button" onClick={toggleTheme} aria-label="切换主题">{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button>
          </div>
        </header>
        <header className="mobile-bar"><Brand /><button className="icon-button" onClick={() => setCommandOpen(true)} aria-label="搜索"><Search size={18} /></button></header>
        <main className="workspace-main">{children}</main>
        <nav className="mobile-nav" aria-label="移动端导航">
          {[navigation[0], navigation[1], navigation[2], intelligenceNavigation[0]].map(({ href, label, icon: Icon }) => (
            <Link className={!demo && pathname === href ? "active" : ""} href={demo ? "/demo" : href} key={href}><Icon size={19} /><span>{label.replace("GitHub ", "")}</span></Link>
          ))}
        </nav>
      </div>

      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal><Dialog.Overlay className="command-overlay" /><Dialog.Content className="command-palette" aria-describedby="command-description">
          <Dialog.Title className="sr-only">快捷命令</Dialog.Title><Dialog.Description className="sr-only" id="command-description">搜索页面和收藏集</Dialog.Description>
          <div className="command-input"><Search size={19} /><input autoFocus value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="输入页面、功能或收藏集名称…" /><Dialog.Close asChild><button aria-label="关闭"><X size={17} /></button></Dialog.Close></div>
          <div className="command-results"><p>快速前往</p>{commands.length ? commands.map(({ href, label, icon: Icon }) => <button key={href} onClick={() => go(href)}><span><Icon size={17} /></span><strong>{label}</strong><small>前往</small></button>) : <div className="command-empty">没有找到匹配的功能</div>}</div>
          <footer><span><Command size={13} /> K 打开</span><span>Tab 导航</span><span>Esc 关闭</span></footer>
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
  if (!me.data) return <div className="loading-screen"><Brand /><p>正在前往登录页面…</p></div>;
  return <Shell user={me.data} collections={collections.data?.collections ?? []}>{children}</Shell>;
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  return <Shell user={demoUser} collections={demoCollections} demo>{children}</Shell>;
}
