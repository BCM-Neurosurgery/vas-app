#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_apptainer
ensure_dirs
require_image "$MYSQL_IMAGE" "MySQL"
require_image "$FASTAPI_IMAGE" "FastAPI"

if ! instance_running "$MYSQL_INSTANCE"; then
    echo "Starting MySQL instance: $MYSQL_INSTANCE"
    "$APPTAINER" instance start \
        --cleanenv \
        --env "MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD" \
        --env "MYSQL_DATABASE=$MYSQL_DATABASE" \
        --env "MYSQL_USER=$MYSQL_USER" \
        --env "MYSQL_PASSWORD=$MYSQL_PASSWORD" \
        --env "MYSQL_TCP_PORT=$MYSQL_PORT" \
        --bind "$MYSQL_DATA_DIR:/var/lib/mysql" \
        --bind "$MYSQL_RUN_DIR:/run/mysqld" \
        --bind "$MYSQL_LOG_DIR:/var/log/mysql" \
        --bind "$REPO_ROOT/mysql/init:/docker-entrypoint-initdb.d:ro" \
        --bind "$REPO_ROOT/mysql/conf/my.cnf:/etc/mysql/conf.d/catdi.cnf:ro" \
        "$MYSQL_IMAGE" "$MYSQL_INSTANCE"
else
    echo "MySQL instance already running: $MYSQL_INSTANCE"
fi

echo "Waiting for MySQL on 127.0.0.1:$MYSQL_PORT"
wait_for_mysql

if ! instance_running "$FASTAPI_INSTANCE"; then
    echo "Starting FastAPI instance: $FASTAPI_INSTANCE"
    "$APPTAINER" instance start \
        --cleanenv \
        --env "FASTAPI_PORT=$FASTAPI_PORT" \
        --env "FASTAPI_RELOAD=$FASTAPI_RELOAD" \
        --env "DB_USER=$DB_USER" \
        --env "DB_PASS=$DB_PASS" \
        --env "DB_HOST=$DB_HOST" \
        --env "DB_PORT=$DB_PORT" \
        --env "DB_DATABASE=$DB_DATABASE" \
        --env "DATABASE_URL=mysql+pymysql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_DATABASE" \
        --env "LOG_PATH=/app/logs" \
        --bind "$API_LOG_DIR:/app/logs" \
        --bind "$REPO_ROOT/api:/app/api:ro" \
        --bind "$REPO_ROOT/utils:/app/utils:ro" \
        "$FASTAPI_IMAGE" "$FASTAPI_INSTANCE"
else
    echo "FastAPI instance already running: $FASTAPI_INSTANCE"
fi

cat <<EOF
Apptainer stack is up.

FastAPI: http://127.0.0.1:$FASTAPI_PORT
Docs:    http://127.0.0.1:$FASTAPI_PORT/docs
MySQL:   127.0.0.1:$MYSQL_PORT
EOF
