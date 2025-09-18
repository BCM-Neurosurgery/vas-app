-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS checkin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS 'db_user'@'%' IDENTIFIED BY 'db_password';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON checkin_db.* TO 'db_user'@'%';

-- Grant additional privileges for database creation (if needed)
GRANT CREATE ON *.* TO 'db_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Use the database
USE checkin_db;
