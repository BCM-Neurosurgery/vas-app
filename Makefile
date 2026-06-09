.PHONY: help build up down restart logs clean db-reset apptainer-build apptainer-up apptainer-down apptainer-restart apptainer-status apptainer-logs apptainer-mysql apptainer-fastapi apptainer-shell apptainer-db-shell apptainer-migrate-volume

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build the Docker images"
	@echo "  up        - Start all services"
	@echo "  down      - Stop all services"
	@echo "  restart   - Restart all services"
	@echo "  logs      - Show logs for all services"
	@echo "  fastapi   - Show FastAPI logs only"
	@echo "  mysql     - Show MySQL logs only"
	@echo "  clean     - Remove containers, networks, and volumes"
	@echo "  db-reset  - Reset the database (remove volume)"
	@echo "  shell     - Open shell in FastAPI container"
	@echo "  db-shell  - Open MySQL shell"
	@echo ""
	@echo "Apptainer commands:"
	@echo "  apptainer-build          - Build Apptainer SIF images"
	@echo "  apptainer-up             - Start MySQL and FastAPI Apptainer instances"
	@echo "  apptainer-down           - Stop Apptainer instances"
	@echo "  apptainer-restart        - Restart Apptainer instances"
	@echo "  apptainer-status         - Show Apptainer instances"
	@echo "  apptainer-logs           - List Apptainer log files"
	@echo "  apptainer-mysql          - List MySQL log files"
	@echo "  apptainer-fastapi        - List FastAPI log files"
	@echo "  apptainer-shell          - Open shell in FastAPI image"
	@echo "  apptainer-db-shell       - Open MySQL shell in running instance"
	@echo "  apptainer-migrate-volume - Copy Docker MySQL volume into Apptainer data dir"

# Build the Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Start services and show logs
up-logs:
	docker-compose up

# Stop all services
down:
	docker-compose down

# Restart all services
restart:
	docker-compose restart

# Show logs for all services
logs:
	docker-compose logs -f

# Show FastAPI logs only
fastapi:
	docker-compose logs -f fastapi

# Show MySQL logs only
mysql:
	docker-compose logs -f mysql

# Clean up everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Reset database (remove volume)
db-reset:
	docker-compose down -v
	docker volume rm catdi-app_mysql_data || true
	docker-compose up -d

# Open shell in FastAPI container
shell:
	docker-compose exec fastapi /bin/bash

# Open MySQL shell
db-shell:
	docker-compose exec mysql mysql -u catdi_user -pcatdi_password catdi_db

# Show service status
status:
	docker-compose ps

# Show service health
health:
	docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Build Apptainer SIF images
apptainer-build:
	./apptainer/bin/build.sh

# Start Apptainer services
apptainer-up:
	./apptainer/bin/up.sh

# Stop Apptainer services
apptainer-down:
	./apptainer/bin/down.sh

# Restart Apptainer services
apptainer-restart: apptainer-down apptainer-up

# Show Apptainer service status
apptainer-status:
	./apptainer/bin/status.sh

# List Apptainer log files
apptainer-logs:
	./apptainer/bin/logs.sh

# List MySQL log files
apptainer-mysql:
	./apptainer/bin/logs.sh mysql

# List FastAPI log files
apptainer-fastapi:
	./apptainer/bin/logs.sh fastapi

# Open shell in FastAPI image
apptainer-shell:
	./apptainer/bin/shell-api.sh

# Open MySQL shell in running Apptainer instance
apptainer-db-shell:
	./apptainer/bin/shell-db.sh

# Migrate Docker Compose MySQL volume into Apptainer data directory
apptainer-migrate-volume:
	./apptainer/bin/migrate-docker-volume.sh
