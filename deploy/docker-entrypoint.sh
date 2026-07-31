#!/bin/sh
set -eu

mkdir -p /data/database
chown reponest:reponest /data /data/database

exec su-exec reponest:reponest node /app/runtime/supervisor.mjs
