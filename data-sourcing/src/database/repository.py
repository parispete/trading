"""Repository for database operations."""

import logging
from datetime import date, datetime
from typing import Any

import pandas as pd

from .connection import execute, query, query_df, get_connection

logger = logging.getLogger(__name__)


# ===================
# Security Operations
# ===================


def upsert_security(
    ticker: str,
    name: str | None = None,
    exchange: str | None = None,
    asset_type: str = "Stock",
    first_trade_date: date | None = None,
    last_trade_date: date | None = None,
) -> int:
    """Insert or update a security.

    Args:
        ticker: Stock symbol
        name: Company name
        exchange: Exchange name
        asset_type: Type of asset (Stock, ETF, etc.)
        first_trade_date: First available trading date
        last_trade_date: Most recent trading date

    Returns:
        Security ID
    """
    conn = get_connection()

    # Check if exists
    result = query("SELECT id FROM security WHERE ticker = ?", (ticker.upper(),))

    if result:
        # Update existing
        security_id = result[0][0]
        execute(
            """
            UPDATE security SET
                name = COALESCE(?, name),
                exchange = COALESCE(?, exchange),
                asset_type = COALESCE(?, asset_type),
                first_trade_date = COALESCE(?, first_trade_date),
                last_trade_date = COALESCE(?, last_trade_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (name, exchange, asset_type, first_trade_date, last_trade_date, security_id),
        )
    else:
        # Insert new
        execute(
            """
            INSERT INTO security (ticker, name, exchange, asset_type, first_trade_date, last_trade_date)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (ticker.upper(), name, exchange, asset_type, first_trade_date, last_trade_date),
        )
        result = query("SELECT id FROM security WHERE ticker = ?", (ticker.upper(),))
        security_id = result[0][0]

    return security_id


def get_security_id(ticker: str) -> int | None:
    """Get security ID by ticker.

    Args:
        ticker: Stock symbol

    Returns:
        Security ID or None if not found
    """
    result = query("SELECT id FROM security WHERE ticker = ?", (ticker.upper(),))
    return result[0][0] if result else None


def get_security(ticker: str) -> dict[str, Any] | None:
    """Get full security record by ticker.

    Args:
        ticker: Stock symbol

    Returns:
        Security record as dictionary or None
    """
    df = query_df("SELECT * FROM security WHERE ticker = ?", (ticker.upper(),))
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def get_all_securities() -> pd.DataFrame:
    """Get all securities.

    Returns:
        DataFrame with all securities
    """
    return query_df("SELECT * FROM security ORDER BY ticker")


# ===================
# Price Operations
# ===================


def insert_prices(security_id: int, prices_df: pd.DataFrame) -> int:
    """Insert price records for a security.

    Args:
        security_id: Security ID
        prices_df: DataFrame with price data from Tiingo

    Returns:
        Number of records inserted
    """
    if prices_df.empty:
        return 0

    conn = get_connection()

    # Prepare data
    prices_df = prices_df.copy()
    prices_df["security_id"] = security_id

    # Rename columns to match schema
    column_map = {
        "date": "price_date",
        "adjOpen": "adj_open",
        "adjHigh": "adj_high",
        "adjLow": "adj_low",
        "adjClose": "adj_close",
        "adjVolume": "adj_volume",
        "divCash": "div_cash",
        "splitFactor": "split_factor",
    }
    prices_df = prices_df.rename(columns=column_map)

    # Select columns that exist
    available_columns = [
        "security_id",
        "price_date",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "adj_open",
        "adj_high",
        "adj_low",
        "adj_close",
        "adj_volume",
        "div_cash",
        "split_factor",
    ]
    columns = [c for c in available_columns if c in prices_df.columns]
    prices_df = prices_df[columns]

    # Use INSERT OR REPLACE for upsert
    conn.execute("DELETE FROM daily_price WHERE security_id = ? AND price_date IN (SELECT price_date FROM prices_df)", [security_id])
    conn.execute("INSERT INTO daily_price SELECT * FROM prices_df")

    return len(prices_df)


def get_last_price_date(security_id: int) -> date | None:
    """Get the most recent price date for a security.

    Args:
        security_id: Security ID

    Returns:
        Most recent date or None
    """
    result = query(
        "SELECT MAX(price_date) FROM daily_price WHERE security_id = ?",
        (security_id,),
    )
    if result and result[0][0]:
        return result[0][0]
    return None


