#!/bin/bash

echo "🧹 Cleaning up Docker containers and volumes..."
docker-compose down -v

echo "🗑️  Removing MySQL data volume..."
docker volume rm vas-app_mysql_data 2>/dev/null || echo "Volume not found or already removed"

echo "🧽 Cleaning up any dangling containers/images..."
docker system prune -f

echo "🏗️  Rebuilding and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "📊 Checking service status..."
docker-compose ps

echo "🔍 Checking MySQL logs..."
docker-compose logs mysql | tail -20

echo "✅ Reset complete! Check the logs above for any errors."
