import { z } from "zod";

const encryptionKey = z
  .string()
  .refine((value) => Buffer.from(value, "base64").length === 32, {
    message: "TOKEN_ENCRYPTION_KEY must be a Base64-encoded 32-byte key."
  });

const optionalGitHubLogin = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .min(1)
    .max(39)
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/)
    .optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().min(1).default("../data/database"),
  PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  OWNER_GITHUB_LOGIN: optionalGitHubLogin,
  GITHUB_API_VERSION: z.string().default("2026-03-10"),
  TOKEN_ENCRYPTION_KEY: encryptionKey.optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  MAX_SYNC_PAGES: z.coerce.number().int().min(1).max(100).default(50),
  COOKIE_SECURE: z.enum(["true", "false"]).optional()
});

const parsed = envSchema.parse(process.env);

export const config = {
  ...parsed,
  publicUrl: new URL(parsed.PUBLIC_URL),
  callbackUrl: new URL("/api/auth/github/callback", parsed.PUBLIC_URL).toString(),
  secureCookies:
    parsed.COOKIE_SECURE === "true" ||
    (parsed.COOKIE_SECURE !== "false" && parsed.NODE_ENV === "production"),
  githubConfigured: Boolean(
    parsed.GITHUB_CLIENT_ID &&
      parsed.GITHUB_CLIENT_SECRET &&
      parsed.TOKEN_ENCRYPTION_KEY
  )
};

export function assertGitHubConfigured() {
  if (!config.githubConfigured) {
    throw new Error(
      "GitHub authentication is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY."
    );
  }
}
