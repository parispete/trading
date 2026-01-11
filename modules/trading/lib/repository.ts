/**
 * Trading Repository
 * Data access layer for stock prices and securities
 */

import { query, queryOne } from "./database";
import type {
  Security,
  DailyPrice,
  OHLC,
  PriceQueryParams,
  PriceStatistics,
  SecuritySummary,
  WatchlistItem,
  SyncStatus,
} from "../types";

// ===================
// Security Queries
// ===================

/**
 * Get all securities
 */
export async function getAllSecurities(): Promise<Security[]> {
  const results = await query<{
    id: number;
    ticker: string;
    name: string | null;
    exchange: string | null;
    asset_type: string;
    currency: string;
    first_trade_date: string | null;
    last_trade_date: string | null;
    is_active: boolean;
  }>("SELECT * FROM security ORDER BY ticker");

  return results.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    exchange: row.exchange,
    assetType: row.asset_type,
    currency: row.currency,
    firstTradeDate: row.first_trade_date
      ? new Date(row.first_trade_date)
      : null,
    lastTradeDate: row.last_trade_date ? new Date(row.last_trade_date) : null,
    isActive: row.is_active,
  }));
}

/**
 * Get security by ticker
 */
export async function getSecurityByTicker(
  ticker: string
): Promise<Security | null> {
  const row = await queryOne<{
    id: number;
    ticker: string;
    name: string | null;
    exchange: string | null;
    asset_type: string;
    currency: string;
    first_trade_date: string | null;
    last_trade_date: string | null;
    is_active: boolean;
  }>("SELECT * FROM security WHERE ticker = ?", [ticker.toUpperCase()]);

  if (!row) return null;

  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    exchange: row.exchange,
    assetType: row.asset_type,
    currency: row.currency,
    firstTradeDate: row.first_trade_date
      ? new Date(row.first_trade_date)
      : null,
    lastTradeDate: row.last_trade_date ? new Date(row.last_trade_date) : null,
    isActive: row.is_active,
  };
}

/**
 * Search securities by ticker or name
 */
export async function searchSecurities(
  searchTerm: string,
  limit: number = 20
): Promise<Security[]> {
  const term = `%${searchTerm.toUpperCase()}%`;
  const results = await query<{
    id: number;
    ticker: string;
    name: string | null;
    exchange: string | null;
    asset_type: string;
    currency: string;
    first_trade_date: string | null;
    last_trade_date: string | null;
    is_active: boolean;
  }>(
    `
    SELECT * FROM security 
    WHERE ticker LIKE ? OR UPPER(name) LIKE ?
    ORDER BY 
      CASE WHEN ticker = ? THEN 0 
           WHEN ticker LIKE ? THEN 1 
           ELSE 2 END,
      ticker
    LIMIT ?
  `,
    [term, term, searchTerm.toUpperCase(), `${searchTerm.toUpperCase()}%`, limit]
  );

  return results.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    exchange: row.exchange,
    assetType: row.asset_type,
    currency: row.currency,
    firstTradeDate: row.first_trade_date
      ? new Date(row.first_trade_date)
      : null,
    lastTradeDate: row.last_trade_date ? new Date(row.last_trade_date) : null,
    isActive: row.is_active,
  }));
}

// ===================
// Price Queries
// ===================

/**
 * Get price history for a ticker
 */
