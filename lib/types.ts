export type User = {
  id: string;
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  email: string | null;
  lastSyncedAt: string | null;
};

export type Collection = {
  id: string;
  name: string;
  color: "iris" | "sky" | "jade" | "amber" | "ruby" | "plum" | "sand";
  count: number;
};

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
  source: "github-star" | "bookmark";
  starred: boolean;
  favorite: boolean;
  archived: boolean;
  note: string | null;
  starredAt: string | null;
  updatedAt: string;
};

export type RepositoryScope =
  | "all"
  | "stars"
  | "bookmarks"
  | "favorites"
  | "archived";
