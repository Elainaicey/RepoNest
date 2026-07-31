export type User = {
  id: string;
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  email: string | null;
  lastSyncedAt: string | null;
};

export type RadixColor =
  | "gray"
  | "mauve"
  | "slate"
  | "sage"
  | "olive"
  | "sand"
  | "tomato"
  | "red"
  | "ruby"
  | "crimson"
  | "pink"
  | "plum"
  | "purple"
  | "violet"
  | "iris"
  | "indigo"
  | "blue"
  | "cyan"
  | "sky"
  | "mint"
  | "teal"
  | "jade"
  | "green"
  | "grass"
  | "lime"
  | "yellow"
  | "amber"
  | "orange"
  | "brown"
  | "bronze"
  | "gold";

export type Collection = {
  id: string;
  name: string;
  color: RadixColor;
  description: string | null;
  icon: "folder" | "code" | "book" | "sparkles" | "briefcase" | "rocket";
  pinned: boolean;
  sortOrder: number;
  count: number;
};

export type Tag = {
  id: string;
  name: string;
  color: RadixColor;
  description?: string | null;
  count?: number;
};

export type ReadStatus = "inbox" | "exploring" | "adopted";

export type Repository = {
  id: string;
  githubId: string | null;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  topics: string[];
  pushedAt: string | null;
  collectionId: string | null;
  collectionName: string | null;
  source: "github-star" | "bookmark";
  starred: boolean;
  favorite: boolean;
  archived: boolean;
  note: string | null;
  rating: number;
  readStatus: ReadStatus;
  tags: Tag[];
  starredAt: string | null;
  lastOpenedAt: string | null;
  updatedAt: string;
};

export type Insights = {
  summary: {
    total: number;
    stars: number;
    favorites: number;
    notes: number;
    inbox: number;
  };
  languages: Array<{ name: string; count: number }>;
  statuses: Array<{ name: ReadStatus; count: number }>;
  tags: Array<{ name: string; color: RadixColor; count: number }>;
};

export type RepositoryScope =
  | "all"
  | "stars"
  | "bookmarks"
  | "favorites"
  | "archived";
