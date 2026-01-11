"""Repository for Trading Journal database operations.

This module provides CRUD operations for:
- Depots (accounts)
- Trade positions (options & stocks)
- Wheel cycles
- Dividends
- Trade notes & screenshots
- Screening profiles
- User settings
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

import pandas as pd

from .connection import execute, query, query_df, get_connection

logger = logging.getLogger(__name__)


# =============================================================================
# DEPOT OPERATIONS
# =============================================================================


def create_depot(
    name: str,
    broker_name: str | None = None,
    account_number: str | None = None,
    description: str | None = None,
    currency: str = "USD",
    is_default: bool = False,
    settings_include_commission_in_pl: bool = True,
    settings_default_withholding_tax_pct: float = 0.0,
) -> int:
    """Create a new depot.

    Args:
        name: Unique depot name
        broker_name: Broker name (optional)
        account_number: Account number for reference (optional)
        description: Description (optional)
        currency: Base currency (default: USD)
        is_default: Set as default depot
        settings_include_commission_in_pl: Include commissions in P&L calculation
        settings_default_withholding_tax_pct: Default withholding tax for dividends

    Returns:
        New depot ID
    """
    # If setting as default, unset other defaults first
    if is_default:
        execute("UPDATE depot SET is_default = FALSE WHERE is_default = TRUE")

    execute(
        """
        INSERT INTO depot (
            name, broker_name, account_number, description, currency,
            is_default, settings_include_commission_in_pl,
            settings_default_withholding_tax_pct
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            name,
            broker_name,
            account_number,
            description,
            currency,
            is_default,
            settings_include_commission_in_pl,
            settings_default_withholding_tax_pct,
        ),
    )

    result = query("SELECT id FROM depot WHERE name = ?", (name,))
    depot_id = result[0][0]
    logger.info(f"Created depot '{name}' with ID {depot_id}")
    return depot_id


def get_depot(depot_id: int) -> dict[str, Any] | None:
    """Get depot by ID.

    Args:
        depot_id: Depot ID

    Returns:
        Depot record or None
    """
    df = query_df("SELECT * FROM depot WHERE id = ?", (depot_id,))
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def get_depot_by_name(name: str) -> dict[str, Any] | None:
    """Get depot by name.

    Args:
        name: Depot name

    Returns:
        Depot record or None
    """
    df = query_df("SELECT * FROM depot WHERE name = ?", (name,))
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def get_default_depot() -> dict[str, Any] | None:
    """Get the default depot.

    Returns:
        Default depot record or None
    """
    df = query_df("SELECT * FROM depot WHERE is_default = TRUE LIMIT 1")
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def get_all_depots(include_archived: bool = False) -> pd.DataFrame:
    """Get all depots.

    Args:
        include_archived: Include archived depots

    Returns:
        DataFrame with depots
    """
    sql = "SELECT * FROM depot"
    if not include_archived:
        sql += " WHERE is_archived = FALSE"
    sql += " ORDER BY is_default DESC, name"
    return query_df(sql)


def update_depot(depot_id: int, **kwargs) -> bool:
    """Update depot fields.

    Args:
        depot_id: Depot ID
        **kwargs: Fields to update

    Returns:
        True if updated
    """
    allowed_fields = {
        "name",
        "broker_name",
        "account_number",
        "description",
        "currency",
        "is_default",
        "is_archived",
        "settings_include_commission_in_pl",
        "settings_default_withholding_tax_pct",
    }

    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
    if not updates:
        return False

    # Handle is_default specially
    if updates.get("is_default"):
        execute("UPDATE depot SET is_default = FALSE WHERE is_default = TRUE")

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [depot_id]

    execute(
        f"UPDATE depot SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        tuple(values),
    )
    return True


def archive_depot(depot_id: int) -> bool:
    """Archive a depot (soft delete).

    Args:
        depot_id: Depot ID

    Returns:
        True if archived
    """
    execute(
        "UPDATE depot SET is_archived = TRUE, is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (depot_id,),
    )
    return True


def delete_depot(depot_id: int) -> bool:
    """Delete a depot (only if no trades).

    Args:
        depot_id: Depot ID

    Returns:
        True if deleted

    Raises:
        ValueError: If depot has trades
    """
    # Check for trades
    result = query(
        "SELECT COUNT(*) FROM trade_position WHERE depot_id = ?", (depot_id,)
    )
    if result[0][0] > 0:
        raise ValueError("Cannot delete depot with existing trades. Archive it instead.")

    execute("DELETE FROM depot WHERE id = ?", (depot_id,))
    return True


def get_depot_summary(depot_id: int | None = None, year: int | None = None) -> pd.DataFrame:
    """Get depot summary with YTD statistics.

    Args:
        depot_id: Filter by depot (None for all)
        year: Year for YTD calculation (default: current year)

    Returns:
        DataFrame with depot summaries
    """
    if year is None:
        year = date.today().year

    year_start = f"{year}-01-01"

    sql = """
        SELECT
            d.id,
            d.name,
            d.broker_name,
            d.currency,
            d.is_default,
            d.is_archived,
            COALESCE(t.trades_count, 0) as trades_count,
            COALESCE(t.open_positions, 0) as open_positions_count,
            COALESCE(p.total_premium, 0) as total_premium_ytd,
            COALESCE(div.total_dividends, 0) as total_dividends_ytd,
            COALESCE(p.total_commissions, 0) as total_commissions_ytd,
            COALESCE(p.net_pl, 0) as net_profit_loss_ytd
        FROM depot d
        LEFT JOIN (
            SELECT
                depot_id,
                COUNT(*) as trades_count,
                SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_positions
            FROM trade_position
            GROUP BY depot_id
        ) t ON d.id = t.depot_id
        LEFT JOIN (
            SELECT
                depot_id,
                SUM(net_premium) as total_premium,
                SUM(commission_open + COALESCE(commission_close, 0)) as total_commissions,
                SUM(COALESCE(realized_pl, 0)) as net_pl
            FROM trade_position
            WHERE open_date >= ?
            GROUP BY depot_id
        ) p ON d.id = p.depot_id
        LEFT JOIN (
            SELECT
                depot_id,
                SUM(net_amount) as total_dividends
            FROM dividend
            WHERE ex_dividend_date >= ?
            GROUP BY depot_id
        ) div ON d.id = div.depot_id
        WHERE d.is_archived = FALSE
    """

    params = [year_start, year_start]

    if depot_id is not None:
        sql += " AND d.id = ?"
        params.append(depot_id)

    sql += " ORDER BY d.is_default DESC, d.name"

    return query_df(sql, tuple(params))


