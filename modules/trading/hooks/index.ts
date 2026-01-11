"use client";

/**
 * Trading Module Hooks
 * React Query hooks for trading data
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllSecurities,
  fetchSecurityByTicker,
  fetchSecuritySearch,
  fetchPriceHistory,
  fetchLatestPrice,
  fetchSecuritySummary,
  fetchWatchlist,
  fetchWatchlistNames,
  fetchSyncStatus,
  fetchDatabaseStatus,
} from "../actions";
import type { PriceQueryParams } from "../types";

// Query key factory for consistent cache management
export const tradingKeys = {
  all: ["trading"] as const,
  securities: () => [...tradingKeys.all, "securities"] as const,
  security: (ticker: string) => [...tradingKeys.securities(), ticker] as const,
  securitySearch: (term: string) =>
    [...tradingKeys.securities(), "search", term] as const,
  prices: () => [...tradingKeys.all, "prices"] as const,
  priceHistory: (params: PriceQueryParams) =>
    [...tradingKeys.prices(), "history", params] as const,
  latestPrice: (ticker: string) =>
    [...tradingKeys.prices(), "latest", ticker] as const,
  summary: (ticker: string) =>
    [...tradingKeys.all, "summary", ticker] as const,
  watchlists: () => [...tradingKeys.all, "watchlists"] as const,
  watchlist: (name: string) => [...tradingKeys.watchlists(), name] as const,
  watchlistNames: () => [...tradingKeys.watchlists(), "names"] as const,
  syncStatus: () => [...tradingKeys.all, "sync"] as const,
  databaseStatus: () => [...tradingKeys.all, "database"] as const,
};

// ===================
// Security Hooks
// ===================

/**
 * Fetch all securities
 */
export function useSecurities() {
  return useQuery({
    queryKey: tradingKeys.securities(),
    queryFn: async () => {
      const result = await fetchAllSecurities();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
  });
}

/**
 * Fetch a single security by ticker
 */
export function useSecurity(ticker: string) {
  return useQuery({
    queryKey: tradingKeys.security(ticker),
    queryFn: async () => {
      const result = await fetchSecurityByTicker(ticker);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!ticker,
  });
}

/**
 * Search securities by ticker or name
 */
export function useSecuritySearch(searchTerm: string, limit?: number) {
  return useQuery({
    queryKey: tradingKeys.securitySearch(searchTerm),
    queryFn: async () => {
      const result = await fetchSecuritySearch(searchTerm, limit);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    enabled: searchTerm.length >= 1,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// ===================
// Price Hooks
// ===================

/**
 * Fetch price history for a ticker
 */
export function usePriceHistory(params: PriceQueryParams) {
  return useQuery({
    queryKey: tradingKeys.priceHistory(params),
    queryFn: async () => {
      const result = await fetchPriceHistory(params);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    enabled: !!params.ticker,
  });
}

/**
 * Fetch latest price for a ticker
 */
export function useLatestPrice(ticker: string) {
  return useQuery({
    queryKey: tradingKeys.latestPrice(ticker),
    queryFn: async () => {
      const result = await fetchLatestPrice(ticker);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!ticker,
    // Refresh more frequently for latest prices
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch security summary with key metrics
 */
export function useSecuritySummary(ticker: string) {
  return useQuery({
    queryKey: tradingKeys.summary(ticker),
    queryFn: async () => {
      const result = await fetchSecuritySummary(ticker);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!ticker,
  });
}

// ===================
// Watchlist Hooks
// ===================

/**
 * Fetch watchlist items
 */
export function useWatchlist(listName: string = "default") {
  return useQuery({
    queryKey: tradingKeys.watchlist(listName),
    queryFn: async () => {
      const result = await fetchWatchlist(listName);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
  });
}

/**
 * Fetch all watchlist names
 */
export function useWatchlistNames() {
  return useQuery({
    queryKey: tradingKeys.watchlistNames(),
    queryFn: async () => {
      const result = await fetchWatchlistNames();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
  });
}

// ===================
// System Hooks
// ===================

/**
 * Fetch sync status
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: tradingKeys.syncStatus(),
    queryFn: async () => {
      const result = await fetchSyncStatus();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    // Check sync status every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch database status
 */
export function useDatabaseStatus() {
  return useQuery({
    queryKey: tradingKeys.databaseStatus(),
    queryFn: async () => {
      const result = await fetchDatabaseStatus();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
  });
}

// ===================
// Utility Hook
// ===================

/**
 * Invalidate all trading queries
 * Useful after data sync operations
 */
export function useInvalidateTrading() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: tradingKeys.all });
  };
}
