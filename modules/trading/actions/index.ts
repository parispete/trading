"use server";

/**
 * Trading Server Actions
 * Server-side functions for trading data operations
 */

import {
  getAllSecurities,
  getSecurityByTicker,
  searchSecurities,
  getPriceHistory,
  getLatestPrice,
  getPriceStatistics,
  getSecuritySummary,
  getWatchlist,
  getWatchlistNames,
  getSyncStatus,
} from "../lib/repository";
import { getDatabaseStats, isDatabaseInitialized } from "../lib/database";
import type {
  Security,
  OHLC,
  PriceQueryParams,
  PriceStatistics,
  SecuritySummary,
  WatchlistItem,
  SyncStatus,
  ApiResponse,
} from "../types";

// ===================
// Security Actions
// ===================

export async function fetchAllSecurities(): Promise<ApiResponse<Security[]>> {
  try {
    const data = await getAllSecurities();
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch securities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchSecurityByTicker(
  ticker: string
): Promise<ApiResponse<Security | null>> {
  try {
    const data = await getSecurityByTicker(ticker);
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch security:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchSecuritySearch(
  searchTerm: string,
  limit: number = 20
): Promise<ApiResponse<Security[]>> {
  try {
    if (!searchTerm || searchTerm.length < 1) {
      return {
        success: true,
        data: [],
        timestamp: new Date(),
      };
    }
    const data = await searchSecurities(searchTerm, limit);
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to search securities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

// ===================
// Price Actions
// ===================

export async function fetchPriceHistory(
  params: PriceQueryParams
): Promise<ApiResponse<OHLC[]>> {
  try {
    const data = await getPriceHistory(params);
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch price history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchLatestPrice(
  ticker: string
): Promise<ApiResponse<OHLC | null>> {
  try {
    const data = await getLatestPrice(ticker);
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch latest price:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchPriceStatistics(
  ticker: string,
  startDate: string,
  endDate: string
): Promise<ApiResponse<PriceStatistics | null>> {
  try {
    const data = await getPriceStatistics(
      ticker,
      new Date(startDate),
      new Date(endDate)
    );
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch price statistics:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchSecuritySummary(
  ticker: string
): Promise<ApiResponse<SecuritySummary | null>> {
  try {
    const data = await getSecuritySummary(ticker);
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch security summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

// ===================
// Watchlist Actions
// ===================

export async function fetchWatchlist(
  listName: string = "default"
): Promise<ApiResponse<WatchlistItem[]>> {
  try {
    const data = await getWatchlist(listName);
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch watchlist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchWatchlistNames(): Promise<ApiResponse<string[]>> {
  try {
    const data = await getWatchlistNames();
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch watchlist names:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

// ===================
// System Actions
// ===================

export async function fetchSyncStatus(): Promise<ApiResponse<SyncStatus>> {
  try {
    const data = await getSyncStatus();
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch sync status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export async function fetchDatabaseStatus(): Promise<
  ApiResponse<{
    initialized: boolean;
    securities: number;
    priceRecords: number;
    oldestDate: Date | null;
    newestDate: Date | null;
  }>
> {
  try {
    const initialized = await isDatabaseInitialized();
    if (!initialized) {
      return {
        success: true,
        data: {
          initialized: false,
          securities: 0,
          priceRecords: 0,
          oldestDate: null,
          newestDate: null,
        },
        timestamp: new Date(),
      };
    }

    const stats = await getDatabaseStats();
    return {
      success: true,
      data: {
        initialized: true,
        ...stats,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to fetch database status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}
