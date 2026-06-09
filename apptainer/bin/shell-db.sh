#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_apptainer

if ! instance_running "$MYSQL_INSTANCE"; then
    echo "MySQL instance is not running. Run: make apptainer-up" >&2
    exit 1
fi

"$APPTAINER" exec "instance://$MYSQL_INSTANCE" \
    mysql \
    --host=127.0.0.1 \
    --port="$MYSQL_PORT" \
    --user="$MYSQL_USER" \
    --password="$MYSQL_PASSWORD" \
    "$MYSQL_DATABASE"
