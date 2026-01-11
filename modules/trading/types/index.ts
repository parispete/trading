/**
 * Trading Module Types
 * Type definitions for stock data, prices, and trading operations
 */

// ===================
// Security Types
// ===================

export interface Security {
  id: number;
  ticker: string;
  name: string | null;
  exchange: string | null;
  assetType: string;
  currency: string;
  firstTradeDate: Date | null;
  lastTradeDate: Date | null;
  isActive: boolean;
}

export interface SecurityInput {
  ticker: string;
  name?: string;
  exchange?: string;
  assetType?: string;
}

// ===================
// Price Data Types
// ===================

export interface DailyPrice {
  securityId: number;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjOpen: number;
  adjHigh: number;
  adjLow: number;
  adjClose: number;
  adjVolume: number;
  divCash: number;
  splitFactor: number;
}

export interface OHLC {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceWithTicker extends OHLC {
  ticker: string;
}

// ===================
// Query Parameters
// ===================

export interface PriceQueryParams {
  ticker: string;
  startDate?: Date | string;
  endDate?: Date | string;
  adjusted?: boolean;
}

export interface MultiPriceQueryParams {
  tickers: string[];
  startDate?: Date | string;
  endDate?: Date | string;
  adjusted?: boolean;
}

// ===================
// Portfolio Types
// ===================

export interface PortfolioPosition {
  ticker: string;
  name: string | null;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

// ===================
// Statistics Types
// ===================

export interface PriceStatistics {
  ticker: string;
  periodStart: Date;
  periodEnd: Date;
  startPrice: number;
  endPrice: number;
  highPrice: number;
  lowPrice: number;
  periodReturn: number;
  periodReturnPercent: number;
  avgVolume: number;
  volatility: number;
  tradingDays: number;
}

export interface SecuritySummary {
  ticker: string;
  name: string | null;
  lastPrice: number;
  lastDate: Date;
  dayChange: number;
  dayChangePercent: number;
  weekChange: number;
  weekChangePercent: number;
  monthChange: number;
  monthChangePercent: number;
  yearChange: number;
  yearChangePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

// ===================
// Watchlist Types
// ===================

export interface WatchlistItem {
  id: number;
  securityId: number;
  ticker: string;
  name: string | null;
  listName: string;
  priority: number;
  addedAt: Date;
  notes: string | null;
  lastPrice?: number;
  dayChange?: number;
  dayChangePercent?: number;
}

export interface Watchlist {
  name: string;
  items: WatchlistItem[];
  totalItems: number;
}

// ===================
// Sync Status Types
// ===================

export interface SyncStatus {
  lastSync: Date | null;
  nextScheduledSync: Date | null;
  symbolsTracked: number;
  totalRecords: number;
  oldestData: Date | null;
  newestData: Date | null;
  status: "idle" | "syncing" | "error";
  lastError: string | null;
}

export interface SyncLog {
  id: number;
  syncDate: Date;
  syncType: "full" | "incremental" | "backfill";
  symbolsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorsCount: number;
  durationSeconds: number;
  status: "running" | "completed" | "failed";
  errorDetails: string | null;
}

// ===================
// Chart Types
// ===================

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartConfig {
  ticker: string;
  period: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";
  chartType: "line" | "candlestick" | "area";
  showVolume: boolean;
  indicators: string[];
}

// ===================
// API Response Types
// ===================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===================
// Technical Indicator Types
// ===================

export interface MovingAverage {
  date: Date;
  value: number;
  period: number;
  type: "SMA" | "EMA";
}

export interface RSIData {
  date: Date;
  value: number;
  period: number;
}

export interface MACDData {
  date: Date;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  date: Date;
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

// ===================
// Depot Types (Trading Journal)
// ===================

export interface Depot {
  id: number;
  name: string;
  brokerName: string | null;
  accountNumber: string | null;
  description: string | null;
  currency: string;
  isDefault: boolean;
  isArchived: boolean;
  settingsIncludeCommissionInPl: boolean;
  settingsDefaultWithholdingTaxPct: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepotInput {
  name: string;
  brokerName?: string;
  accountNumber?: string;
  description?: string;
  currency?: string;
  isDefault?: boolean;
  settingsIncludeCommissionInPl?: boolean;
  settingsDefaultWithholdingTaxPct?: number;
}

export interface DepotSummary extends Depot {
  tradesCount: number;
  openPositionsCount: number;
  totalPremiumYtd: number;
  totalDividendsYtd: number;
  totalCommissionsYtd: number;
  netProfitLossYtd: number;
}

// ===================
// Trade Position Types (Trading Journal)
// ===================

export type PositionType = "SHORT_PUT" | "SHORT_CALL" | "LONG_STOCK";
export type PositionStatus = "OPEN" | "CLOSED";
export type CloseType =
  | "EXPIRED"
  | "BUYBACK"
  | "ROLLED"
  | "ASSIGNED"
  | "CALLED_AWAY";

export interface TradePosition {
  id: number;
  depotId: number;
  securityId: number;
  ticker: string;
  securityName: string | null;