# =============================================================================
# TRADE POSITION OPERATIONS
# =============================================================================


PositionType = Literal["SHORT_PUT", "SHORT_CALL", "LONG_STOCK"]
CloseType = Literal["EXPIRED", "BUYBACK", "ROLLED", "ASSIGNED", "CALLED_AWAY"]


def create_trade_position(
    depot_id: int,
    security_id: int,
    position_type: PositionType,
    quantity: int,
    open_date: date | str,
    # Options fields
    strike_price: float | None = None,
    expiration_date: date | str | None = None,
    premium_per_contract: float | None = None,
    delta_at_open: float | None = None,
    iv_at_open: float | None = None,
    iv_rank_at_open: float | None = None,
    underlying_price_at_open: float | None = None,
    # Stock fields
    shares: int | None = None,
    cost_per_share: float | None = None,
    # Commission
    commission_open: float = 0.0,
    # Relationships
    wheel_cycle_id: int | None = None,
    covered_by_stock_id: int | None = None,
) -> int:
    """Create a new trade position.

    Args:
        depot_id: Depot ID
        security_id: Security ID
        position_type: SHORT_PUT, SHORT_CALL, or LONG_STOCK
        quantity: Number of contracts (negative for short) or shares
        open_date: Position open date
        strike_price: Strike price (options only)
        expiration_date: Expiration date (options only)
        premium_per_contract: Premium received per contract (options only)
        delta_at_open: Delta at open (optional)
        iv_at_open: Implied volatility at open (optional)
        iv_rank_at_open: IV rank at open (optional)
        underlying_price_at_open: Underlying price at open (optional)
        shares: Number of shares (stocks only)
        cost_per_share: Cost per share (stocks only)
        commission_open: Commission paid on open
        wheel_cycle_id: Associated wheel cycle (optional)
        covered_by_stock_id: Stock position covering this call (optional)

    Returns:
        New trade position ID
    """
    # Convert dates
    if isinstance(open_date, str):
        open_date = datetime.strptime(open_date, "%Y-%m-%d").date()
    if isinstance(expiration_date, str):
        expiration_date = datetime.strptime(expiration_date, "%Y-%m-%d").date()

    # Calculate derived fields
    total_premium = None
    net_premium = None
    break_even = None
    dte_at_open = None

    if position_type in ("SHORT_PUT", "SHORT_CALL") and premium_per_contract is not None:
        total_premium = abs(quantity) * premium_per_contract * 100
        net_premium = total_premium - commission_open

        if position_type == "SHORT_PUT" and strike_price:
            break_even = strike_price - premium_per_contract
        elif position_type == "SHORT_CALL" and strike_price:
            break_even = strike_price + premium_per_contract

        if expiration_date:
            dte_at_open = (expiration_date - open_date).days

    execute(
        """
        INSERT INTO trade_position (
            depot_id, security_id, position_type, status, quantity, open_date,
            strike_price, expiration_date, premium_per_contract,
            delta_at_open, iv_at_open, iv_rank_at_open, underlying_price_at_open,
            shares, cost_per_share, commission_open,
            total_premium, net_premium, break_even, dte_at_open,
            wheel_cycle_id, covered_by_stock_id
        ) VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            depot_id,
            security_id,
            position_type,
            quantity,
            open_date,
            strike_price,
            expiration_date,
            premium_per_contract,
            delta_at_open,
            iv_at_open,
            iv_rank_at_open,
            underlying_price_at_open,
            shares,
            cost_per_share,
            commission_open,
            total_premium,
            net_premium,
            break_even,
            dte_at_open,
            wheel_cycle_id,
            covered_by_stock_id,
        ),
    )

    result = query("SELECT MAX(id) FROM trade_position")
    trade_id = result[0][0]

    logger.info(f"Created {position_type} position ID {trade_id}")
    return trade_id


def get_trade_position(trade_id: int) -> dict[str, Any] | None:
    """Get trade position by ID with security info.

    Args:
        trade_id: Trade position ID

    Returns:
        Trade position record or None
    """
    df = query_df(
        """
        SELECT tp.*, s.ticker, s.name as security_name
        FROM trade_position tp
        JOIN security s ON tp.security_id = s.id
        WHERE tp.id = ?
        """,
        (trade_id,),
    )
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def get_open_positions(
    depot_id: int | None = None,
    position_type: PositionType | None = None,
    security_id: int | None = None,
) -> pd.DataFrame:
    """Get all open positions.

    Args:
        depot_id: Filter by depot (None for all)
        position_type: Filter by position type
        security_id: Filter by security

    Returns:
        DataFrame with open positions
    """
    sql = """
        SELECT tp.*, s.ticker, s.name as security_name, d.name as depot_name
        FROM trade_position tp
        JOIN security s ON tp.security_id = s.id
        JOIN depot d ON tp.depot_id = d.id
        WHERE tp.status = 'OPEN'
    """
    params = []

    if depot_id is not None:
        sql += " AND tp.depot_id = ?"
        params.append(depot_id)

    if position_type is not None:
        sql += " AND tp.position_type = ?"
        params.append(position_type)

    if security_id is not None:
        sql += " AND tp.security_id = ?"
        params.append(security_id)

    sql += " ORDER BY tp.expiration_date ASC, s.ticker"

    return query_df(sql, tuple(params) if params else None)


def get_positions_by_security(
    security_id: int,
    depot_id: int | None = None,
    include_closed: bool = False,
) -> pd.DataFrame:
    """Get all positions for a security.

    Args:
        security_id: Security ID
        depot_id: Filter by depot (None for all)
        include_closed: Include closed positions

    Returns:
        DataFrame with positions
    """
    sql = """
        SELECT tp.*, s.ticker, s.name as security_name, d.name as depot_name
        FROM trade_position tp
        JOIN security s ON tp.security_id = s.id
        JOIN depot d ON tp.depot_id = d.id
        WHERE tp.security_id = ?
    """
    params = [security_id]

    if depot_id is not None:
        sql += " AND tp.depot_id = ?"
        params.append(depot_id)

    if not include_closed:
        sql += " AND tp.status = 'OPEN'"

    sql += " ORDER BY tp.open_date DESC"

    return query_df(sql, tuple(params))


def close_position(
    trade_id: int,
    close_type: CloseType,
    close_date: date | str,
    close_price: float | None = None,
    commission_close: float = 0.0,
) -> dict[str, Any]:
    """Close a trade position.

    Args:
        trade_id: Trade position ID
        close_type: How the position was closed
        close_date: Close date
        close_price: Close/buyback price (optional)
        commission_close: Commission paid on close

    Returns:
        Updated position with realized P&L
    """
    if isinstance(close_date, str):
        close_date = datetime.strptime(close_date, "%Y-%m-%d").date()

    # Get current position
    position = get_trade_position(trade_id)
    if not position:
        raise ValueError(f"Trade position {trade_id} not found")

    if position["status"] == "CLOSED":
        raise ValueError(f"Trade position {trade_id} is already closed")

    # Calculate realized P&L
    realized_pl = _calculate_realized_pl(position, close_type, close_price, commission_close)

    execute(
        """
        UPDATE trade_position SET
            status = 'CLOSED',
            close_type = ?,
            close_date = ?,
            close_price = ?,
            commission_close = ?,
            realized_pl = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (close_type, close_date, close_price, commission_close, realized_pl, trade_id),
    )

    logger.info(f"Closed position {trade_id} ({close_type}), realized P&L: {realized_pl}")

    return get_trade_position(trade_id)


