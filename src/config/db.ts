import mysql, { Pool } from 'mysql2/promise';
import { env } from './env';

let pool: Pool;

/**
 * Returns the initialised MySQL connection pool.
 * Throws if called before `initializeDatabase()`.
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Bootstraps the database:
 * 1. Creates the schema if it doesn't exist (via a throw-away connection).
 * 2. Creates a connection pool bound to that schema.
 * 3. Runs all CREATE TABLE IF NOT EXISTS statements.
 */
export async function initializeDatabase(): Promise<void> {
  // 1. Create a temporary connection to create the database
  const tempConnection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  await tempConnection.execute(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``
  );
  await tempConnection.end();

  // 2. Create the connection pool with the database
  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // 3. Create tables
  await createTables();

  console.log('✅ Database initialized successfully');
}

/**
 * Runs all CREATE TABLE IF NOT EXISTS statements inside a single
 * connection so they share the same session.
 */
async function createTables(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        github_username VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NULL,
        bio TEXT NULL,
        avatar_url VARCHAR(512) NULL,
        location VARCHAR(255) NULL,
        company VARCHAR(255) NULL,
        blog VARCHAR(512) NULL,
        public_repos INT DEFAULT 0,
        public_gists INT DEFAULT 0,
        followers INT DEFAULT 0,
        following INT DEFAULT 0,
        account_created_at DATETIME NULL,
        profile_url VARCHAR(512) NULL,
        twitter_username VARCHAR(255) NULL,
        is_hireable BOOLEAN DEFAULT FALSE,
        account_type VARCHAR(50) DEFAULT 'User',
        follower_ratio DECIMAL(10,2) DEFAULT 0,
        account_age_days INT DEFAULT 0,
        analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profile_languages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_id INT NOT NULL,
        language VARCHAR(100) NOT NULL,
        bytes BIGINT DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profile_repositories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_id INT NOT NULL,
        repo_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        stars INT DEFAULT 0,
        forks INT DEFAULT 0,
        open_issues INT DEFAULT 0,
        primary_language VARCHAR(100) NULL,
        is_fork BOOLEAN DEFAULT FALSE,
        last_pushed_at DATETIME NULL,
        repo_url VARCHAR(512) NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);
  } finally {
    connection.release();
  }
}
