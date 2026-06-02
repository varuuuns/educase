import mysql, { Pool, ConnectionOptions } from 'mysql2/promise';
import { env } from './env';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

function buildConnectionOptions(includeDatabase: boolean): ConnectionOptions {
  const options: ConnectionOptions = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (includeDatabase) {
    options.database = env.DB_NAME;
  }
  if (env.DB_SSL) {
    options.ssl = { rejectUnauthorized: false };
  }

  return options;
}

export async function initializeDatabase(): Promise<void> {
  try {
    const tempConnection = await mysql.createConnection(
      buildConnectionOptions(false)
    );
    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``
    );
    await tempConnection.end();
  } catch (error) {
    console.log('Skipping CREATE DATABASE (cloud-hosted DB detected)');
  }

  pool = mysql.createPool(buildConnectionOptions(true));

  const connection = await pool.getConnection();
  console.log('Connected to MySQL successfully');
  connection.release();

  await createTables();

  console.log('db initialized successfully');
}

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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profile_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_id INT NOT NULL,
        followers INT DEFAULT 0,
        following INT DEFAULT 0,
        public_repos INT DEFAULT 0,
        total_stars INT DEFAULT 0,
        follower_ratio DECIMAL(10,2) DEFAULT 0,
        snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_profile_snapshot (profile_id, snapshot_at)
      )
    `);
  } finally {
    connection.release();
  }
}
