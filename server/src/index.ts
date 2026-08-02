import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import Fastify, {
  type FastifyReply,
  type FastifyRequest
} from "fastify";
import { z } from "zod";
import { isGitHubLoginAllowed } from "./access.js";
import { assertGitHubConfigured, config } from "./config.js";
import { encrypt, pkceChallenge, randomToken, sha256 } from "./crypto.js";
import { closeDatabase, migrate, pool } from "./db.js";
import {
  exchangeCode,
  fetchRepository,
  getGitHubUser,
  saveManualRepository,
  syncStars,
  tokenDates
} from "./github.js";
import {
  createSyncCoordinator,
  SyncInProgressError,
  type SyncReason
} from "./sync.js";

const app = Fastify({
  logger: {
    level: config.NODE_ENV === "production" ? "info" : "debug"
  },
  trustProxy: true
});

await app.register(cookie);
await app.register(helmet, {
  contentSecurityPolicy: false
});

const sessionCookie = "reponest_session";
const oauthStateCookie = "reponest_oauth_state";
const oauthVerifierCookie = "reponest_oauth_verifier";
const syncCoordinator = createSyncCoordinator(syncStars);

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.secureCookies,
  path: "/"
};

function startSyncInBackground(
  userId: string,
  reason: Exclude<SyncReason, "manual">,
  onError: (error: unknown) => void
) {
  try {
    void syncCoordinator.start(userId, reason).catch(onError);
  } catch (error) {
    if (!(error instanceof SyncInProgressError)) onError(error);
  }
}

type SessionUser = {
  id: string;
  github_id: string;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
  last_synced_at: Date | null;
};

const colorSchema = z.enum([
  "gray",
  "mauve",
  "slate",
  "sage",
  "olive",
  "sand",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "sky",
  "mint",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "yellow",
  "amber",
  "orange",
  "brown",
  "bronze",
  "gold"
]);
const readStatusSchema = z.enum(["inbox", "exploring", "adopted"]);

