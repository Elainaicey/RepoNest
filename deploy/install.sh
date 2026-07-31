#!/usr/bin/env sh
set -eu

INSTALL_DIR="${REPONEST_INSTALL_DIR:-/opt/reponest}"
INSTALL_REF="${REPONEST_INSTALL_REF:-main}"
BASE_URL="https://raw.githubusercontent.com/Elainaicey/RepoNest/${INSTALL_REF}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM

info() { printf '[RepoNest installer] %s\n' "$*"; }
die() { printf '[RepoNest installer] ERROR: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required."
command -v docker >/dev/null 2>&1 || die "Docker is required."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."

mkdir -p "$INSTALL_DIR" "$INSTALL_DIR/data/postgres" "$INSTALL_DIR/backups" "$INSTALL_DIR/systemd"
chmod 700 "$INSTALL_DIR/backups"

download() {
  source_path="$1"
  output_name="$2"
  curl --fail --silent --show-error --location "$BASE_URL/$source_path" -o "$TEMP_DIR/$output_name"
}

install_download() {
  source_name="$1"
  destination="$2"
  mode="$3"
  if [ -f "$destination" ]; then cp -p "$destination" "$destination.backup-$STAMP"; fi
  install -m "$mode" "$TEMP_DIR/$source_name" "$destination"
}

info "Downloading deployment bundle..."
download docker-compose.yml docker-compose.yml
download deploy/reponestctl reponestctl
download deploy/Caddyfile.example Caddyfile.example
download deploy/README.md DEPLOYMENT.md
download deploy/systemd/reponest-backup.service reponest-backup.service
download deploy/systemd/reponest-backup.timer reponest-backup.timer
download .env.example env.example

info "Installing deployment files into $INSTALL_DIR..."
install_download docker-compose.yml "$INSTALL_DIR/docker-compose.yml" 0644
install_download reponestctl "$INSTALL_DIR/reponestctl" 0755
install_download Caddyfile.example "$INSTALL_DIR/Caddyfile.example" 0644
install_download DEPLOYMENT.md "$INSTALL_DIR/DEPLOYMENT.md" 0644
install_download reponest-backup.service "$INSTALL_DIR/systemd/reponest-backup.service" 0644
install_download reponest-backup.timer "$INSTALL_DIR/systemd/reponest-backup.timer" 0644

if [ ! -f "$INSTALL_DIR/.env" ]; then
  install -m 0600 "$TEMP_DIR/env.example" "$INSTALL_DIR/.env"
  info "Created $INSTALL_DIR/.env from the example. Configure it before starting."
else
  info "Preserved existing $INSTALL_DIR/.env."
fi

if docker volume inspect reponest_reponest-data >/dev/null 2>&1 &&
   [ -z "$(find "$INSTALL_DIR/data/postgres" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  info "Legacy data detected. After configuring .env, run:"
  info "  cd $INSTALL_DIR && sudo ./reponestctl migrate-volume"
else
  info "Next steps:"
  info "  1. Edit $INSTALL_DIR/.env"
  info "  2. cd $INSTALL_DIR && sudo ./reponestctl start"
fi