def get_price_history(
    ticker: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> pd.DataFrame:
    """Get price history for a ticker.

    Args:
        ticker: Stock symbol
        start_date: Optional start date filter
        end_date: Optional end date filter

    Returns:
        DataFrame with price history
    """
    sql = """
        SELECT dp.* 
        FROM daily_price dp
        JOIN security s ON dp.security_id = s.id
        WHERE s.ticker = ?
    """
    params = [ticker.upper()]

    if start_date:
        sql += " AND dp.price_date >= ?"
        params.append(start_date)

    if end_date:
        sql += " AND dp.price_date <= ?"
        params.append(end_date)

    sql += " ORDER BY dp.price_date"

    return query_df(sql, tuple(params))


# ===================
# Watchlist Operations
# ===================


def add_to_watchlist(
    ticker: str,
    list_name: str = "default",
    priority: int = 100,
    notes: str | None = None,
) -> bool:
    """Add a security to a watchlist.

    Args:
        ticker: Stock symbol
        list_name: Watchlist name
        priority: Sort priority (lower = higher priority)
        notes: Optional notes

    Returns:
        True if added, False if already exists
    """
    security_id = get_security_id(ticker)
    if not security_id:
        logger.warning(f"Security {ticker} not found")
        return False

    try:
        execute(
            """
            INSERT INTO watchlist (security_id, list_name, priority, notes)
            VALUES (?, ?, ?, ?)
            """,
            (security_id, list_name, priority, notes),
        )
        return True
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            logger.debug(f"{ticker} already in watchlist {list_name}")
            return False
        raise


def get_watchlist(list_name: str = "default") -> pd.DataFrame:
    """Get watchlist items with security info.

    Args:
        list_name: Watchlist name

    Returns:
        DataFrame with watchlist items
    """
    return query_df(
        """
        SELECT w.*, s.ticker, s.name, s.exchange
        FROM watchlist w
        JOIN security s ON w.security_id = s.id
        WHERE w.list_name = ?
        ORDER BY w.priority, s.ticker
        """,
        (list_name,),
    )


def get_watchlist_tickers(list_name: str = "default") -> list[str]:
    """Get list of tickers in a watchlist.

    Args:
        list_name: Watchlist name

    Returns:
        List of ticker symbols
    """
    result = query(
        """
        SELECT s.ticker
        FROM watchlist w
        JOIN security s ON w.security_id = s.id
        WHERE w.list_name = ?
        ORDER BY w.priority, s.ticker
        """,
        (list_name,),
    )
    return [row[0] for row in result]


# ===================
# Sync Log Operations
# ===================


def start_sync_log(sync_type: str) -> int:
    """Start a sync operation log.

    Args:
        sync_type: Type of sync (full, incremental, backfill)

    Returns:
        Sync log ID
    """
    execute(
        """
        INSERT INTO sync_log (sync_type, status)
        VALUES (?, 'running')
        """,
        (sync_type,),
    )
    result = query("SELECT MAX(id) FROM sync_log")
    return result[0][0]


def complete_sync_log(
    sync_id: int,
    symbols_processed: int,
    records_inserted: int,
    records_updated: int,
    errors_count: int,
    duration_seconds: float,
    error_details: str | None = None,
) -> None:
    """Complete a sync operation log.

    Args:
        sync_id: Sync log ID
        symbols_processed: Number of symbols processed
        records_inserted: Number of new records
        records_updated: Number of updated records
        errors_count: Number of errors
        duration_seconds: Duration in seconds
        error_details: Optional error details
    """
    status = "completed" if errors_count == 0 else "failed"
    execute(
        """
        UPDATE sync_log SET
            symbols_processed = ?,
            records_inserted = ?,
            records_updated = ?,
            errors_count = ?,
            duration_seconds = ?,
            status = ?,
            error_details = ?
        WHERE id = ?
        """,
        (
            symbols_processed,
            records_inserted,
            records_updated,
            errors_count,
            duration_seconds,
            status,
            error_details,
            sync_id,
        ),
    )


def get_database_stats() -> dict[str, Any]:
    """Get database statistics.

    Returns:
        Dictionary with stats
    """
    securities = query("SELECT COUNT(*) FROM security")[0][0]
    prices = query("SELECT COUNT(*) FROM daily_price")[0][0]
    date_range = query(
        "SELECT MIN(price_date), MAX(price_date) FROM daily_price"
    )[0]

    return {
        "securities": securities,
        "price_records": prices,
        "oldest_date": date_range[0],
        "newest_date": date_range[1],
    }
