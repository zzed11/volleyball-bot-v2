import { Pool, PoolConfig } from 'pg';
import { getSecret } from './secrets';

let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 * @returns PostgreSQL Pool instance
 */
export async function initDbPool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  // Load database password from Secret Manager or environment
  const dbPassword = await getSecret('db-password');

  const config: PoolConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'volleyball',
    user: process.env.DB_USER || 'volleyball_app',
    password: dbPassword,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
  };

  pool = new Pool(config);

  // Error handler for pool
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
    process.exit(-1);
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }

  return pool;
}

/**
 * Get the existing database pool (synchronous)
 * Must call initDbPool() first
 * @returns PostgreSQL Pool instance
 */
export function getDbPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDbPool() first.');
  }
  return pool;
}

/**
 * Close the database connection pool
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed');
  }
}
