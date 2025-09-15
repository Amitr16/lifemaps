import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'life_sheet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 10, // Reduced from 20 to prevent connection exhaustion
  min: 2, // Keep minimum connections alive
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Increased timeout for stability
  acquireTimeoutMillis: 10000, // Time to wait for connection from pool
  allowExitOnIdle: true, // Allow process to exit when all connections are idle
};

console.log('🔍 Database connection config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password ? '***' : 'undefined'
});

const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit immediately, just log the error
  console.error('Stack trace:', err.stack);
});

// Monitor pool status
setInterval(() => {
  console.log(`[DB] Pool status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
}, 30000); // Every 30 seconds

// Wrap pool.query to monitor database queries
const originalQuery = pool.query.bind(pool);
pool.query = function(text, params, callback) {
  const start = Date.now();
  console.log(`[DB] Query started: ${text.substring(0, 100)}...`);
  
  // Handle both callback and promise-based queries
  if (callback) {
    // Callback-based query
    const wrappedCallback = function(err, result) {
      const duration = Date.now() - start;
      if (err) {
        console.error(`[DB] Query ERROR after ${duration}ms:`, err.message);
        console.error(`[DB] Query text:`, text);
        console.error(`[DB] Query params:`, params);
        console.error(`[DB] Error stack:`, err.stack);
      } else {
        console.log(`[DB] Query completed in ${duration}ms - Rows: ${result?.rowCount || 0}`);
        // Check if result is valid
        if (!result) {
          console.error(`[DB] WARNING: Query returned undefined result!`);
          console.error(`[DB] Query text:`, text);
          console.error(`[DB] Query params:`, params);
        }
      }
      callback(err, result);
    };
    
    return originalQuery(text, params, wrappedCallback);
  } else {
    // Promise-based query
    return originalQuery(text, params).then(result => {
      const duration = Date.now() - start;
      console.log(`[DB] Query completed in ${duration}ms - Rows: ${result?.rowCount || 0}`);
      // Check if result is valid
      if (!result) {
        console.error(`[DB] WARNING: Query returned undefined result!`);
        console.error(`[DB] Query text:`, text);
        console.error(`[DB] Query params:`, params);
      }
      return result;
    }).catch(err => {
      const duration = Date.now() - start;
      console.error(`[DB] Query ERROR after ${duration}ms:`, err.message);
      console.error(`[DB] Query text:`, text);
      console.error(`[DB] Query params:`, params);
      console.error(`[DB] Error stack:`, err.stack);
      throw err;
    });
  }
};

export default pool;
