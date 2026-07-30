"use client";

import {
  Archive,
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cloud,
  Code2,
  Command,
  Database,
  Download,
  FileJson,
  Folder,
  FolderHeart,
  GitBranch,
  GitFork,
  Grid2X2,
  Heart,
  History,
  Home,
  LayoutList,
  Library,
  Link2,
  Menu,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Sun,
  Tag,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Source = "github" | "bookmark";
type ViewMode = "grid" | "list";
type ModalName = "add" | "sync" | "collection" | "backup" | null;

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

type BackupPayload = {
  app: "RepoNest";
  version: "0.1.0";
  exportedAt: string;
  repositories: Repository[];
  collections: string[];
};

const ALL_LANGUAGES = "全部语言";
const UNCATEGORIZED = "未分类";

const languageColors: Record<string, string> = {
  TypeScript: "#7c8fe8",
  JavaScript: "#d9b84f",
  Python: "#5aa9d6",
  Rust: "#c98d73",
  Go: "#66c5d6",
  Vue: "#67bd93",
  CSS: "#a980d7",
  Link: "#9b9aaa",
  未识别: "#b0adba",
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
    collection: "AI 灵感库",
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
    collection: "AI 灵感库",
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
    collection: "设计收藏",
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
    collection: "设计收藏",
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
  {
    id: "bookmark:developer-roadmaps",
    owner: "roadmap.sh",
    name: "Developer Roadmaps",
    description:
      "由社区维护的开发者学习路线与最佳实践清单，适合规划技术成长路径。",
    url: "https://roadmap.sh",
    stars: 0,
    forks: 0,
    language: "Link",
    languageColor: languageColors.Link,
    updatedAt: "2026-07-20T10:00:00.000Z",
    topics: ["learning", "roadmap"],
    collection: "稍后阅读",
    note: "",
    favorite: false,
    archived: false,
    source: "bookmark",
  },
];

const initialCollections = [
  "AI 灵感库",
  "前端工程",
  "设计收藏",
  "开发效率",
  "自托管",
  "稍后阅读",
];

const navItems = [
  { id: "all", label: "全部收藏", icon: Home },
  { id: "favorites", label: "特别关注", icon: Heart },
  { id: "recent", label: "最近更新", icon: History },
  { id: "archived", label: "已归档", icon: Archive },
];

const collectionMeta: Record<
  string,
  { tone: string; icon: typeof Folder }
> = {
  "AI 灵感库": { tone: "violet", icon: Sparkles },
  前端工程: { tone: "blue", icon: Code2 },
  设计收藏: { tone: "pink", icon: Palette },
  开发效率: { tone: "khaki", icon: BookmarkCheck },
  自托管: { tone: "mint", icon: Cloud },
  稍后阅读: { tone: "peach", icon: BookOpen },
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
    languageColor: languageColors[language] || languageColors.未识别,
    updatedAt: String(repo.updated_at || new Date().toISOString()),
    topics: Array.isArray(repo.topics)
      ? repo.topics.slice(0, 6).map(String)
      : [],
    collection: UNCATEGORIZED,
    note: "",
    favorite: false,
    archived: false,
    source: "github",
    license:
      ((repo.license as { spdx_id?: string } | null)?.spdx_id as string) ||
      undefined,
  };
}

function isRepository(value: unknown): value is Repository {
  if (!value || typeof value !== "object") return false;
  const repo = value as Partial<Repository>;
  return (
    typeof repo.id === "string" &&
    typeof repo.name === "string" &&
    typeof repo.url === "string" &&
    Array.isArray(repo.topics)
  );
}

