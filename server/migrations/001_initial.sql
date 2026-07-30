CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  github_id bigint NOT NULL UNIQUE,
  login text NOT NULL,
  name text,
  avatar_url text NOT NULL,
  email text,
  access_token_encrypted text NOT NULL,
  access_token_expires_at timestamptz,
  refresh_token_encrypted text,
  refresh_token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'iris',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY,
  github_id bigint UNIQUE,
  owner text NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL UNIQUE,
  description text,
  url text NOT NULL,
  homepage text,
  language text,
  stars integer NOT NULL DEFAULT 0,
  forks integer NOT NULL DEFAULT 0,
  open_issues integer NOT NULL DEFAULT 0,
  license text,
  topics text[] NOT NULL DEFAULT '{}',
  pushed_at timestamptz,
  github_created_at timestamptz,
  github_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repositories_owner_name_idx ON repositories(owner, name);

CREATE TABLE IF NOT EXISTS user_repositories (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'github-star',
  starred boolean NOT NULL DEFAULT false,
  favorite boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  note text,
  starred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, repository_id)
);

CREATE INDEX IF NOT EXISTS user_repositories_user_idx
  ON user_repositories(user_id, archived, favorite, starred);
