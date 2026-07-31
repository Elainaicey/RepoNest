ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'folder',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE user_repositories
  ADD COLUMN IF NOT EXISTS rating smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_status text NOT NULL DEFAULT 'inbox',
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_repositories_rating_check'
  ) THEN
    ALTER TABLE user_repositories
      ADD CONSTRAINT user_repositories_rating_check CHECK (rating BETWEEN 0 AND 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_repositories_read_status_check'
  ) THEN
    ALTER TABLE user_repositories
      ADD CONSTRAINT user_repositories_read_status_check
      CHECK (read_status IN ('inbox', 'exploring', 'adopted'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'iris',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_idx
  ON tags(user_id, lower(name));

CREATE TABLE IF NOT EXISTS repository_tags (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, repository_id, tag_id)
);

CREATE INDEX IF NOT EXISTS repository_tags_repository_idx
  ON repository_tags(user_id, repository_id);
CREATE INDEX IF NOT EXISTS repository_tags_tag_idx
  ON repository_tags(user_id, tag_id);
CREATE INDEX IF NOT EXISTS user_repositories_status_idx
  ON user_repositories(user_id, read_status, hidden, archived);