def _calculate_realized_pl(
    position: dict[str, Any],
    close_type: CloseType,
    close_price: float | None,
    commission_close: float,
) -> float:
    """Calculate realized P&L for a closed position.

    Args:
        position: Position record
        close_type: How position was closed
        close_price: Close/buyback price
        commission_close: Commission on close

    Returns:
        Realized P&L
    """
    net_premium = position.get("net_premium") or 0

    if close_type == "EXPIRED":
        # Full premium is profit (option expired worthless)
        return net_premium - commission_close

    elif close_type == "BUYBACK":
        # Premium minus buyback cost
        if close_price is None:
            raise ValueError("close_price required for BUYBACK")
        buyback_cost = abs(position["quantity"]) * close_price * 100
        return net_premium - buyback_cost - commission_close

    elif close_type == "ROLLED":
        # Premium minus buyback cost (new position handles new premium)
        if close_price is None:
            raise ValueError("close_price required for ROLLED")
        buyback_cost = abs(position["quantity"]) * close_price * 100
        return net_premium - buyback_cost - commission_close

    elif close_type == "ASSIGNED":
        # For puts: premium is realized, stock position starts
        # The full premium is profit on the option itself
        return net_premium - commission_close

    elif close_type == "CALLED_AWAY":
        # For covered calls: premium is realized, stock position closes
        return net_premium - commission_close

    return 0


def roll_position(
    trade_id: int,
    roll_date: date | str,
    buyback_price: float,
    buyback_commission: float,
    new_strike: float,
    new_expiration_date: date | str,
    new_premium: float,
    new_commission: float,
) -> tuple[int, int]:
    """Roll a position to a new strike/expiration.

    Args:
        trade_id: Original trade ID
        roll_date: Date of roll
        buyback_price: Price to buy back original position
        buyback_commission: Commission for buyback
        new_strike: New strike price
        new_expiration_date: New expiration date
        new_premium: New premium per contract
        new_commission: Commission for new position

    Returns:
        Tuple of (closed_trade_id, new_trade_id)
    """
    # Get original position
    position = get_trade_position(trade_id)
    if not position:
        raise ValueError(f"Trade position {trade_id} not found")

    # Close original position as ROLLED
    close_position(
        trade_id=trade_id,
        close_type="ROLLED",
        close_date=roll_date,
        close_price=buyback_price,
        commission_close=buyback_commission,
    )

    # Create new position
    new_trade_id = create_trade_position(
        depot_id=position["depot_id"],
        security_id=position["security_id"],
        position_type=position["position_type"],
        quantity=position["quantity"],
        open_date=roll_date,
        strike_price=new_strike,
        expiration_date=new_expiration_date,
        premium_per_contract=new_premium,
        underlying_price_at_open=position.get("underlying_price_at_open"),
        commission_open=new_commission,
        wheel_cycle_id=position.get("wheel_cycle_id"),
    )

    # Link new position to original
    execute(
        "UPDATE trade_position SET rolled_from_trade_id = ? WHERE id = ?",
        (trade_id, new_trade_id),
    )

    logger.info(f"Rolled position {trade_id} to {new_trade_id}")

    return trade_id, new_trade_id


def assign_position(
    trade_id: int,
    assignment_date: date | str,
    assignment_commission: float = 0.0,
) -> int:
    """Process assignment of a put position.

    Creates a LONG_STOCK position at strike price.

    Args:
        trade_id: Put position ID
        assignment_date: Assignment date
        assignment_commission: Commission for stock assignment

    Returns:
        New stock position ID
    """
    position = get_trade_position(trade_id)
    if not position:
        raise ValueError(f"Trade position {trade_id} not found")

    if position["position_type"] != "SHORT_PUT":
        raise ValueError("Only SHORT_PUT positions can be assigned")

    # Close the put as ASSIGNED
    close_position(
        trade_id=trade_id,
        close_type="ASSIGNED",
        close_date=assignment_date,
        commission_close=assignment_commission,
    )

    # Calculate number of shares
    shares = abs(position["quantity"]) * 100

    # Calculate adjusted cost basis (strike - premium/share)
    premium_per_share = (position.get("net_premium") or 0) / shares
    cost_per_share = position["strike_price"] - premium_per_share

    # Create stock position
    stock_id = create_trade_position(
        depot_id=position["depot_id"],
        security_id=position["security_id"],
        position_type="LONG_STOCK",
        quantity=shares,
        open_date=assignment_date,
        shares=shares,
        cost_per_share=cost_per_share,
        commission_open=0,  # Commission already on put
        wheel_cycle_id=position.get("wheel_cycle_id"),
    )

    # Link positions
    execute(
        "UPDATE trade_position SET assigned_to_stock_id = ? WHERE id = ?",
        (stock_id, trade_id),
    )

    logger.info(f"Assigned position {trade_id}, created stock position {stock_id}")

    return stock_id