  positionType: PositionType;
  status: PositionStatus;

  // Options-specific
  strikePrice: number | null;
  expirationDate: Date | null;
  quantity: number;
  premiumPerContract: number | null;
  deltaAtOpen: number | null;
  ivAtOpen: number | null;
  ivRankAtOpen: number | null;
  underlyingPriceAtOpen: number | null;

  // Stock-specific
  shares: number | null;
  costPerShare: number | null;

  // Dates
  openDate: Date;
  closeDate: Date | null;

  // Close details
  closeType: CloseType | null;
  closePrice: number | null;

  // Commissions
  commissionOpen: number;
  commissionClose: number | null;

  // Relationships
  rolledFromTradeId: number | null;
  assignedToStockId: number | null;
  coveredByStockId: number | null;
  wheelCycleId: number | null;

  // Calculated fields
  totalPremium: number | null;
  netPremium: number | null;
  realizedPl: number | null;
  breakEven: number | null;
  dteAtOpen: number | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface TradePositionInput {
  depotId: number;
  // Either securityId or ticker must be provided
  securityId?: number;
  ticker?: string;
  positionType: PositionType;

  // Options-specific
  strikePrice?: number;
  expirationDate?: Date | string;
  quantity: number;
  premiumPerContract?: number;
  deltaAtOpen?: number;
  ivAtOpen?: number;
  ivRankAtOpen?: number;
  underlyingPriceAtOpen?: number;

  // Stock-specific
  shares?: number;
  costPerShare?: number;

  openDate: Date | string;
  commissionOpen?: number;
}

export interface RollInput {
  tradeId: number;
  buybackPrice: number;
  buybackCommission: number;
  newStrike: number;
  newExpirationDate: Date | string;
  newPremium: number;
  newCommission: number;
}

export interface ClosePositionInput {
  tradeId: number;
  closeType: CloseType;
  closeDate: Date | string;
  closePrice?: number;
  commissionClose?: number;
}

// ===================
// Wheel Cycle Types
// ===================

export type WheelCycleStatus = "ACTIVE" | "COMPLETED";

export interface WheelCycle {
  id: number;
  depotId: number;
  securityId: number;
  ticker: string;
  securityName: string | null;

  cycleNumber: number;
  year: number;
  cycleId: string; // e.g., "AAPL-2024-03"

  startDate: Date;
  endDate: Date | null;
  status: WheelCycleStatus;

  // Aggregated values
  totalPremiumCollected: number;
  totalBuybackCost: number;
  totalCommissions: number;
  totalDividends: number;
  stockProfitLoss: number;
  netProfitLoss: number;
  durationDays: number | null;

  // Related positions
  positions: TradePosition[];

  createdAt: Date;
}

// ===================
// Dividend Types
// ===================

export interface Dividend {
  id: number;
  depotId: number;
  stockPositionId: number | null;
  securityId: number;
  ticker: string;
  wheelCycleId: number | null;

  exDividendDate: Date;
  paymentDate: Date | null;
  recordDate: Date | null;

  sharesHeld: number;
  dividendPerShare: number;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;

  currency: string;

  createdAt: Date;
}

export interface DividendInput {
  depotId: number;
  stockPositionId?: number;
  securityId: number;
  wheelCycleId?: number;

  exDividendDate: Date | string;
  paymentDate?: Date | string;

  sharesHeld: number;
  dividendPerShare: number;
  withholdingTax?: number;
}

// ===================
// Trade Note Types
// ===================

export type NoteType = "IDEA" | "SETUP" | "MANAGEMENT" | "REVIEW";

export interface TradeNote {
  id: number;
  tradeId: number | null;
  securityId: number | null;
  ticker: string | null;

  noteType: NoteType;
  noteDate: Date;
  noteText: string | null;
  isLinkedToTrade: boolean;

  screenshots: TradeScreenshot[];

