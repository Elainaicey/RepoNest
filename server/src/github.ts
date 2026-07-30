import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { config } from "./config.js";
import { decrypt, encrypt } from "./crypto.js";
import { pool } from "./db.js";

type GitHubTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  homepage: string | null;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics?: string[];
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
  owner: { login: string };
  license: { spdx_id: string } | null;
};

type StarredRepository = {
  starred_at: string;
  repo: GitHubRepository;
};

function headers(token: string, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": config.GITHUB_API_VERSION,
    "User-Agent": "RepoNest/0.1.0"
  };
}

async function githubFetch<T>(
  path: string,
  token: string,
  accept?: string
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: headers(token, accept)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "RepoNest/0.1.0"
    },
    body
  });
  const result = (await response.json()) as GitHubTokenResponse;
  if (!response.ok || result.error || !result.access_token) {
    throw new Error(
      result.error_description ?? result.error ?? "GitHub token exchange failed."
    );
  }
  return result;
}

export async function exchangeCode(code: string, verifier: string) {
  return tokenRequest(
    new URLSearchParams({
      client_id: config.GITHUB_CLIENT_ID!,
      client_secret: config.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: config.callbackUrl,
      code_verifier: verifier
    })
  );
}

export async function getGitHubUser(accessToken: string) {
  return githubFetch<GitHubUser>("/user", accessToken);
}

export function tokenDates(token: GitHubTokenResponse) {
  const now = Date.now();
  return {
    accessExpiresAt: token.expires_in
      ? new Date(now + token.expires_in * 1000)
      : null,
    refreshExpiresAt: token.refresh_token_expires_in
      ? new Date(now + token.refresh_token_expires_in * 1000)
      : null
  };
}

async function accessTokenForUser(userId: string) {
  const result = await pool.query<{
    access_token_encrypted: string;
    access_token_expires_at: Date | null;
    refresh_token_encrypted: string | null;
    refresh_token_expires_at: Date | null;
  }>(
    `SELECT access_token_encrypted, access_token_expires_at,
            refresh_token_encrypted, refresh_token_expires_at
       FROM users WHERE id = $1`,
    [userId]
  );
  const user = result.rows[0];
  if (!user) throw new Error("User not found.");

  const expiresSoon =
    user.access_token_expires_at &&
    user.access_token_expires_at.getTime() < Date.now() + 5 * 60_000;
  if (!expiresSoon) return decrypt(user.access_token_encrypted);

  if (
    !user.refresh_token_encrypted ||
    (user.refresh_token_expires_at &&
      user.refresh_token_expires_at.getTime() <= Date.now())
  ) {
    throw new Error("GitHub authorization expired. Please sign in again.");
  }

  const refreshed = await tokenRequest(
    new URLSearchParams({
      client_id: config.GITHUB_CLIENT_ID!,
      client_secret: config.GITHUB_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: decrypt(user.refresh_token_encrypted)
    })
  );
  const dates = tokenDates(refreshed);
  await pool.query(
    `UPDATE users
        SET access_token_encrypted = $1,
            access_token_expires_at = $2,
            refresh_token_encrypted = COALESCE($3, refresh_token_encrypted),
            refresh_token_expires_at = COALESCE($4, refresh_token_expires_at),
            updated_at = now()
      WHERE id = $5`,
    [
      encrypt(refreshed.access_token),
      dates.accessExpiresAt,
      refreshed.refresh_token ? encrypt(refreshed.refresh_token) : null,
      dates.refreshExpiresAt,
      userId
    ]
  );
  return refreshed.access_token;
}

async function upsertRepository(
  client: PoolClient,
  repository: GitHubRepository
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO repositories (
       id, github_id, owner, name, full_name, description, url, homepage,
       language, stars, forks, open_issues, license, topics, pushed_at,
       github_created_at, github_updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17
     )
     ON CONFLICT (github_id) DO UPDATE SET
       owner = EXCLUDED.owner,
       name = EXCLUDED.name,
       full_name = EXCLUDED.full_name,
       description = EXCLUDED.description,
       url = EXCLUDED.url,
       homepage = EXCLUDED.homepage,
       language = EXCLUDED.language,
       stars = EXCLUDED.stars,
       forks = EXCLUDED.forks,
       open_issues = EXCLUDED.open_issues,
       license = EXCLUDED.license,
       topics = EXCLUDED.topics,
       pushed_at = EXCLUDED.pushed_at,
       github_updated_at = EXCLUDED.github_updated_at,
       updated_at = now()
     RETURNING id`,
    [
      randomUUID(),
      repository.id,
      repository.owner.login,
      repository.name,
      repository.full_name,
      repository.description,
      repository.html_url,
      repository.homepage,
      repository.language,
      repository.stargazers_count,
      repository.forks_count,
      repository.open_issues_count,
      repository.license?.spdx_id ?? null,
      repository.topics ?? [],
      repository.pushed_at,
      repository.created_at,
      repository.updated_at
    ]
  );
  return result.rows[0]!.id;
}

export async function syncStars(userId: string) {
  const token = await accessTokenForUser(userId);
  const starred: StarredRepository[] = [];

  for (let page = 1; page <= config.MAX_SYNC_PAGES; page += 1) {
    const batch = await githubFetch<StarredRepository[]>(
      `/user/starred?per_page=100&page=${page}&sort=created&direction=desc`,
      token,
      "application/vnd.github.star+json"
    );
    starred.push(...batch);
    if (batch.length < 100) break;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE user_repositories
          SET starred = false, updated_at = now()
        WHERE user_id = $1 AND starred = true`,
      [userId]
    );

    for (const item of starred) {
      const repositoryId = await upsertRepository(client, item.repo);
      await client.query(
        `INSERT INTO user_repositories (
           user_id, repository_id, source, starred, starred_at
         ) VALUES ($1, $2, 'github-star', true, $3)
         ON CONFLICT (user_id, repository_id) DO UPDATE SET
           starred = true,
           starred_at = EXCLUDED.starred_at,
           hidden = false,
           updated_at = now()`,
        [userId, repositoryId, item.starred_at]
      );
    }

    await client.query(
      "UPDATE users SET last_synced_at = now(), updated_at = now() WHERE id = $1",
      [userId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { count: starred.length, syncedAt: new Date().toISOString() };
}

export async function fetchRepository(
  userId: string,
  owner: string,
  name: string
) {
  const token = await accessTokenForUser(userId);
  return githubFetch<GitHubRepository>(`/repos/${owner}/${name}`, token);
}

export async function saveManualRepository(
  userId: string,
  repository: GitHubRepository,
  collectionId?: string | null
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const repositoryId = await upsertRepository(client, repository);
    await client.query(
      `INSERT INTO user_repositories (
         user_id, repository_id, collection_id, source, starred
       ) VALUES ($1, $2, $3, 'bookmark', false)
       ON CONFLICT (user_id, repository_id) DO UPDATE SET
         collection_id = COALESCE(EXCLUDED.collection_id, user_repositories.collection_id),
         source = CASE
           WHEN user_repositories.source = 'github-star' THEN user_repositories.source
           ELSE 'bookmark'
         END,
         hidden = false,
         updated_at = now()`,
      [userId, repositoryId, collectionId ?? null]
    );
    await client.query("COMMIT");
    return repositoryId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