def get_trade_history(
    depot_id: int | None = None,
    security_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 100,
) -> pd.DataFrame:
    """Get trade history.

    Args:
        depot_id: Filter by depot
        security_id: Filter by security
        start_date: Filter by start date
        end_date: Filter by end date
        limit: Maximum records to return

    Returns:
        DataFrame with trade history
    """
    sql = """
        SELECT tp.*, s.ticker, s.name as security_name, d.name as depot_name
        FROM trade_position tp
        JOIN security s ON tp.security_id = s.id
        JOIN depot d ON tp.depot_id = d.id
        WHERE 1=1
    """
    params = []

    if depot_id is not None:
        sql += " AND tp.depot_id = ?"
        params.append(depot_id)

    if security_id is not None:
        sql += " AND tp.security_id = ?"
        params.append(security_id)

    if start_date is not None:
        sql += " AND tp.open_date >= ?"
        params.append(start_date)

    if end_date is not None:
        sql += " AND tp.open_date <= ?"
        params.append(end_date)

    sql += f" ORDER BY tp.open_date DESC LIMIT {limit}"

    return query_df(sql, tuple(params) if params else None)


# =============================================================================
# WHEEL CYCLE OPERATIONS
# =============================================================================


def create_wheel_cycle(
    depot_id: int,
    security_id: int,
    start_date: date | str,
) -> int:
    """Create a new wheel cycle.

    Args:
        depot_id: Depot ID
        security_id: Security ID
        start_date: Cycle start date

    Returns:
        New wheel cycle ID
    """
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

    year = start_date.year

    # Get next cycle number for this security/year
    result = query(
        """
        SELECT COALESCE(MAX(cycle_number), 0) + 1
        FROM wheel_cycle
        WHERE depot_id = ? AND security_id = ? AND year = ?
        """,
        (depot_id, security_id, year),
    )
    cycle_number = result[0][0]

    execute(
        """
        INSERT INTO wheel_cycle (depot_id, security_id, cycle_number, year, start_date, status)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        """,
        (depot_id, security_id, cycle_number, year, start_date),
    )

    result = query("SELECT MAX(id) FROM wheel_cycle")
    cycle_id = result[0][0]

    logger.info(f"Created wheel cycle {cycle_id} for security {security_id}")

    return cycle_id


def get_wheel_cycle(cycle_id: int) -> dict[str, Any] | None:
    """Get wheel cycle by ID with security info.

    Args:
        cycle_id: Wheel cycle ID

    Returns:
        Wheel cycle record or None
    """
    df = query_df(
        """
        SELECT wc.*, s.ticker, s.name as security_name
        FROM wheel_cycle wc
        JOIN security s ON wc.security_id = s.id
        WHERE wc.id = ?
        """,
        (cycle_id,),
    )
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def get_active_wheel_cycles(depot_id: int | None = None) -> pd.DataFrame:
    """Get all active wheel cycles.

    Args:
        depot_id: Filter by depot (None for all)

    Returns:
        DataFrame with active cycles
    """
    sql = """
        SELECT wc.*, s.ticker, s.name as security_name, d.name as depot_name
        FROM wheel_cycle wc
        JOIN security s ON wc.security_id = s.id
        JOIN depot d ON wc.depot_id = d.id
        WHERE wc.status = 'ACTIVE'
    """
    params = []

    if depot_id is not None:
        sql += " AND wc.depot_id = ?"
        params.append(depot_id)

    sql += " ORDER BY wc.start_date DESC"

    return query_df(sql, tuple(params) if params else None)


def update_wheel_cycle_totals(cycle_id: int) -> None:
    """Recalculate wheel cycle aggregated totals.

    Args:
        cycle_id: Wheel cycle ID
    """
    # Calculate totals from positions
    result = query(
        """
        SELECT
            COALESCE(SUM(net_premium), 0) as total_premium,
            COALESCE(SUM(CASE WHEN close_type = 'BUYBACK' THEN
                ABS(quantity) * close_price * 100 ELSE 0 END), 0) as total_buyback,
            COALESCE(SUM(commission_open + COALESCE(commission_close, 0)), 0) as total_comm
        FROM trade_position
        WHERE wheel_cycle_id = ?
        """,
        (cycle_id,),
    )
    premium, buyback, commissions = result[0]

    # Calculate dividends
    div_result = query(
        "SELECT COALESCE(SUM(net_amount), 0) FROM dividend WHERE wheel_cycle_id = ?",
        (cycle_id,),
    )
    dividends = div_result[0][0]

    # Calculate stock P&L
    stock_result = query(
        """
        SELECT COALESCE(SUM(realized_pl), 0)
        FROM trade_position
        WHERE wheel_cycle_id = ? AND position_type = 'LONG_STOCK' AND status = 'CLOSED'
        """,
        (cycle_id,),
    )
    stock_pl = stock_result[0][0]

    # Net P&L
    net_pl = premium - buyback + dividends + stock_pl

    # Duration
    duration_result = query(
        """
        SELECT
            start_date,
            COALESCE(end_date, CURRENT_DATE) as end_date
        FROM wheel_cycle WHERE id = ?
        """,
        (cycle_id,),
    )
    start, end = duration_result[0]
    if isinstance(start, str):
        start = datetime.strptime(start, "%Y-%m-%d").date()
    if isinstance(end, str):
        end = datetime.strptime(end, "%Y-%m-%d").date()
    duration = (end - start).days

    execute(
        """
        UPDATE wheel_cycle SET
            total_premium_collected = ?,
            total_buyback_cost = ?,
            total_commissions = ?,
            total_dividends = ?,
            stock_profit_loss = ?,
            net_profit_loss = ?,
            duration_days = ?
        WHERE id = ?
        """,
        (premium, buyback, commissions, dividends, stock_pl, net_pl, duration, cycle_id),
    )


def complete_wheel_cycle(cycle_id: int, end_date: date | str) -> None:
    """Mark a wheel cycle as completed.

    Args:
        cycle_id: Wheel cycle ID
        end_date: Cycle end date
    """
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

    # Update totals first
    update_wheel_cycle_totals(cycle_id)

    execute(
        "UPDATE wheel_cycle SET status = 'COMPLETED', end_date = ? WHERE id = ?",
        (end_date, cycle_id),
    )

    logger.info(f"Completed wheel cycle {cycle_id}")


# =============================================================================
# DIVIDEND OPERATIONS
# =============================================================================


