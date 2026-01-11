/**
 * DuckDB Connection Manager
 * Manages database connections for the trading module
 */

import { Database } from "duckdb-async";
import { resolve } from "path";

// Use global to persist across Next.js hot-reloads
const globalForDb = globalThis as unknown as {
  duckdb: Database | null;
  duckdbPromise: Promise<Database> | null;
};

/**
 * Get database path from environment or use default
 */
function getDatabasePath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath) {
    return resolve(process.cwd(), envPath);
  }
  return resolve(process.cwd(), "data-sourcing/data/trading_data.duckdb");
}

/**
 * Initialize and return the database connection
 * Uses global singleton pattern to persist across hot-reloads
 */
export async function getDatabase(): Promise<Database> {
  // Return existing connection if available
  if (globalForDb.duckdb) {
    return globalForDb.duckdb;
  }

  // Return existing promise if connection is being established
  if (globalForDb.duckdbPromise) {
    return globalForDb.duckdbPromise;
  }

  const dbPath = getDatabasePath();

  // Create connection promise to prevent race conditions
  globalForDb.duckdbPromise = (async () => {
    try {
      const db = await Database.create(dbPath);
      globalForDb.duckdb = db;
      console.log(`Connected to database: ${dbPath}`);
      return db;
    } catch (error) {
      globalForDb.duckdbPromise = null;
      console.error("Failed to connect to database:", error);
      throw new Error(`Database connection failed: ${error}`);
    }
  })();

  return globalForDb.duckdbPromise;
}

/**
 * Close the database connection
 * Call this when shutting down the application
 */
export async function closeDatabase(): Promise<void> {
  if (globalForDb.duckdb) {
    await globalForDb.duckdb.close();
    globalForDb.duckdb = null;
    globalForDb.duckdbPromise = null;
    console.log("Database connection closed");
  }
}

/**
 * Execute a read-only query and return results
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const database = await getDatabase();
  
  try {
    const result = await database.all(sql, ...(params || []));
    return result as T[];
  } catch (error) {
    console.error("Query failed:", sql, error);
    throw error;
  }
}

/**
 * Execute a single-row query
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Check if the database has been initialized with the required tables
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const result = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'security'"
    );
    return result !== null && result.count > 0;
  } catch {
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  securities: number;
  priceRecords: number;
  oldestDate: Date | null;
  newestDate: Date | null;
}> {
  const database = await getDatabase();
  
  const [securitiesResult, pricesResult, dateRangeResult] = await Promise.all([
    database.all("SELECT COUNT(*) as count FROM security"),
    database.all("SELECT COUNT(*) as count FROM daily_price"),
    database.all(`
      SELECT 
        MIN(price_date) as oldest,
        MAX(price_date) as newest
      FROM daily_price
    `),
  ]);

  return {
    securities: (securitiesResult[0] as { count: number })?.count || 0,
    priceRecords: (pricesResult[0] as { count: number })?.count || 0,
    oldestDate: dateRangeResult[0]?.oldest
      ? new Date(dateRangeResult[0].oldest as string)
      : null,
    newestDate: dateRangeResult[0]?.newest
      ? new Date(dateRangeResult[0].newest as string)
      : null,
  };
}
