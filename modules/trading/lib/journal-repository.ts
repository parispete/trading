/**
 * Trading Journal Repository
 * Data access layer for trade positions, depots, dividends, etc.
 */

import { query, queryOne } from "./database";
import type {
  Depot,
  DepotInput,
  DepotSummary,
  TradePosition,
  TradePositionInput,
  ClosePositionInput,
  RollInput,
  WheelCycle,
  Dividend,
  DividendInput,
  TradeNote,
  TradeNoteInput,
  ScreeningProfile,
  ScreeningCriterion,
  ScreeningCriterionInput,
  UserSettings,
  ReplaySession,
  ChartNote,
  TradingDashboard,
  YtdSummary,
  OpenPositionsSummary,
} from "../types";

// =============================================================================
// SECURITY HELPERS
// =============================================================================

/**
 * Find an existing security by ticker or create a new one
 */
export async function findOrCreateSecurity(ticker: string): Promise<number> {
  const normalizedTicker = ticker.toUpperCase().trim();

  // Try to find existing security
  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM security WHERE ticker = ?",
    [normalizedTicker]
  );

  if (existing) {
    return existing.id;
  }

  // Create new security with minimal info
  await query(
    `INSERT INTO security (ticker, asset_type, currency, is_active)
     VALUES (?, 'STOCK', 'USD', TRUE)`,
    [normalizedTicker]
  );

  // Get the newly created ID
  const newSecurity = await queryOne<{ id: number }>(
    "SELECT id FROM security WHERE ticker = ?",
    [normalizedTicker]
  );

  if (!newSecurity) {
    throw new Error(`Failed to create security for ticker: ${ticker}`);
  }

  return newSecurity.id;
}

// =============================================================================
// DEPOT OPERATIONS
// =============================================================================

export async function createDepot(input: DepotInput): Promise<number> {
  // If setting as default, unset other defaults first
  if (input.isDefault) {
    await query("UPDATE depot SET is_default = FALSE WHERE is_default = TRUE");
  }

  await query(
    `
    INSERT INTO depot (
      name, broker_name, account_number, description, currency,
      is_default, settings_include_commission_in_pl,
      settings_default_withholding_tax_pct
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.name,
      input.brokerName || null,
      input.accountNumber || null,
      input.description || null,
      input.currency || "USD",
      input.isDefault || false,
      input.settingsIncludeCommissionInPl ?? true,
      input.settingsDefaultWithholdingTaxPct || 0,
    ]
  );

  const result = await queryOne<{ id: number }>(
    "SELECT id FROM depot WHERE name = ?",
    [input.name]
  );
  return result!.id;
}

export async function getDepot(id: number): Promise<Depot | null> {
  const row = await queryOne<{
    id: number;
    name: string;
    broker_name: string | null;
    account_number: string | null;
    description: string | null;
    currency: string;
    is_default: boolean;
    is_archived: boolean;
    settings_include_commission_in_pl: boolean;
    settings_default_withholding_tax_pct: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM depot WHERE id = ?", [id]);

  if (!row) return null;

  return mapDepot(row);
}

export async function getDefaultDepot(): Promise<Depot | null> {
  const row = await queryOne<{
    id: number;
    name: string;
    broker_name: string | null;
    account_number: string | null;
    description: string | null;
    currency: string;
    is_default: boolean;
    is_archived: boolean;
    settings_include_commission_in_pl: boolean;
    settings_default_withholding_tax_pct: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM depot WHERE is_default = TRUE LIMIT 1");

  if (!row) return null;

  return mapDepot(row);
}

export async function getAllDepots(
  includeArchived: boolean = false
): Promise<Depot[]> {
  let sql = "SELECT * FROM depot";
  if (!includeArchived) {
    sql += " WHERE is_archived = FALSE";
  }
  sql += " ORDER BY is_default DESC, name";

  const rows = await query<{
    id: number;
    name: string;
    broker_name: string | null;
    account_number: string | null;
    description: string | null;
    currency: string;
    is_default: boolean;
    is_archived: boolean;
    settings_include_commission_in_pl: boolean;
    settings_default_withholding_tax_pct: number;
    created_at: string;
    updated_at: string;
  }>(sql);

  return rows.map(mapDepot);
}

export async function updateDepot(
  id: number,
  updates: Partial<DepotInput>
): Promise<boolean> {
  const allowedFields: Record<string, string> = {
    name: "name",
    brokerName: "broker_name",
    accountNumber: "account_number",
    description: "description",
    currency: "currency",
    isDefault: "is_default",
    settingsIncludeCommissionInPl: "settings_include_commission_in_pl",
    settingsDefaultWithholdingTaxPct: "settings_default_withholding_tax_pct",
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, dbField] of Object.entries(allowedFields)) {
    if (key in updates) {
      setClauses.push(`${dbField} = ?`);
      values.push((updates as Record<string, unknown>)[key]);
    }
  }

  if (setClauses.length === 0) return false;

  // Handle is_default specially
  if (updates.isDefault) {
    await query("UPDATE depot SET is_default = FALSE WHERE is_default = TRUE");
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await query(
    `UPDATE depot SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );

  return true;
}

