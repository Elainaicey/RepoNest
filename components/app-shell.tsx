"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  Bookmark,
  GitBranch as Github,
  Heart,
  LayoutDashboard,
  Moon,
  Settings,
  Sparkles,
  Sun
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "@/app/providers";
import { api, ApiError } from "@/lib/api";
import { demoCollections, demoUser } from "@/lib/demo-data";
import type { Collection, User } from "@/lib/types";
import { Brand } from "./brand";

const navigation = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/stars", label: "GitHub 星标", icon: Github },
  { href: "/bookmarks", label: "稍后收藏", icon: Bookmark },
  { href: "/favorites", label: "特别关注", icon: Heart },
  { href: "/archived", label: "归档", icon: Archive }
];

function Shell({
  user,
  collections,
  children,
  demo = false
}: {
  user: User;
  collections: Collection[];
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-head">
          <Brand />
        </div>
        <nav className="primary-nav" aria-label="主导航">
          <p className="nav-caption">资料库</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const target = demo ? `/demo#${href.slice(1)}` : href;
            return (
              <Link
                className={
                  !demo && (pathname === href || pathname.startsWith(`${href}/`))
                    ? "nav-item active"
                    : "nav-item"
                }
                href={target}
                key={href}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
          <p className="nav-caption collection-caption">收藏集</p>
          {collections.map((collection) => (
            <Link
              className={
                pathname === `/collections/${collection.id}`
                  ? "nav-item active"
                  : "nav-item"
              }
              href={demo ? "/demo#library" : `/collections/${collection.id}`}
              key={collection.id}
            >
              <span
                className="collection-dot"
                data-color={collection.color}
                aria-hidden="true"
              />
              <span>{collection.name}</span>
              <small>{collection.count}</small>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          {demo && (
            <div className="demo-chip">
              <Sparkles size={14} />
              演示空间
            </div>
          )}
          <Link className="user-card" href={demo ? "/login" : "/settings"}>
            {/* GitHub avatars are user-controlled remote images. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatarUrl} alt="" />
            <span>
              <strong>{user.name || user.login}</strong>
              <small>@{user.login}</small>
            </span>
            <Settings size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="mobile-bar">
          <Brand />
          <button className="icon-button" onClick={toggleTheme} aria-label="切换主题">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>
        <main className="workspace-main">{children}</main>
        <nav className="mobile-nav" aria-label="移动端导航">
          {navigation.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <Link
              className={!demo && pathname === href ? "active" : ""}
              href={demo ? `/demo#${href.slice(1)}` : href}
              key={href}
            >
              <Icon size={19} />
              <span>{label.replace("GitHub ", "")}</span>
            </Link>
          ))}
        </nav>
      </div>
      <button className="theme-fab" onClick={toggleTheme} aria-label="切换主题">
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    </div>
  );
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/me")
  });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<{ collections: Collection[] }>("/api/collections"),
    enabled: Boolean(me.data)
  });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace("/login");
    }
  }, [me.error, router]);

  if (me.isPending || (me.data && collections.isPending)) {
    return (
      <div className="loading-screen">
        <Brand />
        <span className="loading-line" />
        <p>正在打开你的资料库…</p>
      </div>
    );
  }

  if (!me.data) {
    return (
      <div className="loading-screen">
        <Brand />
        <p>正在前往登录页面…</p>
      </div>
    );
  }

  return (
    <Shell user={me.data} collections={collections.data?.collections ?? []}>
      {children}
    </Shell>
  );
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <Shell user={demoUser} collections={demoCollections} demo>
      {children}
    </Shell>
  );
}
