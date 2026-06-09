#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
APPTAINER_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
REPO_ROOT=$(cd "$APPTAINER_DIR/.." && pwd)

APPTAINER=${APPTAINER:-apptainer}
APPTAINER_BUILD_FLAGS=${APPTAINER_BUILD_FLAGS:-}

SIF_DIR=${SIF_DIR:-"$APPTAINER_DIR/images"}
DATA_DIR=${DATA_DIR:-"$APPTAINER_DIR/data"}
RUN_DIR=${RUN_DIR:-"$APPTAINER_DIR/run"}
LOG_DIR=${LOG_DIR:-"$REPO_ROOT/logs"}

FASTAPI_IMAGE=${FASTAPI_IMAGE:-"$SIF_DIR/catdi-fastapi.sif"}
MYSQL_IMAGE=${MYSQL_IMAGE:-"$SIF_DIR/catdi-mysql.sif"}

FASTAPI_INSTANCE=${FASTAPI_INSTANCE:-catdi-api}
MYSQL_INSTANCE=${MYSQL_INSTANCE:-catdi-mysql}

FASTAPI_PORT=${FASTAPI_PORT:-8090}
FASTAPI_RELOAD=${FASTAPI_RELOAD:-1}
MYSQL_PORT=${MYSQL_PORT:-3390}

MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpassword}
MYSQL_DATABASE=${MYSQL_DATABASE:-checkin_db}
MYSQL_USER=${MYSQL_USER:-db_user}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-db_password}

DB_USER=${DB_USER:-$MYSQL_USER}
DB_PASS=${DB_PASS:-$MYSQL_PASSWORD}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-$MYSQL_PORT}
DB_DATABASE=${DB_DATABASE:-$MYSQL_DATABASE}

MYSQL_DATA_DIR=${MYSQL_DATA_DIR:-"$DATA_DIR/mysql"}
MYSQL_RUN_DIR=${MYSQL_RUN_DIR:-"$RUN_DIR/mysqld"}
MYSQL_LOG_DIR=${MYSQL_LOG_DIR:-"$LOG_DIR/mysql"}
API_LOG_DIR=${API_LOG_DIR:-"$LOG_DIR"}

require_apptainer() {
    if ! command -v "$APPTAINER" >/dev/null 2>&1; then
        cat >&2 <<EOF
Apptainer was not found.

Expected command: $APPTAINER
Set APPTAINER=/path/to/apptainer or load the apptainer/1.4.5 module, then retry.
EOF
        exit 127
    fi
}

instance_log_dir() {
    local host
    local user

    host=$(hostname)
    user=$(id -un)

    if [ -d "$HOME/.apptainer/instances/logs/$host/$user" ]; then
        printf '%s\n' "$HOME/.apptainer/instances/logs/$host/$user"
    elif [ -d "$HOME/.singularity/instances/logs/$host/$user" ]; then
        printf '%s\n' "$HOME/.singularity/instances/logs/$host/$user"
    else
        printf '%s\n' "$HOME/.apptainer/instances/logs/$host/$user"
    fi
}

ensure_dirs() {
    mkdir -p "$SIF_DIR" "$DATA_DIR" "$RUN_DIR" "$MYSQL_DATA_DIR" "$MYSQL_RUN_DIR" "$MYSQL_LOG_DIR" "$API_LOG_DIR"
}

require_image() {
    local image=$1
    local label=$2

    if [ ! -f "$image" ]; then
        echo "Missing $label image: $image" >&2
        echo "Run: make apptainer-build" >&2
        exit 1
    fi
}

instance_running() {
    local name=$1
    "$APPTAINER" instance list "$name" 2>/dev/null | awk 'NR > 1 {print $1}' | grep -qx "$name"
}

wait_for_mysql() {
    local attempt

    for attempt in $(seq 1 60); do
        if "$APPTAINER" exec "instance://$MYSQL_INSTANCE" \
            mysqladmin ping \
            --host=127.0.0.1 \
            --port="$MYSQL_PORT" \
            --user=root \
            --password="$MYSQL_ROOT_PASSWORD" \
            --silent >/dev/null 2>&1; then
            return 0
        fi

        sleep 2
    done

    echo "MySQL did not become healthy on 127.0.0.1:$MYSQL_PORT." >&2
    echo "Try: make apptainer-logs" >&2
    return 1
}