def create_dividend(
    depot_id: int,
    security_id: int,
    ex_dividend_date: date | str,
    shares_held: int,
    dividend_per_share: float,
    withholding_tax: float = 0.0,
    payment_date: date | str | None = None,
    stock_position_id: int | None = None,
    wheel_cycle_id: int | None = None,
    currency: str = "USD",
) -> int:
    """Record a dividend.

    Args:
        depot_id: Depot ID
        security_id: Security ID
        ex_dividend_date: Ex-dividend date
        shares_held: Number of shares held
        dividend_per_share: Dividend per share
        withholding_tax: Withholding tax amount
        payment_date: Payment date (optional)
        stock_position_id: Related stock position (optional)
        wheel_cycle_id: Related wheel cycle (optional)
        currency: Currency (default: USD)

    Returns:
        New dividend ID
    """
    if isinstance(ex_dividend_date, str):
        ex_dividend_date = datetime.strptime(ex_dividend_date, "%Y-%m-%d").date()
    if isinstance(payment_date, str):
        payment_date = datetime.strptime(payment_date, "%Y-%m-%d").date()

    gross_amount = shares_held * dividend_per_share
    net_amount = gross_amount - withholding_tax

    execute(
        """
        INSERT INTO dividend (
            depot_id, security_id, stock_position_id, wheel_cycle_id,
            ex_dividend_date, payment_date, shares_held, dividend_per_share,
            gross_amount, withholding_tax, net_amount, currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            depot_id,
            security_id,
            stock_position_id,
            wheel_cycle_id,
            ex_dividend_date,
            payment_date,
            shares_held,
            dividend_per_share,
            gross_amount,
            withholding_tax,
            net_amount,
            currency,
        ),
    )

    result = query("SELECT MAX(id) FROM dividend")
    dividend_id = result[0][0]

    # Update wheel cycle totals if linked
    if wheel_cycle_id:
        update_wheel_cycle_totals(wheel_cycle_id)

    logger.info(f"Created dividend {dividend_id} for security {security_id}")

    return dividend_id


def get_dividends(
    depot_id: int | None = None,
    security_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> pd.DataFrame:
    """Get dividends.

    Args:
        depot_id: Filter by depot
        security_id: Filter by security
        start_date: Filter by start date
        end_date: Filter by end date

    Returns:
        DataFrame with dividends
    """
    sql = """
        SELECT d.*, s.ticker, s.name as security_name
        FROM dividend d
        JOIN security s ON d.security_id = s.id
        WHERE 1=1
    """
    params = []

    if depot_id is not None:
        sql += " AND d.depot_id = ?"
        params.append(depot_id)

    if security_id is not None:
        sql += " AND d.security_id = ?"
        params.append(security_id)

    if start_date is not None:
        sql += " AND d.ex_dividend_date >= ?"
        params.append(start_date)

    if end_date is not None:
        sql += " AND d.ex_dividend_date <= ?"
        params.append(end_date)

    sql += " ORDER BY d.ex_dividend_date DESC"

    return query_df(sql, tuple(params) if params else None)


def get_dividend_summary(
    depot_id: int | None = None,
    year: int | None = None,
) -> dict[str, Any]:
    """Get dividend summary.

    Args:
        depot_id: Filter by depot
        year: Filter by year

    Returns:
        Summary with totals
    """
    if year is None:
        year = date.today().year

    sql = """
        SELECT
            COUNT(*) as dividend_count,
            COALESCE(SUM(gross_amount), 0) as gross_total,
            COALESCE(SUM(withholding_tax), 0) as tax_total,
            COALESCE(SUM(net_amount), 0) as net_total
        FROM dividend
        WHERE EXTRACT(YEAR FROM ex_dividend_date) = ?
    """
    params = [year]

    if depot_id is not None:
        sql += " AND depot_id = ?"
        params.append(depot_id)

    result = query(sql, tuple(params))
    row = result[0]

    return {
        "year": year,
        "dividend_count": row[0],
        "gross_total": float(row[1]),
        "tax_total": float(row[2]),
        "net_total": float(row[3]),
    }


# =============================================================================
# TRADE NOTES OPERATIONS
# =============================================================================


NoteType = Literal["IDEA", "SETUP", "MANAGEMENT", "REVIEW"]


def create_trade_note(
    note_type: NoteType,
    note_date: date | str,
    note_text: str | None = None,
    trade_id: int | None = None,
    security_id: int | None = None,
) -> int:
    """Create a trade note.

    Args:
        note_type: Type of note (IDEA, SETUP, MANAGEMENT, REVIEW)
        note_date: Note date
        note_text: Note content
        trade_id: Related trade (optional)
        security_id: Related security (optional)

    Returns:
        New note ID
    """
    if isinstance(note_date, str):
        note_date = datetime.strptime(note_date, "%Y-%m-%d").date()

    is_linked = trade_id is not None

    execute(
        """
        INSERT INTO trade_note (trade_id, security_id, note_type, note_date, note_text, is_linked_to_trade)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (trade_id, security_id, note_type, note_date, note_text, is_linked),
    )

    result = query("SELECT MAX(id) FROM trade_note")
    note_id = result[0][0]

    logger.info(f"Created {note_type} note ID {note_id}")

    return note_id


def get_trade_note(note_id: int) -> dict[str, Any] | None:
    """Get trade note by ID.

    Args:
        note_id: Note ID

    Returns:
        Note record or None
    """
    df = query_df(
        """
        SELECT tn.*, s.ticker
        FROM trade_note tn
        LEFT JOIN security s ON tn.security_id = s.id
        WHERE tn.id = ?
        """,
        (note_id,),
    )
    if df.empty:
        return None

    note = df.iloc[0].to_dict()

    # Get screenshots
    screenshots = get_note_screenshots(note_id)
    note["screenshots"] = screenshots.to_dict("records") if not screenshots.empty else []

    return note


def get_notes_for_trade(trade_id: int) -> pd.DataFrame:
    """Get all notes for a trade.

    Args:
        trade_id: Trade ID

    Returns:
        DataFrame with notes
    """
    return query_df(
        """
        SELECT * FROM trade_note
        WHERE trade_id = ?
        ORDER BY note_date DESC, created_at DESC
        """,
        (trade_id,),
    )


def get_notes_for_security(security_id: int, include_unlinked: bool = True) -> pd.DataFrame:
    """Get all notes for a security.

    Args:
        security_id: Security ID
        include_unlinked: Include notes not linked to trades

    Returns:
        DataFrame with notes
    """
    sql = """
        SELECT tn.*, s.ticker
        FROM trade_note tn
        LEFT JOIN security s ON tn.security_id = s.id
        WHERE tn.security_id = ?
    """

    if not include_unlinked:
        sql += " AND tn.is_linked_to_trade = TRUE"

    sql += " ORDER BY tn.note_date DESC, tn.created_at DESC"

    return query_df(sql, (security_id,))


