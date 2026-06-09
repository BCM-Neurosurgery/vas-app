#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_apptainer

if instance_running "$FASTAPI_INSTANCE"; then
    echo "Stopping FastAPI instance: $FASTAPI_INSTANCE"
    "$APPTAINER" instance stop "$FASTAPI_INSTANCE"
else
    echo "FastAPI instance is not running: $FASTAPI_INSTANCE"
fi

if instance_running "$MYSQL_INSTANCE"; then
    echo "Stopping MySQL instance: $MYSQL_INSTANCE"
    "$APPTAINER" instance stop "$MYSQL_INSTANCE"
else
    echo "MySQL instance is not running: $MYSQL_INSTANCE"
fi