export async function getPriceHistory(
  params: PriceQueryParams
): Promise<OHLC[]> {
  const { ticker, startDate, endDate, adjusted = true } = params;

  const priceFields = adjusted
    ? "adj_open as open, adj_high as high, adj_low as low, adj_close as close, adj_volume as volume"
    : "open, high, low, close, volume";

  let sql = `
    SELECT 
      dp.price_date as date,
      ${priceFields}
    FROM daily_price dp
    JOIN security s ON dp.security_id = s.id
    WHERE s.ticker = ?
  `;

  const queryParams: (string | Date)[] = [ticker.toUpperCase()];

  if (startDate) {
    sql += " AND dp.price_date >= ?";
    queryParams.push(
      typeof startDate === "string" ? startDate : startDate.toISOString()
    );
  }

  if (endDate) {
    sql += " AND dp.price_date <= ?";
    queryParams.push(
      typeof endDate === "string" ? endDate : endDate.toISOString()
    );
  }

  sql += " ORDER BY dp.price_date ASC";

  const results = await query<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>(sql, queryParams);

  return results.map((row) => ({
    date: new Date(row.date),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}

/**
 * Get latest price for a ticker
 */
export async function getLatestPrice(
  ticker: string
): Promise<OHLC | null> {
  const result = await queryOne<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>(
    `
    SELECT 
      dp.price_date as date,
      dp.adj_open as open,
      dp.adj_high as high,
      dp.adj_low as low,
      dp.adj_close as close,
      dp.adj_volume as volume
    FROM daily_price dp
    JOIN security s ON dp.security_id = s.id
    WHERE s.ticker = ?
    ORDER BY dp.price_date DESC
    LIMIT 1
  `,
    [ticker.toUpperCase()]
  );

  if (!result) return null;

  return {
    date: new Date(result.date),
    open: result.open,
    high: result.high,
    low: result.low,
    close: result.close,
    volume: result.volume,
  };
}

/**
 * Get price statistics for a period
 */
export async function getPriceStatistics(
  ticker: string,
  startDate: Date,
  endDate: Date
): Promise<PriceStatistics | null> {
  const result = await queryOne<{
    ticker: string;
    period_start: string;
    period_end: string;
    start_price: number;
    end_price: number;
    high_price: number;
    low_price: number;
    avg_volume: number;
    trading_days: number;
    return_pct: number;
    volatility: number;
  }>(
    `
    WITH price_data AS (
      SELECT 
        dp.price_date,
        dp.adj_close,
        dp.adj_volume,
        LAG(dp.adj_close) OVER (ORDER BY dp.price_date) as prev_close
      FROM daily_price dp
      JOIN security s ON dp.security_id = s.id
      WHERE s.ticker = ?
        AND dp.price_date BETWEEN ? AND ?
      ORDER BY dp.price_date
    ),
    first_last AS (
      SELECT 
        FIRST_VALUE(adj_close) OVER (ORDER BY price_date) as start_price,
        LAST_VALUE(adj_close) OVER (ORDER BY price_date 
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as end_price
      FROM price_data
      LIMIT 1
    )
    SELECT 
      ? as ticker,
      MIN(pd.price_date) as period_start,
      MAX(pd.price_date) as period_end,
      fl.start_price,
      fl.end_price,
      MAX(pd.adj_close) as high_price,
      MIN(pd.adj_close) as low_price,
      AVG(pd.adj_volume) as avg_volume,
      COUNT(*) as trading_days,
      ((fl.end_price - fl.start_price) / fl.start_price * 100) as return_pct,
      STDDEV((pd.adj_close - pd.prev_close) / pd.prev_close) * SQRT(252) * 100 as volatility
    FROM price_data pd, first_last fl
    WHERE pd.prev_close IS NOT NULL
    GROUP BY fl.start_price, fl.end_price
  `,
    [ticker.toUpperCase(), startDate.toISOString(), endDate.toISOString(), ticker.toUpperCase()]
  );

  if (!result) return null;

  return {
    ticker: result.ticker,
    periodStart: new Date(result.period_start),
    periodEnd: new Date(result.period_end),
    startPrice: result.start_price,
    endPrice: result.end_price,
    highPrice: result.high_price,
    lowPrice: result.low_price,
    periodReturn: result.end_price - result.start_price,
    periodReturnPercent: result.return_pct,
    avgVolume: result.avg_volume,
    volatility: result.volatility || 0,
    tradingDays: result.trading_days,
  };
}

/**
 * Get security summary with key metrics
 */
export async function getSecuritySummary(
  ticker: string
): Promise<SecuritySummary | null> {
  const result = await queryOne<{
    ticker: string;
    name: string | null;
    last_price: number;
    last_date: string;
    prev_close: number;
    week_ago_close: number;
    month_ago_close: number;
    year_ago_close: number;
    fifty_two_week_high: number;
    fifty_two_week_low: number;
  }>(
    `
    WITH latest AS (
      SELECT 
        s.ticker,
        s.name,
        dp.price_date,
        dp.adj_close,
        ROW_NUMBER() OVER (ORDER BY dp.price_date DESC) as rn
      FROM daily_price dp
      JOIN security s ON dp.security_id = s.id
      WHERE s.ticker = ?
    ),
    historical AS (
      SELECT 
        adj_close as prev_close,
        (SELECT adj_close FROM latest WHERE rn = 
          (SELECT MIN(rn) FROM latest WHERE price_date <= DATE(
            (SELECT price_date FROM latest WHERE rn = 1), '-7 days'))) as week_ago,
        (SELECT adj_close FROM latest WHERE rn = 
          (SELECT MIN(rn) FROM latest WHERE price_date <= DATE(
            (SELECT price_date FROM latest WHERE rn = 1), '-1 month'))) as month_ago,
        (SELECT adj_close FROM latest WHERE rn = 
          (SELECT MIN(rn) FROM latest WHERE price_date <= DATE(
            (SELECT price_date FROM latest WHERE rn = 1), '-1 year'))) as year_ago
      FROM latest WHERE rn = 2
    ),
    yearly_range AS (
      SELECT 
        MAX(dp.adj_high) as high_52w,
        MIN(dp.adj_low) as low_52w
      FROM daily_price dp
      JOIN security s ON dp.security_id = s.id
      WHERE s.ticker = ?
        AND dp.price_date >= DATE('now', '-1 year')
    )
    SELECT 
      l.ticker,
      l.name,
      l.adj_close as last_price,
      l.price_date as last_date,
      COALESCE(h.prev_close, l.adj_close) as prev_close,
      COALESCE(h.week_ago, l.adj_close) as week_ago_close,
      COALESCE(h.month_ago, l.adj_close) as month_ago_close,
      COALESCE(h.year_ago, l.adj_close) as year_ago_close,
      yr.high_52w as fifty_two_week_high,
      yr.low_52w as fifty_two_week_low
    FROM latest l
    LEFT JOIN historical h ON 1=1
    CROSS JOIN yearly_range yr
    WHERE l.rn = 1
  `,
    [ticker.toUpperCase(), ticker.toUpperCase()]
  );

  if (!result) return null;

  const dayChange = result.last_price - result.prev_close;
  const weekChange = result.last_price - result.week_ago_close;
  const monthChange = result.last_price - result.month_ago_close;
  const yearChange = result.last_price - result.year_ago_close;

  return {
    ticker: result.ticker,
    name: result.name,
    lastPrice: result.last_price,
    lastDate: new Date(result.last_date),
    dayChange,
    dayChangePercent: (dayChange / result.prev_close) * 100,
    weekChange,
    weekChangePercent: (weekChange / result.week_ago_close) * 100,
    monthChange,
    monthChangePercent: (monthChange / result.month_ago_close) * 100,
    yearChange,
    yearChangePercent: (yearChange / result.year_ago_close) * 100,
    fiftyTwoWeekHigh: result.fifty_two_week_high,
    fiftyTwoWeekLow: result.fifty_two_week_low,
  };
}

// ===================
// Watchlist Queries
// ===================

/**
 * Get watchlist items with latest prices
 */
export async function getWatchlist(
  listName: string = "default"
): Promise<WatchlistItem[]> {
  const results = await query<{
    id: number;
    security_id: number;
    ticker: string;
    name: string | null;
    list_name: string;
    priority: number;
    added_at: string;
    notes: string | null;
    last_price: number | null;
    prev_close: number | null;
  }>(
    `
    SELECT 
      w.id,
      w.security_id,
      s.ticker,
      s.name,
      w.list_name,
      w.priority,
      w.added_at,
      w.notes,
      latest.adj_close as last_price,
      prev.adj_close as prev_close
    FROM watchlist w
    JOIN security s ON w.security_id = s.id
    LEFT JOIN (
      SELECT security_id, adj_close, price_date,
        ROW_NUMBER() OVER (PARTITION BY security_id ORDER BY price_date DESC) as rn
      FROM daily_price
    ) latest ON latest.security_id = s.id AND latest.rn = 1
    LEFT JOIN (
      SELECT security_id, adj_close,
        ROW_NUMBER() OVER (PARTITION BY security_id ORDER BY price_date DESC) as rn
      FROM daily_price
    ) prev ON prev.security_id = s.id AND prev.rn = 2
    WHERE w.list_name = ?
    ORDER BY w.priority ASC, s.ticker ASC
  `,
    [listName]
  );

  return results.map((row) => {
    const dayChange = row.last_price && row.prev_close
      ? row.last_price - row.prev_close
      : undefined;

    return {
      id: row.id,
      securityId: row.security_id,
      ticker: row.ticker,
      name: row.name,
      listName: row.list_name,
      priority: row.priority,
      addedAt: new Date(row.added_at),
      notes: row.notes,
      lastPrice: row.last_price ?? undefined,
      dayChange,
      dayChangePercent: dayChange && row.prev_close
        ? (dayChange / row.prev_close) * 100
        : undefined,
    };
  });
}

/**
 * Get all watchlist names
 */
export async function getWatchlistNames(): Promise<string[]> {
  const results = await query<{ list_name: string }>(
    "SELECT DISTINCT list_name FROM watchlist ORDER BY list_name"
  );
  return results.map((row) => row.list_name);
}

// ===================
// Sync Status Queries
// ===================

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const [lastSyncResult, statsResult] = await Promise.all([
    queryOne<{
      sync_date: string;
      status: string;
      error_details: string | null;
    }>(
      "SELECT sync_date, status, error_details FROM sync_log ORDER BY sync_date DESC LIMIT 1"
    ),
    queryOne<{
      symbols: number;
      records: number;
      oldest: string | null;
      newest: string | null;
    }>(`
      SELECT 
        (SELECT COUNT(*) FROM security WHERE is_active = true) as symbols,
        (SELECT COUNT(*) FROM daily_price) as records,
        (SELECT MIN(price_date) FROM daily_price) as oldest,
        (SELECT MAX(price_date) FROM daily_price) as newest
    `),
  ]);

  return {
    lastSync: lastSyncResult ? new Date(lastSyncResult.sync_date) : null,
    nextScheduledSync: null, // Set by scheduler
    symbolsTracked: statsResult?.symbols || 0,
    totalRecords: statsResult?.records || 0,
    oldestData: statsResult?.oldest ? new Date(statsResult.oldest) : null,
    newestData: statsResult?.newest ? new Date(statsResult.newest) : null,
    status: (lastSyncResult?.status as SyncStatus["status"]) || "idle",
    lastError: lastSyncResult?.error_details || null,
  };
}
