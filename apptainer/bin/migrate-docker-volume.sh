#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

DOCKER=${DOCKER:-docker}
DOCKER_VOLUME=${DOCKER_VOLUME:-catdi-app_mysql_data}
MIGRATION_IMAGE=${MIGRATION_IMAGE:-alpine:3.20}

ensure_dirs

if ! command -v "$DOCKER" >/dev/null 2>&1; then
    echo "Docker was not found. Set DOCKER=/path/to/docker or run this on the Docker host." >&2
    exit 127
fi

if ! "$DOCKER" volume inspect "$DOCKER_VOLUME" >/dev/null 2>&1; then
    echo "Docker volume was not found: $DOCKER_VOLUME" >&2
    echo "Set DOCKER_VOLUME=... if this repo used a different Compose project name." >&2
    exit 1
fi

if [ -n "$(find "$MYSQL_DATA_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    cat >&2 <<EOF
Refusing to migrate into a non-empty Apptainer MySQL data directory:
$MYSQL_DATA_DIR

Move it aside or set MYSQL_DATA_DIR=/path/to/empty/datadir and retry.
EOF
    exit 1
fi

echo "Migrating Docker volume $DOCKER_VOLUME into $MYSQL_DATA_DIR"
"$DOCKER" run --rm \
    -v "$DOCKER_VOLUME:/from:ro" \
    -v "$MYSQL_DATA_DIR:/to" \
    "$MIGRATION_IMAGE" \
    sh -c "cd /from && tar cf - . | tar xpf - -C /to && chown -R $(id -u):$(id -g) /to"

echo "Migration complete."
echo "Apptainer MySQL data directory: $MYSQL_DATA_DIR"