def get_trade_ideas(
    linked_only: bool = False,
    start_date: date | None = None,
    end_date: date | None = None,
) -> pd.DataFrame:
    """Get trade ideas.

    Args:
        linked_only: Only return ideas linked to trades
        start_date: Filter by start date
        end_date: Filter by end date

    Returns:
        DataFrame with trade ideas
    """
    sql = """
        SELECT tn.*, s.ticker, s.name as security_name
        FROM trade_note tn
        LEFT JOIN security s ON tn.security_id = s.id
        WHERE tn.note_type = 'IDEA'
    """
    params = []

    if linked_only:
        sql += " AND tn.is_linked_to_trade = TRUE"

    if start_date:
        sql += " AND tn.note_date >= ?"
        params.append(start_date)

    if end_date:
        sql += " AND tn.note_date <= ?"
        params.append(end_date)

    sql += " ORDER BY tn.note_date DESC"

    return query_df(sql, tuple(params) if params else None)


def update_trade_note(note_id: int, **kwargs) -> bool:
    """Update a trade note.

    Args:
        note_id: Note ID
        **kwargs: Fields to update (note_text, note_type)

    Returns:
        True if updated
    """
    allowed = {"note_text", "note_type", "trade_id", "security_id"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}

    if not updates:
        return False

    # Update is_linked_to_trade if trade_id changes
    if "trade_id" in updates:
        updates["is_linked_to_trade"] = updates["trade_id"] is not None

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [note_id]

    execute(f"UPDATE trade_note SET {set_clause} WHERE id = ?", tuple(values))
    return True


def delete_trade_note(note_id: int) -> bool:
    """Delete a trade note (also deletes screenshots).

    Args:
        note_id: Note ID

    Returns:
        True if deleted
    """
    execute("DELETE FROM trade_note WHERE id = ?", (note_id,))
    return True


def add_screenshot(
    note_id: int,
    file_path: str,
    file_name: str,
    caption: str | None = None,
) -> int:
    """Add a screenshot to a note.

    Args:
        note_id: Note ID
        file_path: Path to screenshot file
        file_name: Original file name
        caption: Optional caption

    Returns:
        Screenshot ID
    """
    # Get next sort order
    result = query(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM trade_screenshot WHERE note_id = ?",
        (note_id,),
    )
    sort_order = result[0][0]

    execute(
        """
        INSERT INTO trade_screenshot (note_id, file_path, file_name, caption, sort_order)
        VALUES (?, ?, ?, ?, ?)
        """,
        (note_id, file_path, file_name, caption, sort_order),
    )

    result = query("SELECT MAX(id) FROM trade_screenshot")
    return result[0][0]


def get_note_screenshots(note_id: int) -> pd.DataFrame:
    """Get screenshots for a note.

    Args:
        note_id: Note ID

    Returns:
        DataFrame with screenshots
    """
    return query_df(
        "SELECT * FROM trade_screenshot WHERE note_id = ? ORDER BY sort_order",
        (note_id,),
    )


def delete_screenshot(screenshot_id: int) -> bool:
    """Delete a screenshot.

    Args:
        screenshot_id: Screenshot ID

    Returns:
        True if deleted
    """
    execute("DELETE FROM trade_screenshot WHERE id = ?", (screenshot_id,))
    return True


# =============================================================================
# SCREENING PROFILE OPERATIONS
# =============================================================================


IndicatorType = Literal["RSI", "BB", "SMA", "EMA", "MACD", "VOLUME", "PRICE"]
ScreeningOperator = Literal["LT", "GT", "BETWEEN", "EQ", "POSITION"]
PositionValue = Literal["LOWER_THIRD", "MIDDLE_THIRD", "UPPER_THIRD", "BELOW_LOWER", "ABOVE_UPPER"]


def create_screening_profile(
    name: str,
    description: str | None = None,
    timeframe: str = "D",
) -> int:
    """Create a screening profile.

    Args:
        name: Profile name
        description: Profile description
        timeframe: D (daily) or W (weekly)

    Returns:
        New profile ID
    """
    execute(
        """
        INSERT INTO screening_profile (name, description, timeframe, is_system_template)
        VALUES (?, ?, ?, FALSE)
        """,
        (name, description, timeframe),
    )

    result = query("SELECT id FROM screening_profile WHERE name = ?", (name,))
    profile_id = result[0][0]

    logger.info(f"Created screening profile '{name}' with ID {profile_id}")

    return profile_id


def get_screening_profile(profile_id: int) -> dict[str, Any] | None:
    """Get screening profile with criteria.

    Args:
        profile_id: Profile ID

    Returns:
        Profile record with criteria or None
    """
    df = query_df("SELECT * FROM screening_profile WHERE id = ?", (profile_id,))
    if df.empty:
        return None

    profile = df.iloc[0].to_dict()

    # Get criteria
    criteria = get_profile_criteria(profile_id)
    profile["criteria"] = criteria.to_dict("records") if not criteria.empty else []

    return profile


def get_screening_profile_by_name(name: str) -> dict[str, Any] | None:
    """Get screening profile by name.

    Args:
        name: Profile name

    Returns:
        Profile record with criteria or None
    """
    df = query_df("SELECT * FROM screening_profile WHERE name = ?", (name,))
    if df.empty:
        return None

    profile = df.iloc[0].to_dict()
    criteria = get_profile_criteria(profile["id"])
    profile["criteria"] = criteria.to_dict("records") if not criteria.empty else []

    return profile


def get_all_screening_profiles(include_system: bool = True) -> pd.DataFrame:
    """Get all screening profiles.

    Args:
        include_system: Include system templates

    Returns:
        DataFrame with profiles
    """
    sql = "SELECT * FROM screening_profile"
    if not include_system:
        sql += " WHERE is_system_template = FALSE"
    sql += " ORDER BY is_system_template DESC, name"

    return query_df(sql)


def update_screening_profile(profile_id: int, **kwargs) -> bool:
    """Update a screening profile.

    Args:
        profile_id: Profile ID
        **kwargs: Fields to update

    Returns:
        True if updated
    """
    # Check if system template
    result = query(
        "SELECT is_system_template FROM screening_profile WHERE id = ?",
        (profile_id,),
    )
    if result and result[0][0]:
        raise ValueError("Cannot modify system templates")

    allowed = {"name", "description", "timeframe"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}

    if not updates:
        return False

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [profile_id]

    execute(
        f"UPDATE screening_profile SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        tuple(values),
    )
    return True


