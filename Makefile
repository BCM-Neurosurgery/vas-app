.PHONY: help build up down restart logs clean db-reset

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
	docker volume rm vas-app_mysql_data || true
	docker-compose up -d

# Open shell in FastAPI container
shell:
	docker-compose exec fastapi /bin/bash

# Open MySQL shell
db-shell:
	docker-compose exec mysql mysql -u vas_user -pvas_password vas_db

# Show service status
status:
	docker-compose ps

# Show service health
health:
	docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