async function currentUser(request: FastifyRequest) {
  const token = request.cookies[sessionCookie];
  if (!token) return null;

  const result = await pool.query<SessionUser>(
    `SELECT u.id, u.github_id, u.login, u.name, u.avatar_url, u.email,
            u.last_synced_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  return result.rows[0] ?? null;
}

async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const user = await currentUser(request);
  if (!user) {
    await reply.code(401).send({ error: "authentication_required" });
    return null;
  }
  return user;
}

app.addHook("onRequest", async (request, reply) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  const origin = request.headers.origin;
  if (origin && origin !== config.publicUrl.origin) {
    await reply.code(403).send({ error: "origin_not_allowed" });
  }
});

app.get("/api/health", async () => {
  await pool.query("SELECT 1");
  return {
    status: "ok",
    version: "0.1.0",
    githubAuthConfigured: config.githubConfigured
  };
});

app.get("/api/auth/github", async (_request, reply) => {
  try {
    assertGitHubConfigured();
  } catch {
    return reply.code(503).send({ error: "github_auth_not_configured" });
  }

  const state = randomToken();
  const verifier = randomToken(48);
  reply.setCookie(oauthStateCookie, state, {
    ...cookieOptions,
    maxAge: 10 * 60
  });
  reply.setCookie(oauthVerifierCookie, verifier, {
    ...cookieOptions,
    maxAge: 10 * 60
  });

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", config.GITHUB_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", config.callbackUrl);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", pkceChallenge(verifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  return reply.redirect(authorizeUrl.toString());
});

app.get("/api/auth/github/callback", async (request, reply) => {
  const query = z
    .object({
      code: z.string().min(1),
      state: z.string().min(1)
    })
    .safeParse(request.query);
  const expectedState = request.cookies[oauthStateCookie];
  const verifier = request.cookies[oauthVerifierCookie];

  reply.clearCookie(oauthStateCookie, cookieOptions);
  reply.clearCookie(oauthVerifierCookie, cookieOptions);

  if (
    !query.success ||
    !expectedState ||
    query.data.state !== expectedState ||
    !verifier
  ) {
    return reply.redirect(
      new URL("/login?error=oauth_state", config.PUBLIC_URL).toString()
    );
  }

  try {
    assertGitHubConfigured();
    const token = await exchangeCode(query.data.code, verifier);
    const profile = await getGitHubUser(token.access_token);
    if (!isGitHubLoginAllowed(config.OWNER_GITHUB_LOGIN, profile.login)) {
      request.log.warn(
        { githubLogin: profile.login },
        "Rejected GitHub login outside the configured owner boundary"
      );
      return reply.redirect(
        new URL("/login?error=owner_restricted", config.PUBLIC_URL).toString()
      );
    }
    const dates = tokenDates(token);
    const userId = randomUUID();
    const result = await pool.query<{ id: string }>(
      `INSERT INTO users (
         id, github_id, login, name, avatar_url, email,
         access_token_encrypted, access_token_expires_at,
         refresh_token_encrypted, refresh_token_expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (github_id) DO UPDATE SET
         login = EXCLUDED.login,
         name = EXCLUDED.name,
         avatar_url = EXCLUDED.avatar_url,
         email = EXCLUDED.email,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         access_token_expires_at = EXCLUDED.access_token_expires_at,
         refresh_token_encrypted = COALESCE(
           EXCLUDED.refresh_token_encrypted,
           users.refresh_token_encrypted
         ),
         refresh_token_expires_at = COALESCE(
           EXCLUDED.refresh_token_expires_at,
           users.refresh_token_expires_at
         ),
         updated_at = now()
       RETURNING id`,
      [
        userId,
        profile.id,
        profile.login,
        profile.name,
        profile.avatar_url,
        profile.email,
        encrypt(token.access_token),
        dates.accessExpiresAt,
        token.refresh_token ? encrypt(token.refresh_token) : null,
        dates.refreshExpiresAt
      ]
    );
    const resolvedUserId = result.rows[0]!.id;

    await pool.query(
      `INSERT INTO collections (id, user_id, name, color, description, icon, pinned)
       VALUES
         ($1, $4, '稍后阅读', 'sky', '等待深入阅读与评估的项目', 'book', true),
         ($2, $4, '灵感', 'plum', '产品、设计与实现灵感', 'sparkles', true),
         ($3, $4, '工作台', 'jade', '已经进入当前工作流的工具', 'code', false)
       ON CONFLICT (user_id, name) DO NOTHING`,
      [randomUUID(), randomUUID(), randomUUID(), resolvedUserId]
    );
    await pool.query(
      `INSERT INTO tags (id, user_id, name, color, description)
       VALUES
         ($1, $5, '前端', 'iris', 'Web 与客户端技术'),
         ($2, $5, '后端', 'sky', '服务端框架与基础设施'),
         ($3, $5, '设计系统', 'plum', '组件、令牌与交互模式'),
         ($4, $5, '生产使用', 'jade', '已经进入实际项目的依赖')
       ON CONFLICT DO NOTHING`,
      [randomUUID(), randomUUID(), randomUUID(), randomUUID(), resolvedUserId]
    );

    const session = randomToken();
    await pool.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
      [sha256(session), resolvedUserId, config.SESSION_TTL_DAYS]
    );
    reply.setCookie(sessionCookie, session, {
      ...cookieOptions,
      maxAge: config.SESSION_TTL_DAYS * 24 * 60 * 60
    });

    startSyncInBackground(resolvedUserId, "initial", (error) =>
      request.log.error(error, "Initial GitHub sync failed")
    );
    return reply.redirect(new URL("/dashboard", config.PUBLIC_URL).toString());
  } catch (error) {
    request.log.error(error);
    return reply.redirect(
      new URL("/login?error=oauth_callback", config.PUBLIC_URL).toString()
    );
  }
});

app.post("/api/auth/logout", async (request, reply) => {
  const token = request.cookies[sessionCookie];
  if (token) {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
      sha256(token)
    ]);
  }
  reply.clearCookie(sessionCookie, cookieOptions);
  return reply.code(204).send();
});

app.get("/api/me", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  return {
    id: user.id,
    githubId: user.github_id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    email: user.email,
    lastSyncedAt: user.last_synced_at
  };
});

app.get("/api/repositories", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const query = z
    .object({
      scope: z
        .enum(["all", "stars", "bookmarks", "favorites", "archived"])
        .default("all"),
      repository: z.string().uuid().optional(),
      collection: z.string().uuid().optional(),
      tag: z.string().uuid().optional(),
      language: z.string().max(80).optional(),
      status: readStatusSchema.optional(),
      search: z.string().trim().max(120).optional(),
      sort: z
        .enum(["saved", "updated", "stars", "name", "rating"])
        .default("saved"),
      limit: z.coerce.number().int().min(1).max(100).default(48),
      offset: z.coerce.number().int().min(0).max(1_000_000).default(0)
    })
    .parse(request.query);

  const conditions = [
    "ur.user_id = $1",
    "ur.hidden = false",
    "(ur.starred = true OR ur.source = 'bookmark' OR ur.favorite = true)"
  ];
  const values: unknown[] = [user.id];
  if (query.scope === "stars") conditions.push("ur.starred = true", "ur.archived = false");
  if (query.scope === "bookmarks") conditions.push("ur.source = 'bookmark'", "ur.archived = false");
  if (query.scope === "favorites") conditions.push("ur.favorite = true", "ur.archived = false");
  if (query.scope === "archived") conditions.push("ur.archived = true");
  if (query.scope === "all") conditions.push("ur.archived = false");
  if (query.repository) {
    values.push(query.repository);
    conditions.push(`ur.repository_id = $${values.length}`);
  }
  if (query.collection) {
    values.push(query.collection);
    conditions.push(`ur.collection_id = $${values.length}`);
  }
  if (query.tag) {
    values.push(query.tag);
    conditions.push(`EXISTS (
      SELECT 1 FROM repository_tags filtered_tag
       WHERE filtered_tag.user_id = ur.user_id
         AND filtered_tag.repository_id = ur.repository_id
         AND filtered_tag.tag_id = $${values.length}
    )`);
  }
  if (query.status) {
    values.push(query.status);
    conditions.push(`ur.read_status = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    conditions.push(`(
      r.full_name ILIKE $${values.length}
      OR r.description ILIKE $${values.length}
      OR ur.note ILIKE $${values.length}
      OR EXISTS (
        SELECT 1 FROM repository_tags searchable_tag
        JOIN tags searchable_tag_data ON searchable_tag_data.id = searchable_tag.tag_id
        WHERE searchable_tag.user_id = ur.user_id
          AND searchable_tag.repository_id = ur.repository_id
          AND searchable_tag_data.name ILIKE $${values.length}
      )
    )`);
  }

  // Language facets intentionally ignore the active language so users can
  // switch languages without first resetting the current filter.
  const facetConditions = [...conditions];
  const facetValues = [...values];
  if (query.language) {
    values.push(query.language);
    conditions.push(`COALESCE(r.language, 'Other') = $${values.length}`);
  }

  const orderBy = {
    saved: "COALESCE(ur.starred_at, ur.created_at) DESC",
    updated: "COALESCE(r.pushed_at, r.updated_at) DESC",
    stars: "r.stars DESC",
    name: "r.full_name ASC",
    rating: "ur.rating DESC, COALESCE(ur.starred_at, ur.created_at) DESC"
  }[query.sort];
  const pageValues = [...values, query.limit, query.offset];
  const limitParameter = values.length + 1;
  const offsetParameter = values.length + 2;
  const [result, countResult, languageResult] = await Promise.all([
    pool.query(
      `SELECT r.id, r.github_id AS "githubId", r.owner, r.name,
             r.full_name AS "fullName", r.description, r.url, r.homepage,
            r.language, r.stars, r.forks, r.open_issues AS "openIssues",
            r.license, r.topics, r.pushed_at AS "pushedAt",
            ur.collection_id AS "collectionId", c.name AS "collectionName",
            ur.source, ur.starred, ur.favorite, ur.archived, ur.note,
            ur.rating, ur.read_status AS "readStatus",
            ur.starred_at AS "starredAt", ur.last_opened_at AS "lastOpenedAt",
            ur.updated_at AS "updatedAt",
            COALESCE(tag_data.tags, '[]'::json) AS tags
       FROM user_repositories ur
       JOIN repositories r ON r.id = ur.repository_id
       LEFT JOIN collections c ON c.id = ur.collection_id
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object('id', t.id, 'name', t.name, 'color', t.color)
           ORDER BY t.name
         ) AS tags
           FROM repository_tags rt
           JOIN tags t ON t.id = rt.tag_id
          WHERE rt.user_id = ur.user_id
            AND rt.repository_id = ur.repository_id
       ) tag_data ON true
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${limitParameter} OFFSET $${offsetParameter}`,
      pageValues
    ),
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
         FROM user_repositories ur
         JOIN repositories r ON r.id = ur.repository_id
        WHERE ${conditions.join(" AND ")}`,
      values
    ),
    pool.query<{ name: string; count: number }>(
      `SELECT COALESCE(r.language, 'Other') AS name, COUNT(*)::int AS count
         FROM user_repositories ur
         JOIN repositories r ON r.id = ur.repository_id
        WHERE ${facetConditions.join(" AND ")}
        GROUP BY COALESCE(r.language, 'Other')
        ORDER BY count DESC, name ASC`,
      facetValues
    )
  ]);
  const total = countResult.rows[0]?.total ?? 0;
  return {
    repositories: result.rows,
    total,
    limit: query.limit,
    offset: query.offset,
    hasMore: query.offset + result.rows.length < total,
    facets: { languages: languageResult.rows }
  };
});

const repositoryChangesSchema = z.object({
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
  note: z.string().trim().max(4000).nullable().optional(),
  collectionId: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  readStatus: readStatusSchema.optional(),
  tagIds: z.array(z.string().uuid()).max(30).optional(),
  addTagIds: z.array(z.string().uuid()).min(1).max(30).optional(),
  removeTagIds: z.array(z.string().uuid()).min(1).max(30).optional(),
  opened: z.boolean().optional()
});

type RepositoryChanges = z.infer<typeof repositoryChangesSchema>;

function hasTagChanges(changes: RepositoryChanges) {
  return (
    changes.tagIds !== undefined ||
    changes.addTagIds !== undefined ||
    changes.removeTagIds !== undefined
  );
}

function hasConflictingTagChanges(changes: RepositoryChanges) {
  return (
    changes.tagIds !== undefined &&
    (changes.addTagIds !== undefined || changes.removeTagIds !== undefined)
  );
}

async function validateCollection(userId: string, collectionId: string | null | undefined) {
  if (!collectionId) return true;
  const result = await pool.query(
    "SELECT 1 FROM collections WHERE id = $1 AND user_id = $2",
    [collectionId, userId]
  );
  return Boolean(result.rowCount);
}

app.patch("/api/repositories/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = repositoryChangesSchema.parse(request.body);
  if (hasConflictingTagChanges(body)) {
    return reply.code(400).send({ error: "conflicting_tag_changes" });
  }
  if (!(await validateCollection(user.id, body.collectionId))) {
    return reply.code(400).send({ error: "invalid_collection" });
  }
  const existing = await pool.query(
    `SELECT 1 FROM user_repositories
      WHERE user_id = $1 AND repository_id = $2`,
    [user.id, params.id]
  );
  if (!existing.rowCount) return reply.code(404).send({ error: "not_found" });

  const fields: string[] = [];
  const values: unknown[] = [user.id, params.id];
  const mapping = {
    favorite: "favorite",
    archived: "archived",
    note: "note",
    collectionId: "collection_id",
    rating: "rating",
    readStatus: "read_status"
  } as const;
  for (const [key, column] of Object.entries(mapping)) {
    const value = body[key as keyof typeof mapping];
    if (value !== undefined) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (body.opened) fields.push("last_opened_at = now()");
  if (!fields.length && !hasTagChanges(body)) {
    return reply.code(400).send({ error: "no_changes" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (fields.length) {
      const result = await client.query(
        `UPDATE user_repositories
            SET ${fields.join(", ")}, updated_at = now()
          WHERE user_id = $1 AND repository_id = $2
          RETURNING repository_id`,
        values
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "not_found" });
      }
    }
    if (body.tagIds !== undefined) {
      await client.query(
        "DELETE FROM repository_tags WHERE user_id = $1 AND repository_id = $2",
        [user.id, params.id]
      );
      if (body.tagIds.length) {
        await client.query(
          `INSERT INTO repository_tags (user_id, repository_id, tag_id)
           SELECT $1, $2, id FROM tags
            WHERE user_id = $1 AND id = ANY($3::uuid[])`,
          [user.id, params.id, body.tagIds]
        );
      }
    }
    if (body.addTagIds !== undefined) {
      await client.query(
        `INSERT INTO repository_tags (user_id, repository_id, tag_id)
         SELECT $1, $2, id FROM tags
          WHERE user_id = $1 AND id = ANY($3::uuid[])
         ON CONFLICT DO NOTHING`,
        [user.id, params.id, body.addTagIds]
      );
    }
    if (body.removeTagIds !== undefined) {
      await client.query(
        `DELETE FROM repository_tags
          WHERE user_id = $1 AND repository_id = $2
            AND tag_id = ANY($3::uuid[])`,
        [user.id, params.id, body.removeTagIds]
      );
    }
    await client.query("COMMIT");
    return { updated: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.post("/api/repositories/bulk", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const body = z
    .object({
      ids: z.array(z.string().uuid()).min(1).max(200),
      changes: repositoryChangesSchema.omit({ opened: true })
    })
    .parse(request.body);
  if (hasConflictingTagChanges(body.changes)) {
    return reply.code(400).send({ error: "conflicting_tag_changes" });
  }
  if (!(await validateCollection(user.id, body.changes.collectionId))) {
    return reply.code(400).send({ error: "invalid_collection" });
  }
  const fields: string[] = [];
  const values: unknown[] = [user.id, body.ids];
  const mapping = {
    favorite: "favorite",
    archived: "archived",
    note: "note",
    collectionId: "collection_id",
    rating: "rating",
    readStatus: "read_status"
  } as const;
  for (const [key, column] of Object.entries(mapping)) {
    const value = body.changes[key as keyof typeof mapping];
    if (value !== undefined) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (!fields.length && !hasTagChanges(body.changes)) {
    return reply.code(400).send({ error: "no_changes" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (fields.length) {
      await client.query(
        `UPDATE user_repositories SET ${fields.join(", ")}, updated_at = now()
          WHERE user_id = $1 AND repository_id = ANY($2::uuid[])`,
        values
      );
    }
    if (body.changes.tagIds !== undefined) {
      await client.query(
        "DELETE FROM repository_tags WHERE user_id = $1 AND repository_id = ANY($2::uuid[])",
        [user.id, body.ids]
      );
      if (body.changes.tagIds.length) {
        await client.query(
          `INSERT INTO repository_tags (user_id, repository_id, tag_id)
           SELECT $1, ur.repository_id, t.id
             FROM user_repositories ur
             CROSS JOIN tags t
            WHERE ur.user_id = $1
              AND ur.repository_id = ANY($2::uuid[])
              AND t.user_id = $1
              AND t.id = ANY($3::uuid[])`,
          [user.id, body.ids, body.changes.tagIds]
        );
      }
    }
    if (body.changes.addTagIds !== undefined) {
      await client.query(
        `INSERT INTO repository_tags (user_id, repository_id, tag_id)
         SELECT $1, ur.repository_id, t.id
           FROM user_repositories ur
           CROSS JOIN tags t
          WHERE ur.user_id = $1
            AND ur.repository_id = ANY($2::uuid[])
            AND t.user_id = $1
            AND t.id = ANY($3::uuid[])
         ON CONFLICT DO NOTHING`,
        [user.id, body.ids, body.changes.addTagIds]
      );
    }
    if (body.changes.removeTagIds !== undefined) {
      await client.query(
        `DELETE FROM repository_tags
          WHERE user_id = $1
            AND repository_id = ANY($2::uuid[])
            AND tag_id = ANY($3::uuid[])`,
        [user.id, body.ids, body.changes.removeTagIds]
      );
    }
    await client.query("COMMIT");
    return { updated: body.ids.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.delete("/api/repositories/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  await pool.query(
    `UPDATE user_repositories
        SET hidden = true, updated_at = now()
      WHERE user_id = $1 AND repository_id = $2`,
    [user.id, params.id]
  );
  return reply.code(204).send();
});

app.post("/api/bookmarks", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const body = z
    .object({
      repository: z.string().min(3).max(240),
      collectionId: z.string().uuid().nullable().optional()
    })
    .parse(request.body);
  if (!(await validateCollection(user.id, body.collectionId))) {
    return reply.code(400).send({ error: "invalid_collection" });
  }
  const match = body.repository
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "")
    .match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match) {
    return reply.code(400).send({ error: "invalid_github_repository" });
  }

  const repository = await fetchRepository(user.id, match[1]!, match[2]!);
  const id = await saveManualRepository(
    user.id,
    repository,
    body.collectionId
  );
  return reply.code(201).send({ id });
});

app.get("/api/collections", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const result = await pool.query(
    `SELECT c.id, c.name, c.color, c.description, c.icon, c.pinned,
            c.sort_order AS "sortOrder", COUNT(ur.repository_id)::int AS count
       FROM collections c
       LEFT JOIN user_repositories ur
         ON ur.collection_id = c.id AND ur.hidden = false
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.pinned DESC, c.sort_order ASC, c.created_at ASC`,
    [user.id]
  );
  return { collections: result.rows };
});

app.post("/api/collections", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const body = z
    .object({
      name: z.string().trim().min(1).max(60),
      color: colorSchema.default("iris"),
      description: z.string().trim().max(240).nullable().optional(),
      icon: z.enum(["folder", "code", "book", "sparkles", "briefcase", "rocket"]).default("folder")
    })
    .parse(request.body);
  const result = await pool.query(
    `INSERT INTO collections (id, user_id, name, color, description, icon)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, color, description, icon, pinned, sort_order AS "sortOrder"`,
    [randomUUID(), user.id, body.name, body.color, body.description ?? null, body.icon]
  );
  return reply.code(201).send(result.rows[0]);
});

app.patch("/api/collections/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({
    name: z.string().trim().min(1).max(60).optional(),
    color: colorSchema.optional(),
    description: z.string().trim().max(240).nullable().optional(),
    icon: z.enum(["folder", "code", "book", "sparkles", "briefcase", "rocket"]).optional(),
    pinned: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional()
  }).parse(request.body);
  const fields: string[] = [];
  const values: unknown[] = [params.id, user.id];
  const mapping = { name: "name", color: "color", description: "description", icon: "icon", pinned: "pinned", sortOrder: "sort_order" } as const;
  for (const [key, column] of Object.entries(mapping)) {
    const value = body[key as keyof typeof mapping];
    if (value !== undefined) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (!fields.length) return reply.code(400).send({ error: "no_changes" });
  const result = await pool.query(
    `UPDATE collections SET ${fields.join(", ")}, updated_at = now()
      WHERE id = $1 AND user_id = $2 RETURNING id`, values
  );
  if (!result.rowCount) return reply.code(404).send({ error: "not_found" });
  return { updated: true };
});

app.delete("/api/collections/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  await pool.query("DELETE FROM collections WHERE id = $1 AND user_id = $2", [
    params.id,
    user.id
  ]);
  return reply.code(204).send();
});

app.get("/api/tags", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const result = await pool.query(
    `SELECT t.id, t.name, t.color, t.description,
            COUNT(rt.repository_id)::int AS count
       FROM tags t
       LEFT JOIN repository_tags rt ON rt.tag_id = t.id AND rt.user_id = t.user_id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY COUNT(rt.repository_id) DESC, t.name ASC`,
    [user.id]
  );
  return { tags: result.rows };
});

app.post("/api/tags", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const body = z.object({
    name: z.string().trim().min(1).max(40),
    color: colorSchema.default("iris"),
    description: z.string().trim().max(160).nullable().optional()
  }).parse(request.body);
  const result = await pool.query(
    `INSERT INTO tags (id, user_id, name, color, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, color, description`,
    [randomUUID(), user.id, body.name, body.color, body.description ?? null]
  );
  return reply.code(201).send({ ...result.rows[0], count: 0 });
});

app.patch("/api/tags/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({
    name: z.string().trim().min(1).max(40).optional(),
    color: colorSchema.optional(),
    description: z.string().trim().max(160).nullable().optional()
  }).parse(request.body);
  const fields: string[] = [];
  const values: unknown[] = [params.id, user.id];
  for (const [key, column] of Object.entries({ name: "name", color: "color", description: "description" })) {
    const value = body[key as keyof typeof body];
    if (value !== undefined) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (!fields.length) return reply.code(400).send({ error: "no_changes" });
  const result = await pool.query(
    `UPDATE tags SET ${fields.join(", ")}, updated_at = now()
      WHERE id = $1 AND user_id = $2 RETURNING id`, values
  );
  if (!result.rowCount) return reply.code(404).send({ error: "not_found" });
  return { updated: true };
});

app.delete("/api/tags/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  await pool.query("DELETE FROM tags WHERE id = $1 AND user_id = $2", [params.id, user.id]);
  return reply.code(204).send();
});

app.get("/api/insights", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const [summary, languages, statuses, tags] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE hidden = false AND archived = false)::int AS total,
              COUNT(*) FILTER (WHERE starred = true AND hidden = false)::int AS stars,
              COUNT(*) FILTER (WHERE favorite = true AND hidden = false)::int AS favorites,
              COUNT(*) FILTER (WHERE note IS NOT NULL AND note <> '' AND hidden = false)::int AS notes,
              COUNT(*) FILTER (WHERE read_status = 'inbox' AND hidden = false AND archived = false)::int AS inbox
         FROM user_repositories WHERE user_id = $1`, [user.id]
    ),
    pool.query(
      `SELECT COALESCE(r.language, 'Other') AS name, COUNT(*)::int AS count
         FROM user_repositories ur JOIN repositories r ON r.id = ur.repository_id
        WHERE ur.user_id = $1 AND ur.hidden = false AND ur.archived = false
        GROUP BY r.language ORDER BY count DESC LIMIT 8`, [user.id]
    ),
    pool.query(
      `SELECT read_status AS name, COUNT(*)::int AS count
         FROM user_repositories
        WHERE user_id = $1 AND hidden = false AND archived = false
        GROUP BY read_status ORDER BY count DESC`, [user.id]
    ),
    pool.query(
      `SELECT t.name, t.color, COUNT(rt.repository_id)::int AS count
         FROM tags t LEFT JOIN repository_tags rt ON rt.tag_id = t.id
        WHERE t.user_id = $1 GROUP BY t.id ORDER BY count DESC LIMIT 8`, [user.id]
    )
  ]);
  return { summary: summary.rows[0], languages: languages.rows, statuses: statuses.rows, tags: tags.rows };
});

