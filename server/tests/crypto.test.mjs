import assert from "node:assert/strict";
import test from "node:test";

process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const { decrypt, encrypt, pkceChallenge, sha256 } = await import(
  "../dist/crypto.js"
);

test("encrypts sensitive values with a randomized authenticated envelope", () => {
  const first = encrypt("github-user-token");
  const second = encrypt("github-user-token");
  assert.notEqual(first, second);
  assert.equal(decrypt(first), "github-user-token");
  assert.equal(decrypt(second), "github-user-token");
});

test("creates stable hashes and PKCE challenges", () => {
  assert.equal(sha256("session"), sha256("session"));
  assert.notEqual(sha256("session"), sha256("another-session"));
  assert.match(pkceChallenge("verifier"), /^[A-Za-z0-9_-]{43}$/);
});
