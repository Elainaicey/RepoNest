# RepoNest deployment

RepoNest ships as one image and one Compose service. The Web application, API, OAuth flow, GitHub synchronization, and embedded PostgreSQL-compatible database are delivered together through a single loopback port.

## Installed layout

```text
/opt/reponest/
├── docker-compose.yml
├── .env
├── .reponest-install     # Installation marker
├── reponestctl
├── Caddyfile.example
├── DEPLOYMENT.md
├── data/
│   └── database/          # Durable application data
└── backups/              # Offline database snapshots and checksums
```

Only `data/database` is required to preserve the application state. Container images remain managed by Docker, while logs use Docker's configured size and file-count limits.

## Start and inspect

```bash
cd /opt/reponest
sudo ./reponestctl start
sudo ./reponestctl doctor
sudo docker compose ps
```

Exactly one container named `reponest` should be running. It binds only to `127.0.0.1:3000` by default.

## Caddy

```caddyfile
reponest.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

The GitHub App homepage and callback must use the same public origin. For the example above, the callback is `https://reponest.example.com/api/auth/github/callback`.

## Operations

```bash
sudo ./reponestctl status
sudo ./reponestctl logs
sudo ./reponestctl health
sudo ./reponestctl update latest
sudo ./reponestctl backup
sudo ./reponestctl restore backups/reponest-YYYYMMDDTHHMMSSZ.tar.gz
```

Backup briefly stops the container before archiving the database directory, then restarts and verifies the application. Restore validates archive paths, creates a pre-restore backup, and automatically rolls back if the restored database does not become healthy.

Store a copy of important backups outside the VPS.
