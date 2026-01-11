"use client";

/**
 * Trading Journal Hooks
 * React Query hooks for journal operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Depot,
  DepotInput,
  TradePosition,
  TradePositionInput,
  ClosePositionInput,
  RollInput,
  Dividend,
  DividendInput,
  ScreeningProfile,
  UserSettings,
} from "../types";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const journalKeys = {
  all: ["journal"] as const,
  // Depots
  depots: () => [...journalKeys.all, "depots"] as const,
  depot: (id: number) => [...journalKeys.depots(), id] as const,
  // Trades
  trades: () => [...journalKeys.all, "trades"] as const,
  openPositions: (depotId?: number) =>
    [...journalKeys.trades(), "open", depotId] as const,
  tradeHistory: (params: Record<string, unknown>) =>
    [...journalKeys.trades(), "history", params] as const,
  trade: (id: number) => [...journalKeys.trades(), id] as const,
  // Dividends
  dividends: () => [...journalKeys.all, "dividends"] as const,
  dividendsList: (params: Record<string, unknown>) =>
    [...journalKeys.dividends(), "list", params] as const,
  // Screening
  screening: () => [...journalKeys.all, "screening"] as const,
  screeningProfiles: () => [...journalKeys.screening(), "profiles"] as const,
  // Settings
  settings: () => [...journalKeys.all, "settings"] as const,
  // Dashboard
  dashboard: (depotId?: number, year?: number) =>
    [...journalKeys.all, "dashboard", depotId, year] as const,
};

// =============================================================================
// API HELPERS
// =============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data.data;
}

// =============================================================================
// DEPOT HOOKS
// =============================================================================

export function useDepots(includeArchived: boolean = false) {
  return useQuery({
    queryKey: [...journalKeys.depots(), { includeArchived }],
    queryFn: () =>
      fetchJson<Depot[]>(
        `/api/journal/depots?includeArchived=${includeArchived}`
      ),
  });
}

export function useDepot(id: number) {
  return useQuery({
    queryKey: journalKeys.depot(id),
    queryFn: () => fetchJson<Depot>(`/api/journal/depots/${id}`),
    enabled: !!id,
  });
}

export function useCreateDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DepotInput) =>
      fetchJson<{ id: number }>("/api/journal/depots", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.depots() });
    },
  });
}

export function useUpdateDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<DepotInput> & { id: number }) =>
      fetchJson<Depot>(`/api/journal/depots/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.depot(variables.id) });
      queryClient.invalidateQueries({ queryKey: journalKeys.depots() });
    },
  });
}

export function useArchiveDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<{ archived: boolean }>(`/api/journal/depots/${id}?archive=true`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.depots() });
    },
  });
}

// =============================================================================
// TRADE POSITION HOOKS
// =============================================================================

export function useOpenPositions(depotId?: number) {
  return useQuery({
    queryKey: journalKeys.openPositions(depotId),
    queryFn: () => {
      const params = new URLSearchParams({ status: "open" });
      if (depotId) params.set("depotId", depotId.toString());
      return fetchJson<TradePosition[]>(`/api/journal/trades?${params}`);
    },
  });
}

export function useTradeHistory(params: {
  depotId?: number;
  securityId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: journalKeys.tradeHistory(params),
    queryFn: () => {
      const searchParams = new URLSearchParams({ status: "history" });
      if (params.depotId) searchParams.set("depotId", params.depotId.toString());
      if (params.securityId)
        searchParams.set("securityId", params.securityId.toString());
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      if (params.limit) searchParams.set("limit", params.limit.toString());
      return fetchJson<TradePosition[]>(`/api/journal/trades?${searchParams}`);
    },
  });
}

export function useTrade(id: number) {
  return useQuery({
    queryKey: journalKeys.trade(id),
    queryFn: () => fetchJson<TradePosition>(`/api/journal/trades/${id}`),
    enabled: !!id,
  });
}

export function useCreateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TradePositionInput) =>
      fetchJson<{ id: number }>("/api/journal/trades", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.trades() });
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

export function useCloseTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClosePositionInput) =>
      fetchJson<TradePosition>(`/api/journal/trades/${input.tradeId}/close`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.trades() });
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

export function useRollTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RollInput) =>
      fetchJson<{ closedTradeId: number; newTradeId: number }>(
        `/api/journal/trades/${input.tradeId}/roll`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.trades() });
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

export function useAssignTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tradeId,
      assignmentDate,
      assignmentCommission,
    }: {
      tradeId: number;
      assignmentDate: string;
      assignmentCommission?: number;
    }) =>
      fetchJson<{ closedPutId: number; newStockId: number }>(
        `/api/journal/trades/${tradeId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ assignmentDate, assignmentCommission }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.trades() });
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

// =============================================================================
// DIVIDEND HOOKS
// =============================================================================

export function useDividends(params: {
  depotId?: number;
  securityId?: number;
  startDate?: string;
  endDate?: string;
} = {}) {
  return useQuery({
    queryKey: journalKeys.dividendsList(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.depotId) searchParams.set("depotId", params.depotId.toString());
      if (params.securityId)
        searchParams.set("securityId", params.securityId.toString());
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      return fetchJson<Dividend[]>(`/api/journal/dividends?${searchParams}`);
    },
  });
}

export function useCreateDividend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DividendInput) =>
      fetchJson<{ id: number }>("/api/journal/dividends", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.dividends() });
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

// =============================================================================
// SETTINGS HOOKS
// =============================================================================

export function useSettings() {
  return useQuery({
    queryKey: journalKeys.settings(),
    queryFn: () => fetchJson<UserSettings>("/api/journal/settings"),
    staleTime: Infinity, // Settings don't change often
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<UserSettings>) =>
      fetchJson<UserSettings>("/api/journal/settings", {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.settings() });
    },
  });
}

// =============================================================================
// SCREENING HOOKS
// =============================================================================

export function useScreeningProfiles(includeSystem: boolean = true) {
  return useQuery({
    queryKey: [...journalKeys.screeningProfiles(), { includeSystem }],
    queryFn: () =>
      fetchJson<ScreeningProfile[]>(
        `/api/journal/screening?includeSystem=${includeSystem}`
      ),
  });
}

export function useCreateScreeningProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      timeframe?: "D" | "W";
    }) =>
      fetchJson<ScreeningProfile>("/api/journal/screening", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.screeningProfiles() });
    },
  });
}

// =============================================================================
// DASHBOARD HOOKS
// =============================================================================

interface DashboardData {
  openPositions: {
    totalPositions: number;
    shortPuts: number;
    shortCalls: number;
    longStocks: number;
    totalPremiumAtRisk: number;
    nearestExpiration: string | null;
  };
  ytdSummary: {
    totalPremium: number;
    totalDividends: number;
    totalCommissions: number;
    netProfitLoss: number;
    tradesOpened: number;
    tradesClosed: number;
    winRate: number;
  };
  positionsByType: {
    shortPuts: TradePosition[];
    shortCalls: TradePosition[];
    longStocks: TradePosition[];
  };
  expiringSoon: TradePosition[];
  recentActivity: TradePosition[];
  depotFilter: number | null;
  year: number;
}

export function useDashboard(depotId?: number, year?: number) {
  return useQuery({
    queryKey: journalKeys.dashboard(depotId, year),
    queryFn: () => {
      const params = new URLSearchParams();
      if (depotId) params.set("depotId", depotId.toString());
      if (year) params.set("year", year.toString());
      return fetchJson<DashboardData>(`/api/journal/dashboard?${params}`);
    },
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export function useInvalidateJournal() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: journalKeys.all });
  };
}
