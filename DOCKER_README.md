# Docker Setup for VAS App

This directory contains the Docker configuration for running the VAS FastAPI backend with MySQL database.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Make (optional, for using the Makefile commands)

### 1. Build and Start Services
```bash
# Build the Docker images
make build

# Start all services
make up

# Or start with logs visible
make up-logs
```

### 2. Access Services
- **FastAPI Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **phpMyAdmin**: http://localhost:8080
- **MySQL**: localhost:3306

## 📁 File Structure

```
├── Dockerfile                 # FastAPI container definition
├── docker-compose.yml         # Main service configuration
├── docker-compose.override.yml # Development overrides
├── .dockerignore             # Files to exclude from Docker build
├── requirements.txt          # Python dependencies
├── Makefile                 # Common Docker commands
├── mysql/
│   ├── conf/                # MySQL configuration
│   └── init/                # Database initialization scripts
└── logs/                    # Application logs (created automatically)
```

## 🔧 Configuration

### Environment Variables
The following environment variables are set in the Docker Compose file:

- `DATABASE_URL`: MySQL connection string
- `LOG_PATH`: Path for application logs
- `CATMH_APP_ID`: Your CAT-MH API application ID
- `CATMH_ORG_ID`: Your CAT-MH API organization ID

### Database Credentials
- **Database**: `vas_db`
- **User**: `vas_user`
- **Password**: `vas_password`
- **Root Password**: `rootpassword`

## 📋 Available Commands

### Using Makefile (Recommended)
```bash
make help          # Show all available commands
make build         # Build Docker images
make up            # Start services
make down          # Stop services
make restart       # Restart services
make logs          # Show all logs
make fastapi       # Show FastAPI logs only
make mysql         # Show MySQL logs only
make clean         # Clean up everything
make db-reset      # Reset database
make shell         # Open shell in FastAPI container
make db-shell      # Open MySQL shell
make status        # Show service status
make health        # Show service health
```

### Using Docker Compose Directly
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start
docker-compose up --build -d
```

## 🗄️ Database Management

### Access phpMyAdmin
1. Open http://localhost:8080 in your browser
2. Login with:
   - Username: `vas_user`
   - Password: `vas_password`

### Access MySQL Directly
```bash
# Using Makefile
make db-shell

# Using Docker Compose
docker-compose exec mysql mysql -u vas_user -pvas_password vas_db
```

### Reset Database
```bash
make db-reset
```
This will:
- Stop all services
- Remove the MySQL data volume
- Restart services with a fresh database

## 🔍 Troubleshooting

### Check Service Status
```bash
make status
make health
```

### View Logs
```bash
# All services
make logs

# Specific service
make fastapi
make mysql
```

### Common Issues

#### Port Already in Use
If you get port conflicts, you can modify the ports in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Change 8000 to 8001
```

#### Database Connection Issues
1. Check if MySQL is running: `make status`
2. Verify MySQL is healthy: `make health`
3. Check MySQL logs: `make mysql`

#### FastAPI Issues
1. Check FastAPI logs: `make fastapi`
2. Verify the container is running: `make status`
3. Check if the API is responding: `curl http://localhost:8000/`

### Clean Slate
If you need to start completely fresh:
```bash
make clean
make build
make up
```

## 🚀 Production Considerations

For production deployment, consider:

1. **Security**: Change default passwords
2. **Volumes**: Use named volumes for persistent data
3. **Networks**: Restrict network access
4. **Environment**: Use `.env` files for sensitive data
5. **Monitoring**: Add health checks and monitoring
6. **Backup**: Implement database backup strategies

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
- [phpMyAdmin Docker Image](https://hub.docker.com/r/phpmyadmin/phpmyadmin)
