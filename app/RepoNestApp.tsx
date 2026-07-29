"use client";

import {
  Archive,
  ArrowDownUp,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cloud,
  Code2,
  Command,
  Folder,
  FolderHeart,
  GitBranch,
  GitFork,
  Grid2X2,
  Heart,
  History,
  Home,
  LayoutList,
  Link2,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Source = "github" | "bookmark";
type ViewMode = "grid" | "list";
type ModalName = "add" | "sync" | null;

type Repository = {
  id: string;
  owner: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  updatedAt: string;
  topics: string[];
  collection: string;
  note: string;
  favorite: boolean;
  archived: boolean;
  source: Source;
  license?: string;
};

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Rust: "#dea584",
  Go: "#00add8",
  Vue: "#41b883",
  CSS: "#663399",
  Link: "#8a8f98",
};

const initialRepositories: Repository[] = [
  {
    id: "github:langgenius/dify",
    owner: "langgenius",
    name: "dify",
    description:
      "面向生产环境的生成式 AI 应用开发平台，集工作流、RAG、Agent 与模型管理于一体。",
    url: "https://github.com/langgenius/dify",
    stars: 114800,
    forks: 17900,
    language: "TypeScript",
    languageColor: languageColors.TypeScript,
    updatedAt: "2026-07-29T09:20:00.000Z",
    topics: ["ai", "workflow", "rag"],
    collection: "AI 工具箱",
    note: "适合研究工作流编排和 RAG 产品化，关注插件体系的演进。",
    favorite: true,
    archived: false,
    source: "github",
    license: "Apache-2.0",
  },
  {
    id: "github:openai/openai-cookbook",
    owner: "openai",
    name: "openai-cookbook",
    description:
      "使用 OpenAI API 完成常见任务的示例与指南，覆盖 Agents、语音、视觉和评估。",
    url: "https://github.com/openai/openai-cookbook",
    stars: 72100,
    forks: 11500,
    language: "Python",
    languageColor: languageColors.Python,
    updatedAt: "2026-07-28T15:45:00.000Z",
    topics: ["openai", "examples", "agents"],
    collection: "AI 工具箱",
    note: "每月回看一次新增示例。",
    favorite: true,
    archived: false,
    source: "github",
    license: "MIT",
  },
  {
    id: "github:vercel/next.js",
    owner: "vercel",
    name: "next.js",
    description:
      "The React Framework for the Web. 面向全栈 Web 应用的现代 React 框架。",
    url: "https://github.com/vercel/next.js",
    stars: 139200,
    forks: 30200,
    language: "JavaScript",
    languageColor: languageColors.JavaScript,
    updatedAt: "2026-07-29T06:10:00.000Z",
    topics: ["react", "framework", "web"],
    collection: "前端工程",
    note: "",
    favorite: false,
    archived: false,
    source: "github",
    license: "MIT",
  },
  {
    id: "github:shadcn-ui/ui",
    owner: "shadcn-ui",
    name: "ui",
    description:
      "设计精良、可直接复制到应用中的组件集合，建立在 Radix UI 与 Tailwind CSS 之上。",
    url: "https://github.com/shadcn-ui/ui",
    stars: 104900,
    forks: 7600,
    language: "TypeScript",
    languageColor: languageColors.TypeScript,
    updatedAt: "2026-07-27T11:30:00.000Z",
    topics: ["components", "design-system", "tailwind"],
    collection: "设计灵感",
    note: "参考命令面板与文档的信息架构。",
    favorite: true,
    archived: false,
    source: "github",
    license: "MIT",
  },
  {
    id: "github:excalidraw/excalidraw",
    owner: "excalidraw",
    name: "excalidraw",
    description:
      "虚拟白板与手绘风格图表工具，支持端到端加密协作与丰富的画布能力。",
    url: "https://github.com/excalidraw/excalidraw",
    stars: 101400,
    forks: 11200,
    language: "TypeScript",
    languageColor: languageColors.TypeScript,
    updatedAt: "2026-07-24T03:15:00.000Z",
    topics: ["whiteboard", "canvas", "collaboration"],
    collection: "设计灵感",
    note: "",
    favorite: false,
    archived: false,
    source: "github",
    license: "MIT",
  },
  {
    id: "github:astral-sh/uv",
    owner: "astral-sh",
    name: "uv",
    description:
      "极速 Python 包与项目管理器，用 Rust 编写，统一替代 pip、pip-tools 与 virtualenv。",
    url: "https://github.com/astral-sh/uv",
    stars: 70400,
    forks: 2200,
    language: "Rust",
    languageColor: languageColors.Rust,
    updatedAt: "2026-07-26T18:20:00.000Z",
    topics: ["python", "package-manager", "rust"],
    collection: "开发效率",
    note: "下一次 Python 项目初始化时试用。",
    favorite: false,
    archived: false,
    source: "github",
    license: "Apache-2.0",
  },
  {
    id: "github:immich-app/immich",
    owner: "immich-app",
    name: "immich",
    description:
      "高性能、自托管的照片与视频管理方案，适合作为 Google Photos 的私有替代。",
    url: "https://github.com/immich-app/immich",
    stars: 76200,
    forks: 4100,
    language: "TypeScript",
    languageColor: languageColors.TypeScript,
    updatedAt: "2026-07-21T08:00:00.000Z",
    topics: ["self-hosted", "photos", "docker"],
    collection: "自托管",
    note: "等硬盘扩容后部署。",
    favorite: false,
    archived: true,
    source: "github",
    license: "AGPL-3.0",
  },
];