export async function archiveDepot(id: number): Promise<boolean> {
  await query(
    "UPDATE depot SET is_archived = TRUE, is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
  return true;
}

export async function deleteDepot(id: number): Promise<boolean> {
  // Check for trades
  const result = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM trade_position WHERE depot_id = ?",
    [id]
  );

  if (result && result.count > 0) {
    throw new Error(
      "Cannot delete depot with existing trades. Archive it instead."
    );
  }

  await query("DELETE FROM depot WHERE id = ?", [id]);
  return true;
}

function mapDepot(row: {
  id: number;
  name: string;
  broker_name: string | null;
  account_number: string | null;
  description: string | null;
  currency: string;
  is_default: boolean;
  is_archived: boolean;
  settings_include_commission_in_pl: boolean;
  settings_default_withholding_tax_pct: number;
  created_at: string;
  updated_at: string;
}): Depot {
  return {
    id: row.id,
    name: row.name,
    brokerName: row.broker_name,
    accountNumber: row.account_number,
    description: row.description,
    currency: row.currency,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    settingsIncludeCommissionInPl: row.settings_include_commission_in_pl,
    settingsDefaultWithholdingTaxPct: row.settings_default_withholding_tax_pct,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// =============================================================================
// TRADE POSITION OPERATIONS
// =============================================================================

export async function createTradePosition(
  input: TradePositionInput
): Promise<number> {
  const openDate =
    typeof input.openDate === "string"
      ? input.openDate
      : input.openDate.toISOString().split("T")[0];

  const expirationDate = input.expirationDate
    ? typeof input.expirationDate === "string"
      ? input.expirationDate
      : input.expirationDate.toISOString().split("T")[0]
    : null;

  // Calculate derived fields
  let totalPremium: number | null = null;
  let netPremium: number | null = null;
  let breakEven: number | null = null;
  let dteAtOpen: number | null = null;

  if (
    (input.positionType === "SHORT_PUT" ||
      input.positionType === "SHORT_CALL") &&
    input.premiumPerContract
  ) {
    totalPremium = Math.abs(input.quantity) * input.premiumPerContract * 100;
    netPremium = totalPremium - (input.commissionOpen || 0);

    if (input.positionType === "SHORT_PUT" && input.strikePrice) {
      breakEven = input.strikePrice - input.premiumPerContract;
    } else if (input.positionType === "SHORT_CALL" && input.strikePrice) {
      breakEven = input.strikePrice + input.premiumPerContract;
    }

    if (expirationDate) {
      const exp = new Date(expirationDate);
      const open = new Date(openDate);
      dteAtOpen = Math.ceil(
        (exp.getTime() - open.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  await query(
    `
    INSERT INTO trade_position (
      depot_id, security_id, position_type, status, quantity, open_date,
      strike_price, expiration_date, premium_per_contract,
      delta_at_open, iv_at_open, iv_rank_at_open, underlying_price_at_open,
      shares, cost_per_share, commission_open,
      total_premium, net_premium, break_even, dte_at_open
    ) VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.depotId,
      input.securityId,
      input.positionType,
      input.quantity,
      openDate,
      input.strikePrice || null,
      expirationDate,
      input.premiumPerContract || null,
      input.deltaAtOpen || null,
      input.ivAtOpen || null,
      input.ivRankAtOpen || null,
      input.underlyingPriceAtOpen || null,
      input.shares || null,
      input.costPerShare || null,
      input.commissionOpen || 0,
      totalPremium,
      netPremium,
      breakEven,
      dteAtOpen,
    ]
  );

  const result = await queryOne<{ id: number }>(
    "SELECT MAX(id) as id FROM trade_position"
  );
  return result!.id;
}

export async function getTradePosition(
  id: number
): Promise<TradePosition | null> {
  const row = await queryOne<TradePositionRow>(
    `
    SELECT tp.*, s.ticker, s.name as security_name
    FROM trade_position tp
    JOIN security s ON tp.security_id = s.id
    WHERE tp.id = ?
    `,
    [id]
  );

  if (!row) return null;

  return mapTradePosition(row);
}

/**
 * Get the roll chain for a position (all previous positions that were rolled into this one)
 * Returns array of positions from oldest to current (internal use)
 */
async function getRollChain(positionId: number): Promise<TradePositionRow[]> {
  const chain: TradePositionRow[] = [];
  let currentId: number | null = positionId;

  while (currentId !== null) {
    const row = await queryOne<TradePositionRow>(
      `SELECT tp.*, s.ticker, s.name as security_name
       FROM trade_position tp
       JOIN security s ON tp.security_id = s.id
       WHERE tp.id = ?`,
      [currentId]
    );

    if (!row) break;
    chain.unshift(row); // Add to beginning (oldest first)
    currentId = row.rolled_from_trade_id;
  }

  return chain;
}

/**
 * Calculate RoR metrics for a position including its roll chain
 */
function calculateRorMetrics(
  position: TradePositionRow,
  rollChain: TradePositionRow[]
): {
  chainTotalPremium: number;
  chainTotalFees: number;
  rollCount: number;
  ror: number | null;
  wror: number | null;
} {
  // Sum premiums and fees from entire roll chain
  let chainTotalPremium = 0;
  let chainTotalFees = 0;

  for (const pos of rollChain) {
    // Premium: premiumPerContract * quantity * 100 (options multiplier)
    if (pos.premium_per_contract) {
      chainTotalPremium += pos.premium_per_contract * pos.quantity * 100;
    }
    // Fees: commission_open + commission_close (if closed via roll)
    chainTotalFees += pos.commission_open || 0;
    if (pos.commission_close) {
      chainTotalFees += pos.commission_close;
    }
  }

  const rollCount = rollChain.length - 1; // Number of rolls (chain length minus 1)

  // RoR calculation: (premium - fees) / (strike * 100 * quantity) * 100
  // Only for options with strike price
  let ror: number | null = null;
  let wror: number | null = null;

  if (position.strike_price && position.position_type !== "LONG_STOCK") {
    const capitalAtRisk = position.strike_price * 100 * position.quantity;
    ror = ((chainTotalPremium - chainTotalFees) / capitalAtRisk) * 100;

    // WRoR: RoR / weeks from first open to expiration
    if (position.expiration_date && rollChain.length > 0) {
      const firstOpenDate = new Date(rollChain[0].open_date);
      const expirationDate = new Date(position.expiration_date);
      const daysTotal = Math.ceil(
        (expirationDate.getTime() - firstOpenDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weeks = daysTotal / 7;
      if (weeks > 0) {
        wror = ror / weeks;
      }
    }
  }

  return { chainTotalPremium, chainTotalFees, rollCount, ror, wror };
}

export async function getOpenPositions(params: {
  depotId?: number;
  positionType?: string;
  securityId?: number;
}): Promise<TradePosition[]> {
  let sql = `
    SELECT tp.*, s.ticker, s.name as security_name
    FROM trade_position tp
    JOIN security s ON tp.security_id = s.id
    WHERE tp.status = 'OPEN'
  `;
  const queryParams: unknown[] = [];

  if (params.depotId) {
    sql += " AND tp.depot_id = ?";
    queryParams.push(params.depotId);
  }

  if (params.positionType) {
    sql += " AND tp.position_type = ?";
    queryParams.push(params.positionType);
  }

  if (params.securityId) {
    sql += " AND tp.security_id = ?";
    queryParams.push(params.securityId);
  }

  sql += " ORDER BY tp.expiration_date ASC, s.ticker";

  const rows = await query<TradePositionRow>(sql, queryParams);

  // Calculate RoR metrics for each position (including roll chains)
  const positions: TradePosition[] = [];
  for (const row of rows) {
    const rollChain = await getRollChain(row.id);
    const rorMetrics = calculateRorMetrics(row, rollChain);
    positions.push(mapTradePositionWithRor(row, rorMetrics));
  }

  return positions;
}

/**
 * Get full roll chain details for a position (public API)
 * Returns array of TradePosition objects from oldest to current
 */
export async function getRollChainDetails(positionId: number): Promise<TradePosition[]> {
  const chain = await getRollChain(positionId);

  if (chain.length === 0) {
    throw new Error(`Trade position ${positionId} not found`);
  }

  return chain.map(mapTradePosition);
}

export async function closePosition(
  input: ClosePositionInput
): Promise<TradePosition> {
  const position = await getTradePosition(input.tradeId);
  if (!position) {
    throw new Error(`Trade position ${input.tradeId} not found`);
  }

  if (position.status === "CLOSED") {
    throw new Error(`Trade position ${input.tradeId} is already closed`);
  }

  const closeDate =
    typeof input.closeDate === "string"
      ? input.closeDate
      : input.closeDate.toISOString().split("T")[0];

  // Calculate realized P&L
  const realizedPl = calculateRealizedPl(
    position,
    input.closeType,
    input.closePrice,
    input.commissionClose || 0
  );

  await query(
    `
    UPDATE trade_position SET
      status = 'CLOSED',
      close_type = ?,
      close_date = ?,
      close_price = ?,
      commission_close = ?,
      realized_pl = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      input.closeType,
      closeDate,
      input.closePrice || null,
      input.commissionClose || 0,
      realizedPl,
      input.tradeId,
    ]
  );

  return (await getTradePosition(input.tradeId))!;
}

export async function rollPosition(
  input: RollInput
): Promise<{ closedTradeId: number; newTradeId: number }> {
  const position = await getTradePosition(input.tradeId);
  if (!position) {
    throw new Error(`Trade position ${input.tradeId} not found`);
  }

  const rollDate =
    typeof input.newExpirationDate === "string"
      ? new Date().toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

  // Close original position as ROLLED
  await closePosition({
    tradeId: input.tradeId,
    closeType: "ROLLED",
    closeDate: rollDate,
    closePrice: input.buybackPrice,
    commissionClose: input.buybackCommission,
  });

  // Create new position
  const newTradeId = await createTradePosition({
    depotId: position.depotId,
    securityId: position.securityId,
    positionType: position.positionType,
    quantity: position.quantity,
    openDate: rollDate,
    strikePrice: input.newStrike,
    expirationDate: input.newExpirationDate,
    premiumPerContract: input.newPremium,
    underlyingPriceAtOpen: position.underlyingPriceAtOpen || undefined,
    commissionOpen: input.newCommission,
  });

  // Link new position to original
  await query(
    "UPDATE trade_position SET rolled_from_trade_id = ? WHERE id = ?",
    [input.tradeId, newTradeId]
  );

  return { closedTradeId: input.tradeId, newTradeId };
}

export async function assignPosition(
  tradeId: number,
  assignmentDate: string | Date,
  assignmentCommission: number = 0
): Promise<number> {
  const position = await getTradePosition(tradeId);
  if (!position) {
    throw new Error(`Trade position ${tradeId} not found`);
  }

  if (position.positionType !== "SHORT_PUT") {
    throw new Error("Only SHORT_PUT positions can be assigned");
  }

  const dateStr =
    typeof assignmentDate === "string"
      ? assignmentDate
      : assignmentDate.toISOString().split("T")[0];

  // Close the put as ASSIGNED
  await closePosition({
    tradeId,
    closeType: "ASSIGNED",
    closeDate: dateStr,
    commissionClose: assignmentCommission,
  });

  // Calculate number of shares and cost basis
  const shares = Math.abs(position.quantity) * 100;
  const premiumPerShare = (position.netPremium || 0) / shares;
  const costPerShare = position.strikePrice! - premiumPerShare;

  // Create stock position
  const stockId = await createTradePosition({
    depotId: position.depotId,
    securityId: position.securityId,
    positionType: "LONG_STOCK",
    quantity: shares,
    openDate: dateStr,
    shares,
    costPerShare,
    commissionOpen: 0,
  });

  // Link positions
  await query(
    "UPDATE trade_position SET assigned_to_stock_id = ? WHERE id = ?",
    [stockId, tradeId]
  );

  return stockId;
}

export async function getTradeHistory(params: {
  depotId?: number;
  securityId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<TradePosition[]> {
  let sql = `
    SELECT tp.*, s.ticker, s.name as security_name
    FROM trade_position tp
    JOIN security s ON tp.security_id = s.id
    WHERE 1=1
  `;
  const queryParams: unknown[] = [];

  if (params.depotId) {
    sql += " AND tp.depot_id = ?";
    queryParams.push(params.depotId);
  }

  if (params.securityId) {
    sql += " AND tp.security_id = ?";
    queryParams.push(params.securityId);
  }

  if (params.startDate) {
    sql += " AND tp.open_date >= ?";
    queryParams.push(params.startDate);
  }

  if (params.endDate) {
    sql += " AND tp.open_date <= ?";
    queryParams.push(params.endDate);
  }

  sql += ` ORDER BY tp.open_date DESC LIMIT ${params.limit || 100}`;

  const rows = await query<TradePositionRow>(sql, queryParams);
  return rows.map(mapTradePosition);
}

function calculateRealizedPl(
  position: TradePosition,
  closeType: string,
  closePrice: number | undefined,
  commissionClose: number
): number {
  const netPremium = position.netPremium || 0;

  switch (closeType) {
    case "EXPIRED":
      return netPremium - commissionClose;

    case "BUYBACK":
    case "ROLLED":
      if (closePrice === undefined) {
        throw new Error(`closePrice required for ${closeType}`);
      }
      const buybackCost = Math.abs(position.quantity) * closePrice * 100;
      return netPremium - buybackCost - commissionClose;

    case "ASSIGNED":
    case "CALLED_AWAY":
      return netPremium - commissionClose;

    default:
      return 0;
  }
}

interface TradePositionRow {
  id: number;
  depot_id: number;
  security_id: number;
  ticker: string;
  security_name: string | null;
  position_type: string;
  status: string;
  strike_price: number | null;
  expiration_date: string | null;
  quantity: number;
  premium_per_contract: number | null;
  delta_at_open: number | null;
  iv_at_open: number | null;
  iv_rank_at_open: number | null;
  underlying_price_at_open: number | null;
  shares: number | null;
  cost_per_share: number | null;
  open_date: string;
  close_date: string | null;
  close_type: string | null;
  close_price: number | null;
  commission_open: number;
  commission_close: number | null;
  rolled_from_trade_id: number | null;
  assigned_to_stock_id: number | null;
  covered_by_stock_id: number | null;
  wheel_cycle_id: number | null;
  total_premium: number | null;
  net_premium: number | null;
  realized_pl: number | null;
  break_even: number | null;
  dte_at_open: number | null;
  created_at: string;
  updated_at: string;
}

function mapTradePosition(row: TradePositionRow): TradePosition {
  return {
    id: row.id,
    depotId: row.depot_id,
    securityId: row.security_id,
    ticker: row.ticker,
    securityName: row.security_name,
    positionType: row.position_type as TradePosition["positionType"],
    status: row.status as TradePosition["status"],
    strikePrice: row.strike_price,
    expirationDate: row.expiration_date ? new Date(row.expiration_date) : null,
    quantity: row.quantity,
    premiumPerContract: row.premium_per_contract,
    deltaAtOpen: row.delta_at_open,
    ivAtOpen: row.iv_at_open,
    ivRankAtOpen: row.iv_rank_at_open,
    underlyingPriceAtOpen: row.underlying_price_at_open,
    shares: row.shares,
    costPerShare: row.cost_per_share,
    openDate: new Date(row.open_date),
    closeDate: row.close_date ? new Date(row.close_date) : null,
    closeType: row.close_type as TradePosition["closeType"],
    closePrice: row.close_price,
    commissionOpen: row.commission_open,
    commissionClose: row.commission_close,
    rolledFromTradeId: row.rolled_from_trade_id,
    assignedToStockId: row.assigned_to_stock_id,
    coveredByStockId: row.covered_by_stock_id,
    wheelCycleId: row.wheel_cycle_id,
    totalPremium: row.total_premium,
    netPremium: row.net_premium,
    realizedPl: row.realized_pl,
    breakEven: row.break_even,
    dteAtOpen: row.dte_at_open,
    chainTotalPremium: null,
    chainTotalFees: null,
    rollCount: 0,
    ror: null,
    wror: null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapTradePositionWithRor(
  row: TradePositionRow,
  rorMetrics: {
    chainTotalPremium: number;
    chainTotalFees: number;
    rollCount: number;
    ror: number | null;
    wror: number | null;
  }
): TradePosition {
  return {
    ...mapTradePosition(row),
    chainTotalPremium: rorMetrics.chainTotalPremium,
    chainTotalFees: rorMetrics.chainTotalFees,
    rollCount: rorMetrics.rollCount,
    ror: rorMetrics.ror,
    wror: rorMetrics.wror,
  };
}

// =============================================================================
// DIVIDEND OPERATIONS
// =============================================================================

export async function createDividend(input: DividendInput): Promise<number> {
  const exDividendDate =
    typeof input.exDividendDate === "string"
      ? input.exDividendDate
      : input.exDividendDate.toISOString().split("T")[0];

  const paymentDate = input.paymentDate
    ? typeof input.paymentDate === "string"
      ? input.paymentDate
      : input.paymentDate.toISOString().split("T")[0]
    : null;

  const grossAmount = input.sharesHeld * input.dividendPerShare;
  const withholdingTax = input.withholdingTax || 0;
  const netAmount = grossAmount - withholdingTax;

  await query(
    `
    INSERT INTO dividend (
      depot_id, security_id, stock_position_id, wheel_cycle_id,
      ex_dividend_date, payment_date, shares_held, dividend_per_share,
      gross_amount, withholding_tax, net_amount, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD')
    `,
    [
      input.depotId,
      input.securityId,
      input.stockPositionId || null,
      input.wheelCycleId || null,
      exDividendDate,
      paymentDate,
      input.sharesHeld,
      input.dividendPerShare,
      grossAmount,
      withholdingTax,
      netAmount,
    ]
  );

  const result = await queryOne<{ id: number }>(
    "SELECT MAX(id) as id FROM dividend"
  );
  return result!.id;
}

export async function getDividends(params: {
  depotId?: number;
  securityId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<Dividend[]> {
  let sql = `
    SELECT d.*, s.ticker
    FROM dividend d
    JOIN security s ON d.security_id = s.id
    WHERE 1=1
  `;
  const queryParams: unknown[] = [];

  if (params.depotId) {
    sql += " AND d.depot_id = ?";
    queryParams.push(params.depotId);
  }

  if (params.securityId) {
    sql += " AND d.security_id = ?";
    queryParams.push(params.securityId);
  }

  if (params.startDate) {
    sql += " AND d.ex_dividend_date >= ?";
    queryParams.push(params.startDate);
  }

  if (params.endDate) {
    sql += " AND d.ex_dividend_date <= ?";
    queryParams.push(params.endDate);
  }

  sql += " ORDER BY d.ex_dividend_date DESC";

  const rows = await query<{
    id: number;
    depot_id: number;
    stock_position_id: number | null;
    security_id: number;
    ticker: string;
    wheel_cycle_id: number | null;
    ex_dividend_date: string;
    payment_date: string | null;
    record_date: string | null;
    shares_held: number;
    dividend_per_share: number;
    gross_amount: number;
    withholding_tax: number;
    net_amount: number;
    currency: string;
    created_at: string;
  }>(sql, queryParams);

  return rows.map((row) => ({
    id: row.id,
    depotId: row.depot_id,
    stockPositionId: row.stock_position_id,
    securityId: row.security_id,
    ticker: row.ticker,
    wheelCycleId: row.wheel_cycle_id,
    exDividendDate: new Date(row.ex_dividend_date),
    paymentDate: row.payment_date ? new Date(row.payment_date) : null,
    recordDate: row.record_date ? new Date(row.record_date) : null,
    sharesHeld: row.shares_held,
    dividendPerShare: row.dividend_per_share,
    grossAmount: row.gross_amount,
    withholdingTax: row.withholding_tax,
    netAmount: row.net_amount,
    currency: row.currency,
    createdAt: new Date(row.created_at),
  }));
}

// =============================================================================
// USER SETTINGS OPERATIONS
// =============================================================================

export async function getUserSettings(): Promise<UserSettings> {
  const rows = await query<{ setting_key: string; setting_value: string }>(
    "SELECT setting_key, setting_value FROM user_settings"
  );

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }

  return {
    language: (settings.language as UserSettings["language"]) || "en",
    dateFormat: (settings.date_format as UserSettings["dateFormat"]) || "YYYY-MM-DD",
    numberFormat: (settings.number_format as UserSettings["numberFormat"]) || "en-US",
    theme: (settings.theme as UserSettings["theme"]) || "system",
  };
}

export async function updateUserSettings(
  updates: Partial<UserSettings>
): Promise<void> {
  const keyMap: Record<string, string> = {
    language: "language",
    dateFormat: "date_format",
    numberFormat: "number_format",
    theme: "theme",
  };

  for (const [key, dbKey] of Object.entries(keyMap)) {
    if (key in updates) {
      const value = (updates as Record<string, string>)[key];
      await query(
        `
        INSERT INTO user_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = CURRENT_TIMESTAMP
        `,
        [dbKey, value]
      );
    }
  }
}

// =============================================================================
// SCREENING OPERATIONS
// =============================================================================

export async function getScreeningProfiles(
  includeSystem: boolean = true
): Promise<ScreeningProfile[]> {
  let sql = "SELECT * FROM screening_profile";
  if (!includeSystem) {
    sql += " WHERE is_system_template = FALSE";
  }
  sql += " ORDER BY is_system_template DESC, name";

  const rows = await query<{
    id: number;
    name: string;
    description: string | null;
    timeframe: string;
    is_system_template: boolean;
    created_at: string;
    updated_at: string;
  }>(sql);

  const profiles: ScreeningProfile[] = [];

  for (const row of rows) {
    const criteria = await getProfileCriteria(row.id);
    profiles.push({
      id: row.id,
      name: row.name,
      description: row.description,
      timeframe: row.timeframe as "D" | "W",
      isSystemTemplate: row.is_system_template,
      criteria,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  return profiles;
}

export async function getProfileCriteria(
  profileId: number
): Promise<ScreeningCriterion[]> {
  const rows = await query<{
    id: number;
    profile_id: number;
    indicator_type: string;
    is_active: boolean;
    param_period: number | null;
    param_period_2: number | null;
    param_period_3: number | null;
    param_std_dev: number | null;
    operator: string;
    value_1: number | null;
    value_2: number | null;
    position_value: string | null;
    sort_order: number;
  }>(
    "SELECT * FROM screening_criterion WHERE profile_id = ? ORDER BY sort_order",
    [profileId]
  );

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    indicatorType: row.indicator_type as ScreeningCriterion["indicatorType"],
    isActive: row.is_active,
    paramPeriod: row.param_period,
    paramPeriod2: row.param_period_2,
    paramPeriod3: row.param_period_3,
    paramStdDev: row.param_std_dev,
    operator: row.operator as ScreeningCriterion["operator"],
    value1: row.value_1,
    value2: row.value_2,
    positionValue: row.position_value as ScreeningCriterion["positionValue"],
    sortOrder: row.sort_order,
  }));
}

export async function createScreeningProfile(
  name: string,
  description?: string,
  timeframe: "D" | "W" = "D"
): Promise<number> {
  await query(
    `
    INSERT INTO screening_profile (name, description, timeframe, is_system_template)
    VALUES (?, ?, ?, FALSE)
    `,
    [name, description || null, timeframe]
  );

  const result = await queryOne<{ id: number }>(
    "SELECT id FROM screening_profile WHERE name = ?",
    [name]
  );
  return result!.id;
}

export async function addScreeningCriterion(
  profileId: number,
  input: ScreeningCriterionInput
): Promise<number> {
  const sortResult = await queryOne<{ next_order: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM screening_criterion WHERE profile_id = ?",
    [profileId]
  );

  await query(
    `
    INSERT INTO screening_criterion (
      profile_id, indicator_type, operator, is_active,
      param_period, param_period_2, param_period_3, param_std_dev,
      value_1, value_2, position_value, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profileId,
      input.indicatorType,
      input.operator,
      input.isActive ?? true,
      input.paramPeriod || null,
      input.paramPeriod2 || null,
      input.paramPeriod3 || null,
      input.paramStdDev || null,
      input.value1 || null,
      input.value2 || null,
      input.positionValue || null,
      sortResult!.next_order,
    ]
  );

  const result = await queryOne<{ id: number }>(
    "SELECT MAX(id) as id FROM screening_criterion"
  );
  return result!.id;
}

// =============================================================================
// DASHBOARD OPERATIONS
// =============================================================================

export async function getDashboardSummary(params: {
  depotId?: number;
  year?: number;
}): Promise<{
  openPositions: OpenPositionsSummary;
  ytdSummary: YtdSummary;
  depotFilter: number | null;
  year: number;
}> {
  const year = params.year || new Date().getFullYear();
  const yearStart = `${year}-01-01`;

  // Open positions summary
  let openSql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN position_type = 'SHORT_PUT' THEN 1 ELSE 0 END) as puts,
      SUM(CASE WHEN position_type = 'SHORT_CALL' THEN 1 ELSE 0 END) as calls,
      SUM(CASE WHEN position_type = 'LONG_STOCK' THEN 1 ELSE 0 END) as stocks,
      SUM(COALESCE(net_premium, 0)) as premium_at_risk,
      MIN(expiration_date) as nearest_exp
    FROM trade_position
    WHERE status = 'OPEN'
  `;
  const openParams: unknown[] = [];

  if (params.depotId) {
    openSql += " AND depot_id = ?";
    openParams.push(params.depotId);
  }

  const openResult = await queryOne<{
    total: number;
    puts: number;
    calls: number;
    stocks: number;
    premium_at_risk: number;
    nearest_exp: string | null;
  }>(openSql, openParams);

  // YTD summary
  let ytdSql = `
    SELECT
      COALESCE(SUM(net_premium), 0) as premium,
      COALESCE(SUM(commission_open + COALESCE(commission_close, 0)), 0) as commissions,
      COALESCE(SUM(CASE WHEN status = 'CLOSED' THEN realized_pl ELSE 0 END), 0) as realized_pl,
      COUNT(CASE WHEN open_date >= ? THEN 1 END) as opened,
      COUNT(CASE WHEN close_date >= ? THEN 1 END) as closed,
      COUNT(CASE WHEN realized_pl > 0 AND status = 'CLOSED' THEN 1 END) as wins,
      COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as total_closed
    FROM trade_position
    WHERE open_date >= ? OR close_date >= ?
  `;
  const ytdParams: unknown[] = [yearStart, yearStart, yearStart, yearStart];

  if (params.depotId) {
    ytdSql += " AND depot_id = ?";
    ytdParams.push(params.depotId);
  }

  const ytdResult = await queryOne<{
    premium: number;
    commissions: number;
    realized_pl: number;
    opened: number;
    closed: number;
    wins: number;
    total_closed: number;
  }>(ytdSql, ytdParams);

  // Dividends YTD
  let divSql = `
    SELECT COALESCE(SUM(net_amount), 0) as total
    FROM dividend
    WHERE ex_dividend_date >= ?
  `;
  const divParams: unknown[] = [yearStart];

  if (params.depotId) {
    divSql += " AND depot_id = ?";
    divParams.push(params.depotId);
  }

  const divResult = await queryOne<{ total: number }>(divSql, divParams);

  // DuckDB returns BigInt for COUNT(*), convert to number
  const wins = Number(ytdResult?.wins ?? 0);
  const totalClosed = Number(ytdResult?.total_closed ?? 0);
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;

  return {
    openPositions: {
      totalPositions: Number(openResult?.total ?? 0),
      shortPuts: Number(openResult?.puts ?? 0),
      shortCalls: Number(openResult?.calls ?? 0),
      longStocks: Number(openResult?.stocks ?? 0),
      totalPremiumAtRisk: Number(openResult?.premium_at_risk ?? 0),
      nearestExpiration: openResult?.nearest_exp
        ? new Date(openResult.nearest_exp)
        : null,
    },
    ytdSummary: {
      totalPremium: Number(ytdResult?.premium ?? 0),
      totalDividends: Number(divResult?.total ?? 0),
      totalCommissions: Number(ytdResult?.commissions ?? 0),
      netProfitLoss: Number(ytdResult?.realized_pl ?? 0) + Number(divResult?.total ?? 0),
      tradesOpened: Number(ytdResult?.opened ?? 0),
      tradesClosed: totalClosed,
      winRate,
      avgDaysInTrade: 0, // TODO: Calculate
    },
    depotFilter: params.depotId || null,
    year,
  };
}
