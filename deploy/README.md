# RepoNest deployment bundle

This directory contains the files used to create a production-style installation in `/opt/reponest`. PostgreSQL is bind-mounted at `/opt/reponest/data/postgres` by default, so administrators can see exactly where durable data lives.

## Installed layout

```text
/opt/reponest/
├── docker-compose.yml     # Web, API, and PostgreSQL service definitions
├── .env                   # Secrets and deployment settings (mode 600)
├── reponestctl            # Start, update, backup, restore, and diagnostics
├── Caddyfile.example      # Same-origin HTTPS reverse-proxy example
├── DEPLOYMENT.md          # This guide
├── data/
│   └── postgres/          # Durable PostgreSQL data visible on the host
├── backups/               # Compressed logical backups and checksums
└── systemd/               # Optional daily backup service and timer
```

Container logs use Docker log rotation and can be read with `./reponestctl logs`.
The `data/postgres` directory is visible for backup and capacity planning, but its files are PostgreSQL internals and must never be edited manually while the database is running.

## Why three containers?

RepoNest intentionally runs three single-purpose services:

- `reponest-web`: public Next.js interface;
- `reponest-api`: OAuth, GitHub synchronization, and REST API;
- `reponest-database`: PostgreSQL persistence.

This separation provides independent health checks, least-privilege boundaries, straightforward database backups, and safer upgrades. A single container would still contain multiple processes and would make failure handling and persistence less transparent. An installation with an externally managed PostgreSQL server can reduce the local count to two containers, but the standard self-contained deployment uses three.

## Common operations

```bash
sudo ./reponestctl start
sudo ./reponestctl status
sudo ./reponestctl health
sudo ./reponestctl logs api
sudo ./reponestctl backup
sudo ./reponestctl update latest
sudo ./reponestctl doctor
```

Optional daily backups at approximately 03:15 can be enabled with:

```bash
sudo cp systemd/reponest-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reponest-backup.timer
systemctl list-timers reponest-backup.timer
```

Copy important backups to a second machine or object-storage provider; a backup on the same VPS does not protect against disk loss.

Restore is intentionally interactive and creates a safety backup first:

```bash
sudo ./reponestctl restore backups/reponest-YYYYMMDDTHHMMSSZ.sql.gz
```

## Migrating the legacy named volume

Older Compose files stored PostgreSQL in `reponest_reponest-data`. Install the new bundle, keep the old volume, and run:

```bash
sudo ./reponestctl migrate-volume
```

The command creates a logical backup when the old database is running, stops the stack, copies the volume into `data/postgres`, verifies `PG_VERSION`, starts the new stack, and runs health checks. It does **not** delete the old volume.
