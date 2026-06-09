#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_apptainer
require_image "$FASTAPI_IMAGE" "FastAPI"

"$APPTAINER" shell \
    --cleanenv \
    --env "DB_USER=$DB_USER" \
    --env "DB_PASS=$DB_PASS" \
    --env "DB_HOST=$DB_HOST" \
    --env "DB_PORT=$DB_PORT" \
    --env "DB_DATABASE=$DB_DATABASE" \
    --env "PYTHONPATH=/app" \
    --bind "$API_LOG_DIR:/app/logs" \
    --bind "$REPO_ROOT/api:/app/api" \
    --bind "$REPO_ROOT/utils:/app/utils" \
    "$FASTAPI_IMAGE"
