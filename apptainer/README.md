# Apptainer orchestration

This folder mirrors the old Docker Compose backend stack with Apptainer instances.

It starts two services:

- MySQL 8.0 from `apptainer/defs/mysql.def`
- FastAPI from `apptainer/defs/fastapi.def`

Apptainer does not provide Compose-style service DNS or port mapping by default, so MySQL listens directly on `127.0.0.1:3390` and FastAPI connects to that host port.

## Commands

```bash
make apptainer-build
make apptainer-up
make apptainer-status
make apptainer-db-shell
make apptainer-down
```

FastAPI is available at `http://127.0.0.1:8090`, matching the host port in `docker-compose.yml`.

## Configuration

The scripts use these defaults:

```bash
MYSQL_PORT=3390
FASTAPI_PORT=8090
FASTAPI_RELOAD=1
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=checkin_db
MYSQL_USER=db_user
MYSQL_PASSWORD=db_password
```

Override them per command:

```bash
MYSQL_PORT=3391 FASTAPI_PORT=8090 make apptainer-up
```

On clusters, load Apptainer first, for example:

```bash
module load apptainer/1.4.5
```

If the command name is different, set:

```bash
APPTAINER=/path/to/apptainer make apptainer-build
```

## Persistent state

Mutable state is bind-mounted from the repo:

- MySQL data: `apptainer/data/mysql`
- MySQL runtime socket files: `apptainer/run/mysqld`
- logs: `logs/`

The SIF images are written to `apptainer/images/`.

## Migrating the Docker MySQL volume

Stop Docker Compose first:

```bash
docker-compose down
```

Then copy the old named volume into the Apptainer data directory:

```bash
make apptainer-migrate-volume
```

The default Docker volume name is `catdi-app_mysql_data`. Override it if needed:

```bash
DOCKER_VOLUME=my_project_mysql_data make apptainer-migrate-volume
```

The migration copies the raw MySQL data directory and changes ownership to the current user so rootless Apptainer can write to it. This is intended for the same MySQL major version (`mysql:8.0` to `mysql:8.0`). For cross-version migrations, use a SQL dump/restore instead.

The migration refuses to write into a non-empty Apptainer MySQL data directory.
