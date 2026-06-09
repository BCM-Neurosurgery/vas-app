#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_apptainer
ensure_dirs

cd "$REPO_ROOT"

echo "Building MySQL image: $MYSQL_IMAGE"
"$APPTAINER" build $APPTAINER_BUILD_FLAGS "$MYSQL_IMAGE" "$APPTAINER_DIR/defs/mysql.def"

echo "Building FastAPI image: $FASTAPI_IMAGE"
"$APPTAINER" build $APPTAINER_BUILD_FLAGS "$FASTAPI_IMAGE" "$APPTAINER_DIR/defs/fastapi.def"

echo "Apptainer images are ready in $SIF_DIR"
