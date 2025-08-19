-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS catdi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS 'catdi_user'@'%' IDENTIFIED BY 'catdi_password';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON catdi_db.* TO 'catdi_user'@'%';

-- Grant additional privileges for database creation (if needed)
GRANT CREATE ON *.* TO 'catdi_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Use the database
USE catdi_db;
