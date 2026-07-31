#!/usr/bin/env sh
set -eu

INSTALL_DIR="${REPONEST_INSTALL_DIR:-/opt/reponest}"
INSTALL_REF="${REPONEST_INSTALL_REF:-main}"
BASE_URL="https://raw.githubusercontent.com/Elainaicey/RepoNest/${INSTALL_REF}"
TEMP_DIR="$(mktemp -d)"
INSTALL_MARKER="$INSTALL_DIR/.reponest-install"
trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM

info() { printf '[RepoNest] %s\n' "$*"; }
die() { printf '[RepoNest] ERROR: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required."
command -v docker >/dev/null 2>&1 || die "Docker is required."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."

if [ -d "$INSTALL_DIR" ] &&
   [ -n "$(find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ] &&
   [ ! -f "$INSTALL_MARKER" ]; then
  die "$INSTALL_DIR is not an empty RepoNest 0.1.0 installation directory. Choose an empty directory."
fi

download() {
  curl --fail --silent --show-error --location "$BASE_URL/$1" -o "$TEMP_DIR/$2"
}

info "Downloading the deployment bundle..."
download docker-compose.yml docker-compose.yml
download deploy/reponestctl reponestctl
download deploy/Caddyfile.example Caddyfile.example
download deploy/README.md DEPLOYMENT.md
download .env.example env.example

mkdir -p "$INSTALL_DIR/data/database" "$INSTALL_DIR/backups"
chmod 700 "$INSTALL_DIR/backups"
install -m 0644 "$TEMP_DIR/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"
install -m 0755 "$TEMP_DIR/reponestctl" "$INSTALL_DIR/reponestctl"
install -m 0644 "$TEMP_DIR/Caddyfile.example" "$INSTALL_DIR/Caddyfile.example"
install -m 0644 "$TEMP_DIR/DEPLOYMENT.md" "$INSTALL_DIR/DEPLOYMENT.md"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  install -m 0600 "$TEMP_DIR/env.example" "$INSTALL_DIR/.env"
  info "Created $INSTALL_DIR/.env. Configure it before starting RepoNest."
else
  info "Kept the existing $INSTALL_DIR/.env."
fi

printf 'reponest-install-v1\n' > "$INSTALL_MARKER"
chmod 0600 "$INSTALL_MARKER"

info "Installed in $INSTALL_DIR."
info "Next: edit .env, then run ./reponestctl start"