export default function RepoNestApp() {
  const [repositories, setRepositories] =
    useState<Repository[]>(initialRepositories);
  const [customCollections, setCustomCollections] =
    useState<string[]>(initialCollections);
  const [activeNav, setActiveNav] = useState("all");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState(ALL_LANGUAGES);
  const [sort, setSort] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<Repository | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalName>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileNav, setMobileNav] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const storageReady = useRef(false);

  useEffect(() => {
    let active = true;
    try {
      const storedRepos = localStorage.getItem("reponest.repositories.v1");
      const storedCollections = localStorage.getItem(
        "reponest.collections.v1",
      );
      const storedTheme = localStorage.getItem("reponest.theme");
      const storedSync = localStorage.getItem("reponest.lastSync");
      queueMicrotask(() => {
        if (!active) return;
        storageReady.current = true;
        if (storedRepos) setRepositories(JSON.parse(storedRepos));
        if (storedCollections) {
          setCustomCollections(JSON.parse(storedCollections));
        }
        if (storedTheme === "dark" || storedTheme === "light") {
          setTheme(storedTheme);
        }
        if (storedSync) setLastSync(storedSync);
      });
    } catch {
      storageReady.current = true;
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
    if (!storageReady.current) return;
    localStorage.setItem(
      "reponest.collections.v1",
      JSON.stringify(customCollections),
    );
  }, [customCollections]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (storageReady.current) localStorage.setItem("reponest.theme", theme);
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
        setConfirmReset(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const collections = useMemo(() => {
    const names = new Set(customCollections);
    repositories.forEach((repo) => names.add(repo.collection));
    const counts = repositories.reduce<Record<string, number>>((acc, repo) => {
      acc[repo.collection] = (acc[repo.collection] || 0) + 1;
      return acc;
    }, {});
    return Array.from(names)
      .map((name) => [name, counts[name] || 0] as const)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [repositories, customCollections]);

  const languages = useMemo(
    () => [
      ALL_LANGUAGES,
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
        if (language !== ALL_LANGUAGES && repo.language !== language)
          return false;
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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const favoritesCount = repositories.filter((repo) => repo.favorite).length;
  const inboxCount = repositories.filter(
    (repo) => repo.collection === UNCATEGORIZED || !repo.note,
  ).length;
  const organizationScore = repositories.length
    ? Math.round(
        (repositories.filter(
          (repo) => repo.collection !== UNCATEGORIZED && repo.note,
        ).length /
          repositories.length) *
          100,
      )
    : 0;

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
    setSelectedIds((current) => current.filter((item) => item !== id));
    setSelected(null);
    setToast("已从 RepoNest 中移除");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleRepositories.map((repo) => repo.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const bulkUpdate = (patch: Partial<Repository>, message: string) => {
    setRepositories((current) =>
      current.map((repo) =>
        selectedSet.has(repo.id) ? { ...repo, ...patch } : repo,
      ),
    );
    setSelectedIds([]);
    setToast(message);
  };

  const syncGithub = async (event: FormEvent) => {
    event.preventDefault();
    if (!githubToken.trim()) return;
    setSyncing(true);
    try {
      const allStars: Record<string, unknown>[] = [];
      for (let page = 1; page <= 5; page += 1) {
        const response = await fetch(
          `https://api.github.com/user/starred?per_page=100&sort=updated&page=${page}`,
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
        const pageItems = (await response.json()) as Record<string, unknown>[];
        allStars.push(...pageItems);
        if (pageItems.length < 100) break;
      }
      setRepositories((current) => {
        const existing = new Map(current.map((repo) => [repo.id, repo]));
        allStars.forEach((raw) => {
          const imported = mapGithubRepository(raw);
          const old = existing.get(imported.id);
          existing.set(
            imported.id,
            old
              ? {
                  ...imported,
                  collection: old.collection,
                  note: old.note,
                  favorite: old.favorite,
                  archived: old.archived,
                  topics: Array.from(
                    new Set([...old.topics, ...imported.topics]),
                  ),
                }
              : imported,
          );
        });
        return Array.from(existing.values());
      });
      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem("reponest.lastSync", now);
      setGithubToken("");
      setModal(null);
      setToast(`已同步 ${allStars.length} 个 GitHub 星标`);
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
          collection: UNCATEGORIZED,
          note: "",
          favorite: false,
          archived: false,
          source: "bookmark",
        };
      }
      let duplicated = false;
      setRepositories((current) => {
        if (current.some((item) => item.id === repo.id)) {
          duplicated = true;
          return current;
        }
        return [repo, ...current];
      });
      setAddUrl("");
      setModal(null);
      setToast(duplicated ? "这个收藏已经在巢穴里了" : "收藏已加入你的巢穴");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "链接格式不正确");
    } finally {
      setAdding(false);
    }
  };

  const createCollection = (event: FormEvent) => {
    event.preventDefault();
    const name = collectionName.trim();
    if (!name) return;
    if (collections.some(([item]) => item === name)) {
      setToast("同名集合已经存在");
      return;
    }
    setCustomCollections((current) => [...current, name]);
    setActiveCollection(name);
    setActiveNav("all");
    setCollectionName("");
    setModal(null);
    setToast(`已创建集合「${name}」`);
  };

  const addTag = () => {
    if (!selected) return;
    const tag = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!tag || selected.topics.includes(tag)) {
      setTagInput("");
      return;
    }
    updateRepository(selected.id, {
      topics: [...selected.topics, tag].slice(0, 10),
    });
    setTagInput("");
  };

  const exportBackup = () => {
    const payload: BackupPayload = {
      app: "RepoNest",
      version: "0.1.0",
      exportedAt: new Date().toISOString(),
      repositories,
      collections: customCollections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reponest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(`已导出 ${repositories.length} 个收藏`);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as Partial<BackupPayload>;
      if (
        payload.app !== "RepoNest" ||
        !Array.isArray(payload.repositories) ||
        !payload.repositories.every(isRepository)
      ) {
        throw new Error("不是有效的 RepoNest 备份文件");
      }
      setRepositories(payload.repositories);
      if (Array.isArray(payload.collections)) {
        setCustomCollections(payload.collections.filter((item) => typeof item === "string"));
      }
      setModal(null);
      setToast(`已恢复 ${payload.repositories.length} 个收藏`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "备份文件读取失败");
    } finally {
      event.target.value = "";
    }
  };

  const restoreDemoData = () => {
    setRepositories(initialRepositories);
    setCustomCollections(initialCollections);
    setSelectedIds([]);
    setConfirmReset(false);
    setModal(null);
    setToast("已恢复 0.1.0 示例数据");
  };

  const resetFilters = () => {
    setSearch("");
    setLanguage(ALL_LANGUAGES);
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
      <div className="ambient ambient-pink" aria-hidden="true" />
      <div className="ambient ambient-blue" aria-hidden="true" />

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
              <BookmarkCheck size={18} strokeWidth={2.3} />
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
          <span className="new-button-icon">
            <Plus size={15} />
          </span>
          添加新收藏
          <span className="keycap">N</span>
        </button>

        <nav className="primary-nav" aria-label="主导航">
          <p className="eyebrow">我的空间</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const count =
              item.id === "favorites"
                ? favoritesCount
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
            <p className="eyebrow">我的集合</p>
            <button
              onClick={() => setModal("collection")}
              aria-label="创建集合"
            >
              <Plus size={14} />
            </button>
          </div>
          {collections.slice(0, 7).map(([name, count], index) => {
            const fallbackTones = ["pink", "violet", "blue", "khaki", "mint"];
            const meta = collectionMeta[name] || {
              tone: fallbackTones[index % fallbackTones.length],
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

        <div className="sidebar-organizer">
          <div className="organizer-head">
            <span>
              <WandSparkles size={14} />
              整理进度
            </span>
            <strong>{organizationScore}%</strong>
          </div>
          <div className="organizer-track">
            <span style={{ width: `${organizationScore}%` }} />
          </div>
          <p>{inboxCount} 个收藏还可以补充集合或笔记</p>
        </div>

        <div className="sidebar-footer">
          <button onClick={() => setModal("backup")}>
            <span className="workspace-avatar">RN</span>
            <span>
              <strong>本地工作区</strong>
              <small>{lastSync ? `同步于 ${relativeDate(lastSync)}` : "数据仅在本机"}</small>
            </span>
            <Settings2 size={16} />
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
              placeholder="搜索仓库、标签、集合或笔记…"
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
              className="icon-button backup-shortcut"
              onClick={() => setModal("backup")}
              aria-label="备份与恢复"
            >
              <Database size={17} />
            </button>
            <button className="icon-button" aria-label="通知">
              <Bell size={17} />
              <span className="notification-dot" />
            </button>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? "切换深色模式" : "切换浅色模式"}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="sync-button" onClick={() => setModal("sync")}>
              <RefreshCw size={15} />
              <span>同步 GitHub</span>
            </button>
          </div>
        </header>

        <div className="content-frame">
          <section className="hero-section">
            <div className="hero-copy-block">
              <span className="hero-pill">
                <Sparkles size={13} />
                Your calm corner for great software
              </span>
              <h1>
                让每一颗 Star，
                <br />
                都有<span>温柔的归处。</span>
              </h1>
              <p>
                收藏不该只是囤积。把值得记住的项目整理成
                <br className="desktop-break" />
                可搜索、可回顾、真正属于你的技术花园。
              </p>
              <div className="hero-actions">
                <button className="hero-primary" onClick={() => setModal("sync")}>
                  <GitBranch size={15} />
                  同步我的星标
                </button>
                <button onClick={() => setModal("backup")}>
                  <Upload size={15} />
                  导入收藏
                </button>
              </div>
            </div>

            <div className="hero-mosaic" aria-hidden="true">
              <div className="mosaic-orbit orbit-a" />
              <div className="mosaic-orbit orbit-b" />
              <div className="mosaic-card card-main">
                <span className="mosaic-icon violet">
                  <Code2 size={17} />
                </span>
                <div>
                  <small>shadcn-ui</small>
                  <strong>ui</strong>
                </div>
                <Star size={14} fill="currentColor" />
              </div>
              <div className="mosaic-card card-top">
                <span className="mosaic-icon blue">
                  <Cloud size={15} />
                </span>
                <div>
                  <small>immich-app</small>
                  <strong>immich</strong>
                </div>
              </div>
              <div className="mosaic-card card-bottom">
                <span className="mosaic-icon pink">
                  <Sparkles size={15} />
                </span>
                <div>
                  <small>langgenius</small>
                  <strong>dify</strong>
                </div>
              </div>
              <span className="mosaic-float float-star">
                <Star size={14} fill="currentColor" />
              </span>
              <span className="mosaic-float float-tag">
                <Tag size={14} />
              </span>
              <span className="mosaic-float float-bookmark">
                <Bookmark size={14} fill="currentColor" />
              </span>
            </div>
          </section>

          <section className="stats-grid" aria-label="收藏统计">
            <article className="stat-card stat-pink">
              <span className="stat-icon">
                <Library size={18} />
              </span>
              <div>
                <small>全部收藏</small>
                <strong>{repositories.length}</strong>
                <p>你的技术花园正在生长</p>
              </div>
              <span className="stat-trend">+8 本周</span>
            </article>
            <article className="stat-card stat-violet">
              <span className="stat-icon">
                <FolderHeart size={18} />
              </span>
              <div>
                <small>收藏集合</small>
                <strong>{collections.length}</strong>
                <p>主题清晰，更容易重逢</p>
              </div>
              <div className="mini-avatars">
                <i />
                <i />
                <i />
              </div>
            </article>
            <article className="stat-card stat-blue">
              <span className="stat-icon">
                <Star size={18} />
              </span>
              <div>
                <small>特别关注</small>
                <strong>{favoritesCount}</strong>
                <p>值得持续追踪的项目</p>
              </div>
              <span className="sparkline">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>
            <article className="stat-card stat-khaki">
              <span className="stat-icon">
                <WandSparkles size={18} />
              </span>
              <div>
                <small>整理完成度</small>
                <strong>{organizationScore}%</strong>
                <p>{inboxCount} 个项目等待完善</p>
              </div>
              <span
                className="round-progress"
                style={{
                  background: `conic-gradient(#bcae7f ${organizationScore}%, rgba(255,255,255,.52) 0)`,
                }}
              >
                <i />
              </span>
            </article>
          </section>

          <section className="library-section">
            <div className="section-heading">
              <div>
                <div className="breadcrumb">
                  <span>我的收藏</span>
                  <ChevronRight size={13} />
                  <strong>{currentTitle}</strong>
                </div>
                <h2>{currentTitle}</h2>
                <p>
                  找到 {visibleRepositories.length} 个收藏
                  {search && ` · 匹配“${search}”`}
                </p>
              </div>
              <div className="heading-actions">
                <button
                  className="soft-button"
                  onClick={() => setModal("collection")}
                >
                  <Folder size={15} />
                  新建集合
                </button>
                <button className="add-button" onClick={() => setModal("add")}>
                  <Plus size={16} />
                  添加收藏
                </button>
              </div>
            </div>

            <div className="filter-bar">
              <div className="filter-group">
                <button className="select-all" onClick={toggleSelectAll}>
                  {visibleRepositories.length > 0 &&
                  visibleRepositories.every((repo) =>
                    selectedSet.has(repo.id),
                  ) ? (
                    <CheckSquare size={15} />
                  ) : (
                    <Square size={15} />
                  )}
                  选择
                </button>
                <label>
                  <CircleDot size={13} />
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    aria-label="按语言筛选"
                  >
                    {languages.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                <label>
                  <ArrowDownUp size={13} />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="收藏排序"
                  >
                    <option value="recent">最近更新</option>
                    <option value="stars">Star 最多</option>
                    <option value="name">名称 A–Z</option>
                  </select>
                  <ChevronDown size={13} />
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

            {selectedIds.length > 0 && (
              <div className="bulk-bar">
                <span>
                  <Check size={14} /> 已选择 {selectedIds.length} 项
                </span>
                <button
                  onClick={() =>
                    bulkUpdate({ favorite: true }, "已加入特别关注")
                  }
                >
                  <Star size={14} /> 关注
                </button>
                <button
                  onClick={() => bulkUpdate({ archived: true }, "已批量归档")}
                >
                  <Archive size={14} /> 归档
                </button>
                <label>
                  <Folder size={14} />
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      bulkUpdate(
                        { collection: event.target.value },
                        `已移入「${event.target.value}」`,
                      );
                    }}
                    aria-label="批量移动集合"
                  >
                    <option value="" disabled>
                      移动到…
                    </option>
                    {collections.map(([name]) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <button className="bulk-cancel" onClick={() => setSelectedIds([])}>
                  取消
                </button>
              </div>
            )}

            {visibleRepositories.length > 0 ? (
              <div className={`repo-grid ${viewMode}`}>
                {visibleRepositories.map((repo, index) => (
                  <article
                    className={`repo-card accent-${index % 5} ${
                      selectedSet.has(repo.id) ? "is-selected" : ""
                    }`}
                    key={repo.id}
                    onClick={() => setSelected(repo)}
                  >
                    <button
                      className="card-selector"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSelection(repo.id);
                      }}
                      aria-label={
                        selectedSet.has(repo.id) ? "取消选择" : "选择收藏"
                      }
                    >
                      {selectedSet.has(repo.id) ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
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
                            size={15}
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
                              <Star size={12} />
                              {compactNumber(repo.stars)}
                            </span>
                            <span>
                              <GitFork size={12} />
                              {compactNumber(repo.forks)}
                            </span>
                          </>
                        )}
                      </div>
                      <time>{relativeDate(repo.updatedAt)}</time>
                    </div>
                    <div className="card-collection">
                      <Folder size={11} />
                      {repo.collection}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>
                  <Search size={24} />
                </span>
                <h3>暂时没有找到</h3>
                <p>换一个关键词，或者清除当前筛选条件。</p>
                <button onClick={resetFilters}>清除筛选</button>
              </div>
            )}
          </section>

          <footer className="app-footer">
            <span>RepoNest 0.1.0 · Local-first, softly organized.</span>
            <a
              href="https://github.com/Elainaicey/RepoNest"
              target="_blank"
              rel="noreferrer"
            >
              <GitBranch size={14} /> GitHub 开源
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
              <span className="drawer-kicker">
                <Sparkles size={12} />
                COLLECTION DETAIL
              </span>
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
                  {[...collections.map(([name]) => name), UNCATEGORIZED]
                    .filter((item, index, array) => array.indexOf(item) === index)
                    .map((item) => (
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
                  <button
                    key={topic}
                    onClick={() =>
                      updateRepository(selected.id, {
                        topics: selected.topics.filter((item) => item !== topic),
                      })
                    }
                    title="点击移除标签"
                  >
                    #{topic} <X size={11} />
                  </button>
                ))}
              </div>
              <div className="tag-editor">
                <Tag size={14} />
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="输入标签，按 Enter 添加"
                />
                <button onClick={addTag} aria-label="添加标签">
                  <Plus size={14} />
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
            onClick={() => {
              setModal(null);
              setConfirmReset(false);
            }}
            aria-label="关闭弹窗"
          />
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-head">
              <span className={`modal-icon modal-${modal}`}>
                {modal === "sync" && <GitBranch size={20} />}
                {modal === "add" && <Plus size={20} />}
                {modal === "collection" && <FolderHeart size={20} />}
                {modal === "backup" && <Database size={20} />}
              </span>
              <div>
                <p>
                  {modal === "sync" && "GITHUB SYNC"}
                  {modal === "add" && "NEW BOOKMARK"}
                  {modal === "collection" && "NEW COLLECTION"}
                  {modal === "backup" && "DATA PORTABILITY"}
                </p>
                <h2 id="modal-title">
                  {modal === "sync" && "同步你的 GitHub 星标"}
                  {modal === "add" && "添加一个新收藏"}
                  {modal === "collection" && "创建一个新集合"}
                  {modal === "backup" && "备份与恢复"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setModal(null);
                  setConfirmReset(false);
                }}
                aria-label="关闭弹窗"
              >
                <X size={18} />
              </button>
            </div>

            {modal === "sync" && (
              <form onSubmit={syncGithub}>
                <p className="modal-copy">
                  使用 GitHub Fine-grained Token 分页导入最多 500 个星标。
                  Token 只存在于当前页面内存，刷新后即清除。
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
                  只读取星标与公开仓库信息，不会修改 GitHub 数据
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
            )}

            {modal === "add" && (
              <form onSubmit={addRepository}>
                <p className="modal-copy">
                  粘贴 GitHub 仓库或任意网页链接。公开信息会被自动读取，
                  新收藏默认放入「未分类」。
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

            {modal === "collection" && (
              <form onSubmit={createCollection}>
                <p className="modal-copy">
                  用一个简短、容易记住的主题来组织收藏。空集合也会保留，
                  方便你稍后批量整理。
                </p>
                <label className="input-label" htmlFor="collection-name">
                  集合名称
                </label>
                <div className="large-input">
                  <Folder size={17} />
                  <input
                    id="collection-name"
                    value={collectionName}
                    onChange={(event) => setCollectionName(event.target.value)}
                    placeholder="例如：周末想试试"
                    maxLength={24}
                    autoFocus
                  />
                </div>
                <div className="palette-row" aria-label="集合配色预览">
                  <span className="pink" />
                  <span className="violet" />
                  <span className="blue" />
                  <span className="khaki" />
                  <span className="mint" />
                  <small>系统会自动分配柔和配色</small>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setModal(null)}>
                    取消
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={!collectionName.trim()}
                  >
                    <FolderHeart size={15} />
                    创建集合
                  </button>
                </div>
              </form>
            )}

            {modal === "backup" && (
              <div className="backup-panel">
                <p className="modal-copy">
                  将收藏、集合、标签与笔记导出为一个 JSON 文件，
                  可在另一台设备或另一个浏览器中恢复。
                </p>
                <div className="backup-options">
                  <button onClick={exportBackup}>
                    <span className="backup-option-icon violet">
                      <Download size={18} />
                    </span>
                    <span>
                      <strong>导出完整备份</strong>
                      <small>{repositories.length} 个收藏 · JSON 格式</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={() => importRef.current?.click()}>
                    <span className="backup-option-icon blue">
                      <Upload size={18} />
                    </span>
                    <span>
                      <strong>从备份恢复</strong>
                      <small>会替换当前浏览器中的数据</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <input
                    ref={importRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={importBackup}
                    hidden
                  />
                </div>
                <div className="backup-format">
                  <FileJson size={14} />
                  备份文件不包含 GitHub Token 或其他凭据
                </div>
                <div className="reset-zone">
                  {!confirmReset ? (
                    <button onClick={() => setConfirmReset(true)}>
                      <RotateCcw size={14} /> 恢复示例数据
                    </button>
                  ) : (
                    <div>
                      <span>这会覆盖当前收藏，确认继续？</span>
                      <button onClick={() => setConfirmReset(false)}>取消</button>
                      <button className="danger" onClick={restoreDemoData}>
                        确认恢复
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
