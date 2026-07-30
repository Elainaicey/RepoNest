import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import Fastify, {
  type FastifyReply,
  type FastifyRequest
} from "fastify";
import { z } from "zod";
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

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.secureCookies,
  path: "/"
};

type SessionUser = {
  id: string;
  github_id: string;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
  last_synced_at: Date | null;
};

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
      `INSERT INTO collections (id, user_id, name, color)
       VALUES
         ($1, $4, '稍后阅读', 'sky'),
         ($2, $4, '灵感', 'iris'),
         ($3, $4, '工作台', 'jade')
       ON CONFLICT (user_id, name) DO NOTHING`,
      [randomUUID(), randomUUID(), randomUUID(), resolvedUserId]
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

    void syncStars(resolvedUserId).catch((error) =>
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
      collection: z.string().uuid().optional(),
      search: z.string().max(120).optional()
    })
    .parse(request.query);

  const conditions = [
    "ur.user_id = $1",
    "ur.hidden = false",
    "(ur.starred = true OR ur.source = 'bookmark' OR ur.favorite = true)"
  ];
  const values: unknown[] = [user.id];
  if (query.scope === "stars") conditions.push("ur.starred = true", "ur.archived = false");
  if (query.scope === "bookmarks") {
    conditions.push("ur.source = 'bookmark'", "ur.archived = false");
  }
  if (query.scope === "favorites") {
    conditions.push("ur.favorite = true", "ur.archived = false");
  }
  if (query.scope === "archived") conditions.push("ur.archived = true");
  if (query.scope === "all") conditions.push("ur.archived = false");
  if (query.collection) {
    values.push(query.collection);
    conditions.push(`ur.collection_id = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    conditions.push(
      `(r.full_name ILIKE $${values.length} OR r.description ILIKE $${values.length})`
    );
  }

  const result = await pool.query(
    `SELECT r.id, r.github_id AS "githubId", r.owner, r.name,
            r.full_name AS "fullName", r.description, r.url, r.homepage,
            r.language, r.stars, r.forks, r.open_issues AS "openIssues",
            r.license, r.topics, r.pushed_at AS "pushedAt",
            ur.collection_id AS "collectionId", ur.source, ur.starred,
            ur.favorite, ur.archived, ur.note,
            ur.starred_at AS "starredAt", ur.updated_at AS "updatedAt"
       FROM user_repositories ur
       JOIN repositories r ON r.id = ur.repository_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(ur.starred_at, ur.updated_at) DESC
      LIMIT 1000`,
    values
  );
  return { repositories: result.rows };
});

app.patch("/api/repositories/:id", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z
    .object({
      favorite: z.boolean().optional(),
      archived: z.boolean().optional(),
      note: z.string().max(4000).nullable().optional(),
      collectionId: z.string().uuid().nullable().optional()
    })
    .parse(request.body);

  const fields: string[] = [];
  const values: unknown[] = [user.id, params.id];
  const mapping = {
    favorite: "favorite",
    archived: "archived",
    note: "note",
    collectionId: "collection_id"
  } as const;
  for (const [key, column] of Object.entries(mapping)) {
    const typedKey = key as keyof typeof mapping;
    if (body[typedKey] !== undefined) {
      values.push(body[typedKey]);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (!fields.length) return reply.code(400).send({ error: "no_changes" });

  const result = await pool.query(
    `UPDATE user_repositories
        SET ${fields.join(", ")}, updated_at = now()
      WHERE user_id = $1 AND repository_id = $2
      RETURNING repository_id`,
    values
  );
  if (!result.rowCount) return reply.code(404).send({ error: "not_found" });
  return { updated: true };
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
    `SELECT c.id, c.name, c.color, COUNT(ur.repository_id)::int AS count
       FROM collections c
       LEFT JOIN user_repositories ur
         ON ur.collection_id = c.id AND ur.hidden = false
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at ASC`,
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
      color: z
        .enum(["iris", "sky", "jade", "amber", "ruby", "plum", "sand"])
        .default("iris")
    })
    .parse(request.body);
  const result = await pool.query(
    `INSERT INTO collections (id, user_id, name, color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, color`,
    [randomUUID(), user.id, body.name, body.color]
  );
  return reply.code(201).send(result.rows[0]);
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

app.post("/api/sync", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  return syncStars(user.id);
});

app.get("/api/backup", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const [repositories, collections] = await Promise.all([
    pool.query(
      `SELECT r.*, ur.collection_id, ur.source, ur.starred, ur.favorite,
              ur.archived, ur.note, ur.starred_at
         FROM user_repositories ur
         JOIN repositories r ON r.id = ur.repository_id
        WHERE ur.user_id = $1 AND ur.hidden = false`,
      [user.id]
    ),
    pool.query(
      "SELECT id, name, color, created_at FROM collections WHERE user_id = $1",
      [user.id]
    )
  ]);
  reply.header(
    "Content-Disposition",
    `attachment; filename="reponest-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  return {
    version: "0.1.0",
    exportedAt: new Date().toISOString(),
    repositories: repositories.rows,
    collections: collections.rows
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
  return reply.code(500).send({ error: "internal_server_error" });
});

await migrate();
await pool.query("DELETE FROM sessions WHERE expires_at <= now()");

const syncing = new Set<string>();
async function scheduledSync() {
  const users = await pool.query<{ id: string }>(
    `SELECT id FROM users
      WHERE last_synced_at IS NULL
         OR last_synced_at < now() - ($1 || ' minutes')::interval`,
    [config.SYNC_INTERVAL_MINUTES]
  );
  for (const user of users.rows) {
    if (syncing.has(user.id)) continue;
    syncing.add(user.id);
    syncStars(user.id)
      .catch((error) => app.log.error(error, `Scheduled sync failed for ${user.id}`))
      .finally(() => syncing.delete(user.id));
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