const navItems = [
  { id: "all", label: "全部收藏", icon: Home },
  { id: "favorites", label: "特别关注", icon: Heart },
  { id: "recent", label: "最近更新", icon: History },
  { id: "archived", label: "已归档", icon: Archive },
];

const collectionMeta: Record<string, { tone: string; icon: typeof Folder }> = {
  "AI 工具箱": { tone: "violet", icon: Sparkles },
  前端工程: { tone: "blue", icon: Code2 },
  设计灵感: { tone: "orange", icon: FolderHeart },
  开发效率: { tone: "green", icon: Boxes },
  自托管: { tone: "rose", icon: Cloud },
};

function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function relativeDate(value: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
  );
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

function mapGithubRepository(repo: Record<string, unknown>): Repository {
  const owner = (repo.owner as { login?: string })?.login || "unknown";
  const name = String(repo.name || "untitled");
  const language = String(repo.language || "未识别");
  return {
    id: `github:${String(repo.full_name || `${owner}/${name}`)}`,
    owner,
    name,
    description: String(repo.description || "这个仓库还没有添加简介。"),
    url: String(repo.html_url || `https://github.com/${owner}/${name}`),
    stars: Number(repo.stargazers_count || 0),
    forks: Number(repo.forks_count || 0),
    language,
    languageColor: languageColors[language] || "#8a8f98",
    updatedAt: String(repo.updated_at || new Date().toISOString()),
    topics: Array.isArray(repo.topics)
      ? repo.topics.slice(0, 4).map(String)
      : [],
    collection: "未分类",
    note: "",
    favorite: false,
    archived: false,
    source: "github",
    license:
      ((repo.license as { spdx_id?: string } | null)?.spdx_id as string) ||
      undefined,
  };
}

