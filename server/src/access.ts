export function isGitHubLoginAllowed(
  ownerGitHubLogin: string | undefined,
  authenticatedLogin: string
) {
  if (!ownerGitHubLogin) return true;
  return ownerGitHubLogin.localeCompare(authenticatedLogin, undefined, {
    sensitivity: "accent"
  }) === 0;
}
