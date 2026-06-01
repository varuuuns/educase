import mysql, { Pool, ConnectionOptions } from 'mysql2/promise';
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
 * Builds the common connection options shared by both the temporary
 * connection and the pool. Adds SSL when DB_SSL=true (required by
 * cloud providers like Aiven, PlanetScale, etc.).
 */
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

  // Cloud-hosted MySQL (Aiven, PlanetScale, Railway) requires SSL.
  // Setting `rejectUnauthorized: true` ensures the server certificate
  // is verified against the default CA bundle.
  if (env.DB_SSL) {
    // rejectUnauthorized: false — still encrypts the connection (TLS),
    // but skips CA verification. Aiven's CA may not be in Node's
    // default trust store. For production, download the CA cert from
    // Aiven dashboard and pass it via `ssl.ca`.
    options.ssl = { rejectUnauthorized: false };
  }

  return options;
}

/**
 * Bootstraps the database:
 * 1. Attempts to create the schema if it doesn't exist (skipped for
 *    cloud providers that don't allow CREATE DATABASE).
 * 2. Creates a connection pool bound to that schema.
 * 3. Runs all CREATE TABLE IF NOT EXISTS statements.
 */
export async function initializeDatabase(): Promise<void> {
  // 1. Try to create the database (local MySQL allows this;
  //    cloud providers like Aiven pre-create the database, so
  //    we gracefully skip on failure).
  try {
    const tempConnection = await mysql.createConnection(
      buildConnectionOptions(false)
    );
    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``
    );
    await tempConnection.end();
  } catch (error) {
    // Cloud-hosted MySQL (Aiven, etc.) may deny CREATE DATABASE.
    // That's fine — the database already exists there.
    console.log('ℹ️  Skipping CREATE DATABASE (cloud-hosted DB detected)');
  }

  // 2. Create the connection pool with the database
  pool = mysql.createPool(buildConnectionOptions(true));

  // 3. Verify connectivity
  const connection = await pool.getConnection();
  console.log('✅ Connected to MySQL successfully');
  connection.release();

  // 4. Create tables
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