app.get("/api/sync/status", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  return {
    ...syncCoordinator.getStatus(user.id),
    lastSyncedAt: user.last_synced_at
  };
});

app.post("/api/sync", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  try {
    return await syncCoordinator.start(user.id, "manual");
  } catch (error) {
    if (error instanceof SyncInProgressError) {
      return reply.code(409).send({
        error: "sync_in_progress",
        status: syncCoordinator.getStatus(user.id)
      });
    }
    throw error;
  }
});

app.get("/api/backup", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const [repositories, collections, tags, repositoryTags] = await Promise.all([
    pool.query(
      `SELECT r.*, ur.collection_id, ur.source, ur.starred, ur.favorite,
              ur.archived, ur.note, ur.rating, ur.read_status, ur.starred_at
         FROM user_repositories ur
         JOIN repositories r ON r.id = ur.repository_id
        WHERE ur.user_id = $1 AND ur.hidden = false`,
      [user.id]
    ),
    pool.query(
      `SELECT id, name, color, description, icon, pinned, sort_order, created_at
         FROM collections WHERE user_id = $1`,
      [user.id]
    ),
    pool.query(
      "SELECT id, name, color, description, created_at FROM tags WHERE user_id = $1",
      [user.id]
    ),
    pool.query(
      `SELECT repository_id, tag_id FROM repository_tags WHERE user_id = $1`,
      [user.id]
    )
  ]);
  reply.header(
    "Content-Disposition",
    `attachment; filename="reponest-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  return {
    version: "0.1.0",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    repositories: repositories.rows,
    collections: collections.rows,
    tags: tags.rows,
    repositoryTags: repositoryTags.rows
  };
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error instanceof z.ZodError) {
    return reply.code(400).send({
      error: "validation_error",
      details: z.treeifyError(error)
    });
  }
  if ((error as { code?: string }).code === "23505") {
    return reply.code(409).send({ error: "already_exists" });
  }
  return reply.code(500).send({ error: "internal_server_error" });
});

await migrate();
await pool.query("DELETE FROM sessions WHERE expires_at <= now()");

async function scheduledSync() {
  const users = await pool.query<{ id: string }>(
    `SELECT id FROM users
      WHERE last_synced_at IS NULL
         OR last_synced_at < now() - ($1 || ' minutes')::interval`,
    [config.SYNC_INTERVAL_MINUTES]
  );
  for (const user of users.rows) {
    startSyncInBackground(user.id, "scheduled", (error) =>
      app.log.error(error, `Scheduled sync failed for ${user.id}`)
    );
  }
}

const syncTimer = setInterval(
  () => void scheduledSync(),
  config.SYNC_INTERVAL_MINUTES * 60_000
);
syncTimer.unref();

const shutdown = async () => {
  clearInterval(syncTimer);
  await app.close();
  await closeDatabase();
};
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

await app.listen({ host: config.HOST, port: config.PORT });
