    -- Database setup for authentication and authorization
    -- Run this script in your MySQL database

    USE nodejsproj_db;

    -- Create users table (if it doesn't exist)
    CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    );

    -- Add last_login column if it doesn't exist (for existing tables)
    -- Note: MySQL doesn't support IF NOT EXISTS for ALTER COLUMN, so we use a procedure
    DELIMITER $$
    CREATE PROCEDURE AddLastLoginColumn()
    BEGIN
        IF NOT EXISTS (
            SELECT * FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'nodejsproj_db' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'last_login'
        ) THEN
            ALTER TABLE users ADD COLUMN last_login DATETIME;
        END IF;
    END$$
    DELIMITER ;

    CALL AddLastLoginColumn();
    DROP PROCEDURE AddLastLoginColumn;

    -- Create index on username for better performance
    CREATE INDEX IF NOT EXISTS idx_username ON users(username);

    -- Add user_id column to cats table (if it doesn't exist)
    DELIMITER $$
    CREATE PROCEDURE AddUserIdToCats()
    BEGIN
        IF NOT EXISTS (
            SELECT * FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'nodejsproj_db' 
            AND TABLE_NAME = 'cats' 
            AND COLUMN_NAME = 'user_id'
        ) THEN
            ALTER TABLE cats ADD COLUMN user_id INT;
            -- Optionally add foreign key constraint
            -- ALTER TABLE cats ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END$$
    DELIMITER ;

    CALL AddUserIdToCats();
    DROP PROCEDURE AddUserIdToCats();

    -- Create contact_messages table
    CREATE TABLE IF NOT EXISTS contact_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        subject VARCHAR(200),
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
    );

    -- Display all tables
    SHOW TABLES;

    -- Display users table structure
    DESCRIBE users;
