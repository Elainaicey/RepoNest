import assert from "node:assert/strict";
import test from "node:test";

const { isGitHubLoginAllowed } = await import("../dist/access.js");

test("allows every authenticated user when no owner boundary is configured", () => {
  assert.equal(isGitHubLoginAllowed(undefined, "octocat"), true);
});

test("matches the configured GitHub owner without case sensitivity", () => {
  assert.equal(isGitHubLoginAllowed("Elainaicey", "elainaicey"), true);
  assert.equal(isGitHubLoginAllowed("Elainaicey", "another-user"), false);
});