  createdAt: Date;
}

export interface TradeScreenshot {
  id: number;
  noteId: number;
  filePath: string;
  fileName: string;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
}

export interface TradeNoteInput {
  tradeId?: number;
  securityId?: number;
  noteType: NoteType;
  noteDate: Date | string;
  noteText?: string;
}

// ===================
// Import Types (Broker Import)
// ===================

export type ImportSource = "INTERACTIVE_BROKERS" | "MANUAL" | "OTHER";
export type ImportStatus = "PENDING" | "COMPLETED" | "PARTIAL" | "FAILED";

export interface ImportBatch {
  id: number;
  depotId: number;
  importDate: Date;
  source: ImportSource;
  fileName: string | null;

  recordsTotal: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsDuplicate: number;

  status: ImportStatus;
  errorLog: string | null;

  createdAt: Date;
}

export interface ImportPreview {
  optionTrades: number;
  stockTrades: number;
  dividends: number;
  assignments: number;
  partialFills: number;
  duplicates: number;

  transactions: ImportTransaction[];
}

export interface ImportTransaction {
  type: "OPTION" | "STOCK" | "DIVIDEND" | "ASSIGNMENT";
  ticker: string;
  date: Date;
  description: string;
  quantity: number;
  price: number;
  commission: number;
  isDuplicate: boolean;
  matchesExisting: boolean;
  existingTradeId?: number;
}

// ===================
// Screening Types
// ===================

export type IndicatorType =
  | "RSI"
  | "BB"
  | "SMA"
  | "EMA"
  | "MACD"
  | "VOLUME"
  | "PRICE";
export type ScreeningOperator = "LT" | "GT" | "BETWEEN" | "EQ" | "POSITION";
export type PositionValue =
  | "LOWER_THIRD"
  | "MIDDLE_THIRD"
  | "UPPER_THIRD"
  | "BELOW_LOWER"
  | "ABOVE_UPPER";

export interface ScreeningProfile {
  id: number;
  name: string;
  description: string | null;
  timeframe: "D" | "W";
  isSystemTemplate: boolean;
  criteria: ScreeningCriterion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScreeningCriterion {
  id: number;
  profileId: number;
  indicatorType: IndicatorType;
  isActive: boolean;

  // Parameters
  paramPeriod: number | null;
  paramPeriod2: number | null;
  paramPeriod3: number | null;
  paramStdDev: number | null;

  // Criterion
  operator: ScreeningOperator;
  value1: number | null;
  value2: number | null;
  positionValue: PositionValue | null;

  sortOrder: number;
}

export interface ScreeningCriterionInput {
  indicatorType: IndicatorType;
  isActive?: boolean;
  paramPeriod?: number;
  paramPeriod2?: number;
  paramPeriod3?: number;
  paramStdDev?: number;
  operator: ScreeningOperator;
  value1?: number;
  value2?: number;
  positionValue?: PositionValue;
}

export interface ScreeningResult {
  ticker: string;
  name: string | null;
  price: number;
  indicators: Record<string, number>;
}

// ===================
// Chart Replay Types
// ===================

export interface ReplaySession {
  id: number;
  securityId: number;
  ticker: string;
  currentDate: Date;
  timeframe: "D" | "W";
  viewportSize: number;
  lastAccessed: Date;
}

export interface ChartNote {
  id: number;
  securityId: number;
  noteDate: Date;
  noteText: string | null;
  screenshotPath: string | null;
  createdAt: Date;
}

// ===================
// User Settings Types (i18n)
// ===================

export type SupportedLanguage = "en" | "de";
export type DateFormat = "YYYY-MM-DD" | "DD.MM.YYYY" | "MM/DD/YYYY";
export type NumberFormat = "en-US" | "de-DE";
export type Theme = "light" | "dark" | "system";

export interface UserSettings {
  language: SupportedLanguage;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  theme: Theme;
}

// ===================
// Dashboard Summary Types
// ===================

export interface OpenPositionsSummary {
  totalPositions: number;
  shortPuts: number;
  shortCalls: number;
  longStocks: number;
  totalPremiumAtRisk: number;
  nearestExpiration: Date | null;
}

export interface YtdSummary {
  totalPremium: number;
  totalDividends: number;
  totalCommissions: number;
  netProfitLoss: number;
  tradesOpened: number;
  tradesClosed: number;
  winRate: number;
  avgDaysInTrade: number;
}

export interface TradingDashboard {
  openPositions: TradePosition[];
  activeWheelCycles: WheelCycle[];
  recentActivity: TradePosition[];
  ytdSummary: YtdSummary;
  openPositionsSummary: OpenPositionsSummary;
  depotFilter: number | null; // null = all depots
}
