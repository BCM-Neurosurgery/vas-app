#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

target=${1:-all}

show_mysql_logs() {
    echo "== MySQL logs =="
    if [ -d "$MYSQL_LOG_DIR" ]; then
        find "$MYSQL_LOG_DIR" -maxdepth 1 -type f -print
    else
        echo "No MySQL log directory yet: $MYSQL_LOG_DIR"
    fi

    local instance_logs
    instance_logs=$(instance_log_dir)
    if [ -d "$instance_logs" ]; then
        find "$instance_logs" -maxdepth 1 -type f -name "$MYSQL_INSTANCE.*" -print
    fi
}

show_api_logs() {
    echo "== FastAPI logs =="
    if [ -d "$API_LOG_DIR" ]; then
        find "$API_LOG_DIR" -maxdepth 1 -type f -print
    else
        echo "No FastAPI log directory yet: $API_LOG_DIR"
    fi

    local instance_logs
    instance_logs=$(instance_log_dir)
    if [ -d "$instance_logs" ]; then
        find "$instance_logs" -maxdepth 1 -type f -name "$FASTAPI_INSTANCE.*" -print
    fi
}

case "$target" in
    all)
        show_mysql_logs
        show_api_logs
        ;;
    mysql)
        show_mysql_logs
        ;;
    fastapi|api)
        show_api_logs
        ;;
    *)
        echo "Usage: $0 [all|mysql|fastapi]" >&2
        exit 2
        ;;
esac