def delete_screening_profile(profile_id: int) -> bool:
    """Delete a screening profile (also deletes criteria).

    Args:
        profile_id: Profile ID

    Returns:
        True if deleted

    Raises:
        ValueError: If trying to delete system template
    """
    result = query(
        "SELECT is_system_template FROM screening_profile WHERE id = ?",
        (profile_id,),
    )
    if result and result[0][0]:
        raise ValueError("Cannot delete system templates")

    execute("DELETE FROM screening_profile WHERE id = ?", (profile_id,))
    return True


def add_screening_criterion(
    profile_id: int,
    indicator_type: IndicatorType,
    operator: ScreeningOperator,
    param_period: int | None = None,
    param_period_2: int | None = None,
    param_period_3: int | None = None,
    param_std_dev: float | None = None,
    value_1: float | None = None,
    value_2: float | None = None,
    position_value: PositionValue | None = None,
    is_active: bool = True,
) -> int:
    """Add a criterion to a screening profile.

    Args:
        profile_id: Profile ID
        indicator_type: RSI, BB, SMA, EMA, MACD, VOLUME, PRICE
        operator: LT, GT, BETWEEN, EQ, POSITION
        param_period: Primary period parameter
        param_period_2: Secondary period (MACD slow, etc.)
        param_period_3: Tertiary period (MACD signal)
        param_std_dev: Standard deviation (BB)
        value_1: Primary comparison value
        value_2: Secondary value (for BETWEEN)
        position_value: Position in range (LOWER_THIRD, etc.)
        is_active: Whether criterion is active

    Returns:
        Criterion ID
    """
    # Get next sort order
    result = query(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM screening_criterion WHERE profile_id = ?",
        (profile_id,),
    )
    sort_order = result[0][0]

    execute(
        """
        INSERT INTO screening_criterion (
            profile_id, indicator_type, operator, is_active,
            param_period, param_period_2, param_period_3, param_std_dev,
            value_1, value_2, position_value, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            profile_id,
            indicator_type,
            operator,
            is_active,
            param_period,
            param_period_2,
            param_period_3,
            param_std_dev,
            value_1,
            value_2,
            position_value,
            sort_order,
        ),
    )

    result = query("SELECT MAX(id) FROM screening_criterion")
    return result[0][0]


def get_profile_criteria(profile_id: int) -> pd.DataFrame:
    """Get all criteria for a profile.

    Args:
        profile_id: Profile ID

    Returns:
        DataFrame with criteria
    """
    return query_df(
        "SELECT * FROM screening_criterion WHERE profile_id = ? ORDER BY sort_order",
        (profile_id,),
    )


def update_screening_criterion(criterion_id: int, **kwargs) -> bool:
    """Update a screening criterion.

    Args:
        criterion_id: Criterion ID
        **kwargs: Fields to update

    Returns:
        True if updated
    """
    allowed = {
        "indicator_type",
        "operator",
        "is_active",
        "param_period",
        "param_period_2",
        "param_period_3",
        "param_std_dev",
        "value_1",
        "value_2",
        "position_value",
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed}

    if not updates:
        return False

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [criterion_id]

    execute(f"UPDATE screening_criterion SET {set_clause} WHERE id = ?", tuple(values))
    return True


def delete_screening_criterion(criterion_id: int) -> bool:
    """Delete a screening criterion.

    Args:
        criterion_id: Criterion ID

    Returns:
        True if deleted
    """
    execute("DELETE FROM screening_criterion WHERE id = ?", (criterion_id,))
    return True


# =============================================================================
# USER SETTINGS OPERATIONS
# =============================================================================


def get_user_setting(key: str) -> str | None:
    """Get a user setting.

    Args:
        key: Setting key

    Returns:
        Setting value or None
    """
    result = query(
        "SELECT setting_value FROM user_settings WHERE setting_key = ?",
        (key,),
    )
    return result[0][0] if result else None


def set_user_setting(key: str, value: str) -> None:
    """Set a user setting.

    Args:
        key: Setting key
        value: Setting value
    """
    execute(
        """
        INSERT INTO user_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = excluded.setting_value,
            updated_at = CURRENT_TIMESTAMP
        """,
        (key, value),
    )


def get_all_user_settings() -> dict[str, str]:
    """Get all user settings.

    Returns:
        Dictionary of settings
    """
    df = query_df("SELECT setting_key, setting_value FROM user_settings")
    return dict(zip(df["setting_key"], df["setting_value"])) if not df.empty else {}


def get_language() -> str:
    """Get current language setting.

    Returns:
        Language code (en or de)
    """
    return get_user_setting("language") or "en"


def set_language(language: str) -> None:
    """Set language.

    Args:
        language: Language code (en or de)
    """
    if language not in ("en", "de"):
        raise ValueError("Language must be 'en' or 'de'")
    set_user_setting("language", language)


def get_date_format() -> str:
    """Get current date format setting.

    Returns:
        Date format string
    """
    return get_user_setting("date_format") or "YYYY-MM-DD"


def set_date_format(format_str: str) -> None:
    """Set date format.

    Args:
        format_str: Date format (YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY)
    """
    valid_formats = ("YYYY-MM-DD", "DD.MM.YYYY", "MM/DD/YYYY")
    if format_str not in valid_formats:
        raise ValueError(f"Date format must be one of {valid_formats}")
    set_user_setting("date_format", format_str)


def get_number_format() -> str:
    """Get current number format setting.

    Returns:
        Number format locale
    """
    return get_user_setting("number_format") or "en-US"


def set_number_format(format_locale: str) -> None:
    """Set number format.

    Args:
        format_locale: Number format locale (en-US or de-DE)
    """
    if format_locale not in ("en-US", "de-DE"):
        raise ValueError("Number format must be 'en-US' or 'de-DE'")
    set_user_setting("number_format", format_locale)


def get_theme() -> str:
    """Get current theme setting.

    Returns:
        Theme (light, dark, system)
    """
    return get_user_setting("theme") or "system"


def set_theme(theme: str) -> None:
    """Set theme.

    Args:
        theme: Theme (light, dark, system)
    """
    if theme not in ("light", "dark", "system"):
        raise ValueError("Theme must be 'light', 'dark', or 'system'")
    set_user_setting("theme", theme)


# =============================================================================
# CHART REPLAY OPERATIONS
# =============================================================================


def get_or_create_replay_session(security_id: int) -> dict[str, Any]:
    """Get or create a chart replay session.

    Args:
        security_id: Security ID

    Returns:
        Replay session record
    """
    df = query_df(
        """
        SELECT rs.*, s.ticker
        FROM replay_session rs
        JOIN security s ON rs.security_id = s.id
        WHERE rs.security_id = ?
        """,
        (security_id,),
    )

    if not df.empty:
        # Update last accessed
        execute(
            "UPDATE replay_session SET last_accessed = CURRENT_TIMESTAMP WHERE security_id = ?",
            (security_id,),
        )
        return df.iloc[0].to_dict()

    # Get latest date for this security
    result = query(
        "SELECT MAX(price_date) FROM daily_price WHERE security_id = ?",
        (security_id,),
    )
    current_date = result[0][0] if result and result[0][0] else date.today()

    execute(
        """
        INSERT INTO replay_session (security_id, current_date, timeframe, viewport_size)
        VALUES (?, ?, 'D', 100)
        """,
        (security_id, current_date),
    )

    return get_or_create_replay_session(security_id)


def update_replay_session(
    security_id: int,
    current_date: date | str | None = None,
    timeframe: str | None = None,
    viewport_size: int | None = None,
) -> None:
    """Update replay session state.

    Args:
        security_id: Security ID
        current_date: Current replay date
        timeframe: D or W
        viewport_size: Number of visible candles
    """
    updates = []
    params = []

    if current_date is not None:
        if isinstance(current_date, str):
            current_date = datetime.strptime(current_date, "%Y-%m-%d").date()
        updates.append("current_date = ?")
        params.append(current_date)

    if timeframe is not None:
        updates.append("timeframe = ?")
        params.append(timeframe)

    if viewport_size is not None:
        updates.append("viewport_size = ?")
        params.append(viewport_size)

    if updates:
        updates.append("last_accessed = CURRENT_TIMESTAMP")
        params.append(security_id)
        execute(
            f"UPDATE replay_session SET {', '.join(updates)} WHERE security_id = ?",
            tuple(params),
        )


def create_chart_note(
    security_id: int,
    note_date: date | str,
    note_text: str | None = None,
    screenshot_path: str | None = None,
) -> int:
    """Create a chart annotation/note.

    Args:
        security_id: Security ID
        note_date: Date for the note
        note_text: Note content
        screenshot_path: Path to screenshot

    Returns:
        Chart note ID
    """
    if isinstance(note_date, str):
        note_date = datetime.strptime(note_date, "%Y-%m-%d").date()

    execute(
        """
        INSERT INTO chart_note (security_id, note_date, note_text, screenshot_path)
        VALUES (?, ?, ?, ?)
        """,
        (security_id, note_date, note_text, screenshot_path),
    )

    result = query("SELECT MAX(id) FROM chart_note")
    return result[0][0]


def get_chart_notes(
    security_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> pd.DataFrame:
    """Get chart notes for a security.

    Args:
        security_id: Security ID
        start_date: Filter by start date
        end_date: Filter by end date

    Returns:
        DataFrame with chart notes
    """
    sql = "SELECT * FROM chart_note WHERE security_id = ?"
    params = [security_id]

    if start_date:
        sql += " AND note_date >= ?"
        params.append(start_date)

    if end_date:
        sql += " AND note_date <= ?"
        params.append(end_date)

    sql += " ORDER BY note_date"

    return query_df(sql, tuple(params))


def delete_chart_note(note_id: int) -> bool:
    """Delete a chart note.

    Args:
        note_id: Note ID

    Returns:
        True if deleted
    """
    execute("DELETE FROM chart_note WHERE id = ?", (note_id,))
    return True


# =============================================================================
# DASHBOARD / SUMMARY OPERATIONS
# =============================================================================


def get_dashboard_summary(
    depot_id: int | None = None,
    year: int | None = None,
) -> dict[str, Any]:
    """Get dashboard summary data.

    Args:
        depot_id: Filter by depot (None for all)
        year: Year for YTD calculation

    Returns:
        Dashboard summary
    """
    if year is None:
        year = date.today().year

    year_start = f"{year}-01-01"

    # Open positions summary
    open_sql = """
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN position_type = 'SHORT_PUT' THEN 1 ELSE 0 END) as puts,
            SUM(CASE WHEN position_type = 'SHORT_CALL' THEN 1 ELSE 0 END) as calls,
            SUM(CASE WHEN position_type = 'LONG_STOCK' THEN 1 ELSE 0 END) as stocks,
            SUM(COALESCE(net_premium, 0)) as premium_at_risk,
            MIN(expiration_date) as nearest_exp
        FROM trade_position
        WHERE status = 'OPEN'
    """
    params = []
    if depot_id:
        open_sql += " AND depot_id = ?"
        params.append(depot_id)

    open_result = query(open_sql, tuple(params) if params else None)
    open_row = open_result[0]

    # YTD summary
    ytd_sql = """
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
    """
    ytd_params = [year_start, year_start, year_start, year_start]
    if depot_id:
        ytd_sql += " AND depot_id = ?"
        ytd_params.append(depot_id)

    ytd_result = query(ytd_sql, tuple(ytd_params))
    ytd_row = ytd_result[0]

    # Dividends YTD
    div_sql = """
        SELECT COALESCE(SUM(net_amount), 0)
        FROM dividend
        WHERE ex_dividend_date >= ?
    """
    div_params = [year_start]
    if depot_id:
        div_sql += " AND depot_id = ?"
        div_params.append(depot_id)

    div_result = query(div_sql, tuple(div_params))
    dividends = div_result[0][0]

    win_rate = (ytd_row[5] / ytd_row[6] * 100) if ytd_row[6] > 0 else 0

    return {
        "open_positions": {
            "total": open_row[0],
            "short_puts": open_row[1],
            "short_calls": open_row[2],
            "long_stocks": open_row[3],
            "premium_at_risk": float(open_row[4] or 0),
            "nearest_expiration": open_row[5],
        },
        "ytd_summary": {
            "total_premium": float(ytd_row[0] or 0),
            "total_dividends": float(dividends or 0),
            "total_commissions": float(ytd_row[1] or 0),
            "net_profit_loss": float(ytd_row[2] or 0) + float(dividends or 0),
            "trades_opened": ytd_row[3],
            "trades_closed": ytd_row[4],
            "win_rate": win_rate,
        },
        "depot_filter": depot_id,
        "year": year,
    }