export default function RepoNestApp() {
  const [repositories, setRepositories] =
    useState<Repository[]>(initialRepositories);
  const [activeNav, setActiveNav] = useState("all");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("全部语言");
  const [sort, setSort] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<Repository | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileNav, setMobileNav] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const storageReady = useRef(false);

  useEffect(() => {
    let active = true;
    try {
      const stored = localStorage.getItem("reponest.repositories.v1");
      const storedTheme = localStorage.getItem("reponest.theme");
      const storedSync = localStorage.getItem("reponest.lastSync");
      queueMicrotask(() => {
        if (!active) return;
        storageReady.current = true;
        if (stored) setRepositories(JSON.parse(stored));
        if (storedTheme === "dark" || storedTheme === "light") {
          setTheme(storedTheme);
        }
        if (storedSync) setLastSync(storedSync);
      });
    } catch {
      storageReady.current = true;
      // Fall back to the bundled collection when local data is unavailable.
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady.current) return;
    localStorage.setItem(
      "reponest.repositories.v1",
      JSON.stringify(repositories),
    );
  }, [repositories]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (storageReady.current) {
      localStorage.setItem("reponest.theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setModal(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const collections = useMemo(() => {
    const counts = repositories.reduce<Record<string, number>>((acc, repo) => {
      acc[repo.collection] = (acc[repo.collection] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [repositories]);

  const languages = useMemo(
    () => [
      "全部语言",
      ...Array.from(new Set(repositories.map((repo) => repo.language))).sort(),
    ],
    [repositories],
  );

  const visibleRepositories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return repositories
      .filter((repo) => {
        if (activeNav === "favorites" && !repo.favorite) return false;
        if (activeNav === "archived" && !repo.archived) return false;
        if (activeNav !== "archived" && repo.archived) return false;
        if (activeCollection && repo.collection !== activeCollection)
          return false;
        if (language !== "全部语言" && repo.language !== language) return false;
        if (
          query &&
          ![
            repo.owner,
            repo.name,
            repo.description,
            repo.note,
            repo.collection,
            ...repo.topics,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "stars") return b.stars - a.stars;
        if (sort === "name") return a.name.localeCompare(b.name);
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [
    repositories,
    activeNav,
    activeCollection,
    language,
    search,
    sort,
  ]);

  const updateRepository = (id: string, patch: Partial<Repository>) => {
    setRepositories((current) =>
      current.map((repo) => (repo.id === id ? { ...repo, ...patch } : repo)),
    );
    setSelected((current) =>
      current?.id === id ? { ...current, ...patch } : current,
    );
  };

  const removeRepository = (id: string) => {
    setRepositories((current) => current.filter((repo) => repo.id !== id));
    setSelected(null);
    setToast("已从 RepoNest 中移除");
  };

  const syncGithub = async (event: FormEvent) => {
    event.preventDefault();
    if (!githubToken.trim()) return;
    setSyncing(true);
    try {
      const response = await fetch(
        "https://api.github.com/user/starred?per_page=100&sort=updated",
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${githubToken.trim()}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Token 无效或已过期"
            : `GitHub 返回 ${response.status}`,
        );
      }
      const result = (await response.json()) as Record<string, unknown>[];
      setRepositories((current) => {
        const existing = new Map(current.map((repo) => [repo.id, repo]));
        result.forEach((raw) => {
          const imported = mapGithubRepository(raw);
          const old = existing.get(imported.id);
          existing.set(imported.id, old ? { ...imported, ...old } : imported);
        });
        return Array.from(existing.values());
      });
      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem("reponest.lastSync", now);
      setGithubToken("");
      setModal(null);
      setToast(`已同步 ${result.length} 个 GitHub 星标`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "同步失败，请稍后再试");
    } finally {
      setSyncing(false);
    }
  };

  const addRepository = async (event: FormEvent) => {
    event.preventDefault();
    if (!addUrl.trim()) return;
    setAdding(true);
    try {
      const parsed = new URL(
        addUrl.startsWith("http") ? addUrl : `https://${addUrl}`,
      );
      let repo: Repository;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        parsed.hostname === "github.com" &&
        parts.length >= 2 &&
        !["topics", "trending", "collections"].includes(parts[0])
      ) {
        const response = await fetch(
          `https://api.github.com/repos/${parts[0]}/${parts[1]}`,
          { headers: { Accept: "application/vnd.github+json" } },
        );
        if (!response.ok) throw new Error("没有找到这个 GitHub 仓库");
        repo = mapGithubRepository(
          (await response.json()) as Record<string, unknown>,
        );
      } else {
        const name =
          parts.filter(Boolean).pop()?.replace(/[-_]/g, " ") ||
          parsed.hostname;
        repo = {
          id: `bookmark:${parsed.href}`,
          owner: parsed.hostname.replace(/^www\./, ""),
          name,
          description: "手动加入 RepoNest 的网页收藏。",
          url: parsed.href,
          stars: 0,
          forks: 0,
          language: "Link",
          languageColor: languageColors.Link,
          updatedAt: new Date().toISOString(),
          topics: ["bookmark"],
          collection: "未分类",
          note: "",
          favorite: false,
          archived: false,
          source: "bookmark",
        };
      }
      setRepositories((current) => {
        if (current.some((item) => item.id === repo.id)) return current;
        return [repo, ...current];
      });
      setAddUrl("");
      setModal(null);
      setToast("收藏已加入你的巢穴");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "链接格式不正确");
    } finally {
      setAdding(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setLanguage("全部语言");
    setActiveNav("all");
    setActiveCollection(null);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSearch("");
      event.currentTarget.blur();
    }
  };

  const currentTitle = activeCollection
    ? activeCollection
    : navItems.find((item) => item.id === activeNav)?.label || "全部收藏";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-row">
          <button
            className="brand"
            onClick={() => {
              resetFilters();
              setMobileNav(false);
            }}
            aria-label="返回 RepoNest 首页"
          >
            <span className="brand-mark">
              <BookmarkCheck size={18} strokeWidth={2.4} />
            </span>
            <span>
              Repo<span>Nest</span>
            </span>
          </button>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileNav(false)}
            aria-label="关闭菜单"
          >
            <X size={18} />
          </button>
        </div>

        <button className="new-button" onClick={() => setModal("add")}>
          <Plus size={17} />
          新建收藏
          <span>N</span>
        </button>

        <nav className="primary-nav" aria-label="主导航">
          <p className="eyebrow">浏览</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const count =
              item.id === "favorites"
                ? repositories.filter((repo) => repo.favorite).length
                : item.id === "archived"
                  ? repositories.filter((repo) => repo.archived).length
                  : undefined;
            return (
              <button
                key={item.id}
                className={
                  activeNav === item.id && !activeCollection ? "active" : ""
                }
                onClick={() => {
                  setActiveNav(item.id);
                  setActiveCollection(null);
                  setMobileNav(false);
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {typeof count === "number" && <small>{count}</small>}
              </button>
            );
          })}
        </nav>

        <div className="collection-nav">
          <div className="section-label">
            <p className="eyebrow">集合</p>
            <button aria-label="创建集合">
              <Plus size={14} />
            </button>
          </div>
          {collections.slice(0, 5).map(([name, count]) => {
            const meta = collectionMeta[name] || {
              tone: "neutral",
              icon: Folder,
            };
            const Icon = meta.icon;
            return (
              <button
                key={name}
                className={activeCollection === name ? "active" : ""}
                onClick={() => {
                  setActiveCollection(name);
                  setActiveNav("all");
                  setMobileNav(false);
                }}
              >
                <span className={`collection-icon ${meta.tone}`}>
                  <Icon size={14} />
                </span>
                <span>{name}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </div>

        <div className="sidebar-insight">
          <div>
            <Sparkles size={15} />
            <span>每周回顾</span>
          </div>
          <strong>还有 12 个收藏等待整理</strong>
          <div className="insight-progress">
            <span />
          </div>
          <button>开始整理 <ArrowUpRight size={13} /></button>
        </div>

        <div className="sidebar-footer">
          <button onClick={() => setModal("sync")}>
            <span className="avatar">RN</span>
            <span>
              <strong>本地工作区</strong>
              <small>{lastSync ? `已同步 ${relativeDate(lastSync)}` : "尚未同步"}</small>
            </span>
            <Settings size={16} />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileNav(false)}
          aria-label="关闭菜单"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="打开菜单"
          >
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={17} />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="搜索仓库、标签、笔记…"
              aria-label="搜索收藏"
            />
            {search ? (
              <button onClick={() => setSearch("")} aria-label="清空搜索">
                <X size={15} />
              </button>
            ) : (
              <span className="shortcut">
                <Command size={11} /> K
              </span>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? "切换深色模式" : "切换浅色模式"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="sync-button" onClick={() => setModal("sync")}>
              <RefreshCw size={15} />
              <span>同步 GitHub</span>
            </button>
          </div>
        </header>

        <div className="content-frame">
          <section className="hero-section">
            <div>
              <p className="overline">
                <span />
                YOUR DEVELOPER LIBRARY
              </p>
              <h1>
                把星标变成
                <br />
                你的<span>技术地图。</span>
              </h1>
              <p className="hero-copy">
                不再让有价值的项目沉入 Star 列表。整理、标注，
                <br className="desktop-break" />
                并在真正需要时重新发现它们。
              </p>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="visual-core">
                <Bookmark size={26} fill="currentColor" />
              </div>
              <div className="floating-chip chip-one">
                <span className="lang-dot typescript" /> TypeScript
              </div>
              <div className="floating-chip chip-two">
                <Star size={13} fill="currentColor" /> 842
              </div>
              <div className="floating-node node-one">
                <GitBranch size={16} />
              </div>
              <div className="floating-node node-two">
                <Tag size={15} />
              </div>
              <div className="floating-node node-three">
                <Folder size={15} />
              </div>
            </div>
          </section>

          <section className="stats-grid" aria-label="收藏统计">
            <article className="stat-card stat-primary">
              <div className="stat-icon">
                <BookmarkCheck size={19} />
              </div>
              <div>
                <span>收藏总数</span>
                <strong>{repositories.length}</strong>
              </div>
              <span className="stat-badge positive">
                <TrendingUp size={11} /> 8.4%
              </span>
              <div className="mini-bars" aria-hidden="true">
                {[38, 52, 44, 66, 58, 78, 92].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </article>
            <article className="stat-card">
              <div className="stat-icon violet">
                <FolderHeart size={19} />
              </div>
              <div>
                <span>活跃集合</span>
                <strong>{collections.length}</strong>
              </div>
              <span className="stat-caption">本周 +2</span>
              <div className="stat-orbs" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </article>
            <article className="stat-card">
              <div className="stat-icon orange">
                <CircleDot size={19} />
              </div>
              <div>
                <span>待整理</span>
                <strong>
                  {
                    repositories.filter(
                      (repo) => repo.collection === "未分类",
                    ).length
                  }
                </strong>
              </div>
              <span className="stat-caption">保持收件箱清爽</span>
              <div className="ring-progress" aria-hidden="true">
                <span>{Math.min(repositories.length * 9, 86)}%</span>
              </div>
            </article>
            <article className="stat-card">
              <div className="stat-icon blue">
                <RefreshCw size={19} />
              </div>
              <div>
                <span>上次同步</span>
                <strong className="stat-time">
                  {lastSync ? relativeDate(lastSync) : "未连接"}
                </strong>
              </div>
              <button className="inline-action" onClick={() => setModal("sync")}>
                立即同步 <ChevronRight size={13} />
              </button>
              <ShieldCheck className="stat-watermark" size={42} />
            </article>
          </section>

          <section className="library-section">
            <div className="section-heading">
              <div>
                <div className="breadcrumb">
                  <span>我的巢穴</span>
                  <ChevronRight size={13} />
                  <strong>{currentTitle}</strong>
                </div>
                <h2>{currentTitle}</h2>
                <p>
                  {visibleRepositories.length} 个收藏
                  {search && ` · 匹配“${search}”`}
                </p>
              </div>
              <button className="add-button" onClick={() => setModal("add")}>
                <Plus size={16} />
                添加收藏
              </button>
            </div>

            <div className="filter-bar">
              <div className="filter-group">
                <label>
                  <span className="filter-label">语言</span>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    aria-label="按语言筛选"
                  >
                    {languages.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <label>
                  <span className="filter-label">排序</span>
                  <ArrowDownUp size={14} />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="收藏排序"
                  >
                    <option value="recent">最近更新</option>
                    <option value="stars">Star 最多</option>
                    <option value="name">名称 A–Z</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              <div className="view-switcher" aria-label="视图切换">
                <button
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                  aria-label="网格视图"
                >
                  <Grid2X2 size={15} />
                </button>
                <button
                  className={viewMode === "list" ? "active" : ""}
                  onClick={() => setViewMode("list")}
                  aria-label="列表视图"
                >
                  <LayoutList size={16} />
                </button>
              </div>
            </div>

            {visibleRepositories.length > 0 ? (
              <div className={`repo-grid ${viewMode}`}>
                {visibleRepositories.map((repo) => (
                  <article
                    className="repo-card"
                    key={repo.id}
                    onClick={() => setSelected(repo)}
                  >
                    <div className="repo-card-top">
                      <div className="repo-identity">
                        <span
                          className={`repo-avatar avatar-${repo.owner.charCodeAt(0) % 5}`}
                        >
                          {repo.source === "github" ? (
                            repo.owner.slice(0, 2).toUpperCase()
                          ) : (
                            <Link2 size={17} />
                          )}
                        </span>
                        <div>
                          <span>{repo.owner}</span>
                          <h3>{repo.name}</h3>
                        </div>
                      </div>
                      <div className="repo-actions">
                        <button
                          className={repo.favorite ? "is-favorite" : ""}
                          onClick={(event) => {
                            event.stopPropagation();
                            updateRepository(repo.id, {
                              favorite: !repo.favorite,
                            });
                          }}
                          aria-label={
                            repo.favorite ? "取消特别关注" : "设为特别关注"
                          }
                        >
                          <Star
                            size={16}
                            fill={repo.favorite ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(repo);
                          }}
                          aria-label="更多操作"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      </div>
                    </div>
                    <p className="repo-description">{repo.description}</p>
                    <div className="repo-topics">
                      {repo.topics.slice(0, 3).map((topic) => (
                        <span key={topic}>#{topic}</span>
                      ))}
                    </div>
                    <div className="repo-card-bottom">
                      <div className="repo-meta">
                        <span>
                          <i
                            className="lang-dot"
                            style={{ backgroundColor: repo.languageColor }}
                          />
                          {repo.language}
                        </span>
                        {repo.source === "github" && (
                          <>
                            <span>
                              <Star size={13} />
                              {compactNumber(repo.stars)}
                            </span>
                            <span>
                              <GitFork size={13} />
                              {compactNumber(repo.forks)}
                            </span>
                          </>
                        )}
                      </div>
                      <time>{relativeDate(repo.updatedAt)}</time>
                    </div>
                    <div className="card-collection">
                      <Folder size={12} />
                      {repo.collection}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>
                  <Search size={25} />
                </span>
                <h3>没有找到匹配的收藏</h3>
                <p>换一个关键词，或者清除当前筛选条件。</p>
                <button onClick={resetFilters}>清除筛选</button>
              </div>
            )}
          </section>

          <footer className="app-footer">
            <span>RepoNest 0.1.0 · 本地优先，数据由你掌控</span>
            <a
              href="https://github.com/Elainaicey/RepoNest"
              target="_blank"
              rel="noreferrer"
            >
              <GitBranch size={14} /> 开源项目
            </a>
          </footer>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="移动端导航">
        {navItems.slice(0, 3).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={activeNav === item.id ? "active" : ""}
              onClick={() => {
                setActiveNav(item.id);
                setActiveCollection(null);
              }}
            >
              <Icon size={18} />
              <span>{item.label.slice(0, 4)}</span>
            </button>
          );
        })}
        <button onClick={() => setModal("add")}>
          <Plus size={19} />
          <span>添加</span>
        </button>
      </nav>

      {selected && (
        <>
          <button
            className="drawer-overlay"
            onClick={() => setSelected(null)}
            aria-label="关闭详情"
          />
          <aside className="detail-drawer" aria-label="收藏详情">
            <div className="drawer-header">
              <span className="drawer-kicker">COLLECTION DETAIL</span>
              <button
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="关闭详情"
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-title">
              <span
                className={`repo-avatar avatar-${selected.owner.charCodeAt(0) % 5}`}
              >
                {selected.owner.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p>{selected.owner}</p>
                <h2>{selected.name}</h2>
              </div>
            </div>
            <p className="drawer-description">{selected.description}</p>
            <a
              className="open-repo"
              href={selected.url}
              target="_blank"
              rel="noreferrer"
            >
              {selected.source === "github" ? (
                <GitBranch size={16} />
              ) : (
                <Link2 size={16} />
              )}
              打开原始链接
              <ArrowUpRight size={15} />
            </a>

            <div className="drawer-metrics">
              <div>
                <Star size={15} />
                <span>Stars</span>
                <strong>{compactNumber(selected.stars)}</strong>
              </div>
              <div>
                <GitFork size={15} />
                <span>Forks</span>
                <strong>{compactNumber(selected.forks)}</strong>
              </div>
              <div>
                <CircleDot size={15} />
                <span>语言</span>
                <strong>{selected.language}</strong>
              </div>
            </div>

            <div className="field-block">
              <label htmlFor="collection-select">所属集合</label>
              <div className="select-shell">
                <Folder size={15} />
                <select
                  id="collection-select"
                  value={selected.collection}
                  onChange={(event) =>
                    updateRepository(selected.id, {
                      collection: event.target.value,
                    })
                  }
                >
                  {Array.from(
                    new Set([
                      ...collections.map(([name]) => name),
                      "未分类",
                    ]),
                  ).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </div>
            </div>

            <div className="field-block">
              <label>标签</label>
              <div className="drawer-tags">
                {selected.topics.map((topic) => (
                  <span key={topic}>#{topic}</span>
                ))}
                <button aria-label="添加标签">
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className="field-block">
              <label htmlFor="repo-note">私人笔记</label>
              <textarea
                id="repo-note"
                value={selected.note}
                onChange={(event) =>
                  updateRepository(selected.id, { note: event.target.value })
                }
                placeholder="写下为什么收藏它、计划如何使用……"
              />
              <small>自动保存在当前浏览器</small>
            </div>

            <div className="drawer-actions">
              <button
                className={selected.favorite ? "is-active" : ""}
                onClick={() =>
                  updateRepository(selected.id, {
                    favorite: !selected.favorite,
                  })
                }
              >
                <Star
                  size={15}
                  fill={selected.favorite ? "currentColor" : "none"}
                />
                {selected.favorite ? "已特别关注" : "特别关注"}
              </button>
              <button
                onClick={() =>
                  updateRepository(selected.id, {
                    archived: !selected.archived,
                  })
                }
              >
                <Archive size={15} />
                {selected.archived ? "取消归档" : "归档"}
              </button>
              <button
                className="danger"
                onClick={() => removeRepository(selected.id)}
              >
                <Trash2 size={15} />
                移除
              </button>
            </div>
          </aside>
        </>
      )}

      {modal && (
        <div className="modal-layer" role="presentation">
          <button
            className="modal-backdrop"
            onClick={() => setModal(null)}
            aria-label="关闭弹窗"
          />
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-head">
              <span className={`modal-icon ${modal === "sync" ? "dark" : ""}`}>
                {modal === "sync" ? <GitBranch size={20} /> : <Plus size={20} />}
              </span>
              <div>
                <p>{modal === "sync" ? "GITHUB SYNC" : "NEW COLLECTION"}</p>
                <h2 id="modal-title">
                  {modal === "sync" ? "同步你的 GitHub 星标" : "添加一个新收藏"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                aria-label="关闭弹窗"
              >
                <X size={18} />
              </button>
            </div>

            {modal === "sync" ? (
              <form onSubmit={syncGithub}>
                <p className="modal-copy">
                  使用 GitHub Fine-grained Token 导入最近 100
                  个星标。Token 只保存在内存中，刷新页面后即清除。
                </p>
                <label className="input-label" htmlFor="github-token">
                  Personal access token
                </label>
                <div className="large-input">
                  <ShieldCheck size={17} />
                  <input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(event) => setGithubToken(event.target.value)}
                    placeholder="github_pat_••••••••••••"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div className="permission-note">
                  <Check size={15} />
                  仅需公开仓库读取权限，不会修改你的 GitHub 数据
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setModal(null)}>
                    稍后再说
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={!githubToken.trim() || syncing}
                  >
                    <RefreshCw
                      size={15}
                      className={syncing ? "spinning" : ""}
                    />
                    {syncing ? "正在同步…" : "连接并同步"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={addRepository}>
                <p className="modal-copy">
                  粘贴 GitHub 仓库或任意网页链接。我们会自动读取公开信息并归入未分类。
                </p>
                <label className="input-label" htmlFor="collection-url">
                  收藏链接
                </label>
                <div className="large-input">
                  <Link2 size={17} />
                  <input
                    id="collection-url"
                    type="text"
                    value={addUrl}
                    onChange={(event) => setAddUrl(event.target.value)}
                    placeholder="https://github.com/owner/repository"
                    autoFocus
                  />
                </div>
                <div className="suggestion-row">
                  <span>支持</span>
                  <small>
                    <GitBranch size={12} /> GitHub 仓库
                  </small>
                  <small>
                    <Link2 size={12} /> 任意网页
                  </small>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setModal(null)}>
                    取消
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={!addUrl.trim() || adding}
                  >
                    <Plus size={15} />
                    {adding ? "正在读取…" : "加入 RepoNest"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={14} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
