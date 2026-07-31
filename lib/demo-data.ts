import type { Collection, Repository, Tag, User } from "./types";

const now = new Date().toISOString();

export const demoUser: User = {
  id: "demo-user",
  githubId: "1",
  login: "octocat",
  name: "Mona",
  avatarUrl: "https://github.com/octocat.png",
  email: null,
  lastSyncedAt: now
};

export const demoCollections: Collection[] = [
  { id: "reading", name: "稍后阅读", color: "sky", count: 8, description: "待深入阅读与评估", icon: "book", pinned: true, sortOrder: 0 },
  { id: "inspiration", name: "设计灵感", color: "plum", count: 12, description: "产品与视觉参考", icon: "sparkles", pinned: true, sortOrder: 1 },
  { id: "workbench", name: "工作台", color: "jade", count: 6, description: "当前项目依赖与工具", icon: "code", pinned: false, sortOrder: 2 }
];

export const demoTags: Tag[] = [
  { id: "frontend", name: "前端", color: "iris", count: 2, description: "Web 与客户端技术" },
  { id: "design-system", name: "设计系统", color: "plum", count: 2, description: "组件、令牌与交互模式" },
  { id: "backend", name: "后端", color: "sky", count: 1, description: "服务端框架与基础设施" },
  { id: "production", name: "生产使用", color: "jade", count: 1, description: "已进入实际项目的依赖" }
];

export const demoRepositories: Repository[] = [
  {
    id: "next",
    githubId: "70107786",
    owner: "vercel",
    name: "next.js",
    fullName: "vercel/next.js",
    description: "The React Framework for the Web",
    url: "https://github.com/vercel/next.js",
    homepage: "https://nextjs.org",
    language: "JavaScript",
    stars: 139742,
    forks: 30111,
    openIssues: 2548,
    license: "MIT",
    topics: ["react", "framework", "web"],
    pushedAt: now,
    collectionId: "workbench",
    collectionName: "工作台",
    source: "github-star",
    starred: true,
    favorite: true,
    archived: false,
    note: "关注 App Router 与服务端组件的演进。",
    rating: 5,
    readStatus: "adopted",
    tags: [
      { id: "frontend", name: "前端", color: "iris" },
      { id: "production", name: "生产使用", color: "jade" }
    ],
    starredAt: now,
    lastOpenedAt: now,
    updatedAt: now
  },
  {
    id: "radix",
    githubId: "262909776",
    owner: "radix-ui",
    name: "themes",
    fullName: "radix-ui/themes",
    description: "Radix Themes is an open-source component library optimized for fast development.",
    url: "https://github.com/radix-ui/themes",
    homepage: "https://radix-ui.com/themes",
    language: "TypeScript",
    stars: 8592,
    forks: 518,
    openIssues: 193,
    license: "MIT",
    topics: ["design-system", "react", "accessibility"],
    pushedAt: now,
    collectionId: "inspiration",
    collectionName: "设计灵感",
    source: "github-star",
    starred: true,
    favorite: false,
    archived: false,
    note: null,
    rating: 4,
    readStatus: "exploring",
    tags: [
      { id: "design-system", name: "设计系统", color: "plum" },
      { id: "frontend", name: "前端", color: "iris" }
    ],
    starredAt: now,
    lastOpenedAt: null,
    updatedAt: now
  },
  {
    id: "fastify",
    githubId: "57053402",
    owner: "fastify",
    name: "fastify",
    fullName: "fastify/fastify",
    description: "Fast and low overhead web framework, for Node.js",
    url: "https://github.com/fastify/fastify",
    homepage: "https://fastify.dev",
    language: "JavaScript",
    stars: 34612,
    forks: 2531,
    openIssues: 162,
    license: "MIT",
    topics: ["nodejs", "web-framework", "performance"],
    pushedAt: now,
    collectionId: "reading",
    collectionName: "稍后阅读",
    source: "bookmark",
    starred: false,
    favorite: false,
    archived: false,
    note: "后端 API 的基础框架。",
    rating: 4,
    readStatus: "inbox",
    tags: [{ id: "backend", name: "后端", color: "sky" }],
    starredAt: null,
    lastOpenedAt: null,
    updatedAt: now
  },
  {
    id: "lucide",
    githubId: "547096675",
    owner: "lucide-icons",
    name: "lucide",
    fullName: "lucide-icons/lucide",
    description: "Beautiful & consistent icon toolkit made by the community.",
    url: "https://github.com/lucide-icons/lucide",
    homepage: "https://lucide.dev",
    language: "TypeScript",
    stars: 22437,
    forks: 993,
    openIssues: 262,
    license: "ISC",
    topics: ["icons", "svg", "design"],
    pushedAt: now,
    collectionId: "inspiration",
    collectionName: "设计灵感",
    source: "github-star",
    starred: true,
    favorite: false,
    archived: false,
    note: null,
    rating: 3,
    readStatus: "exploring",
    tags: [{ id: "design-system", name: "设计系统", color: "plum" }],
    starredAt: now,
    lastOpenedAt: null,
    updatedAt: now
  }
];
