"""Database schema definitions and migrations."""

import logging

from .connection import execute, is_initialized, table_exists

logger = logging.getLogger(__name__)

# Schema version for migrations
SCHEMA_VERSION = 1

SCHEMA_SQL = """
-- Create sequences for auto-increment (DuckDB style)
CREATE SEQUENCE IF NOT EXISTS security_id_seq;
CREATE SEQUENCE IF NOT EXISTS watchlist_id_seq;
CREATE SEQUENCE IF NOT EXISTS api_usage_id_seq;
CREATE SEQUENCE IF NOT EXISTS sync_log_id_seq;

-- Security master data
CREATE TABLE IF NOT EXISTS security (
    id INTEGER PRIMARY KEY DEFAULT nextval('security_id_seq'),
    ticker VARCHAR(12) NOT NULL UNIQUE,
    name VARCHAR(200),
    exchange VARCHAR(20),
    asset_type VARCHAR(20) DEFAULT 'Stock',
    currency VARCHAR(3) DEFAULT 'USD',
    first_trade_date DATE,
    last_trade_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    tiingo_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_ticker ON security(ticker);
CREATE INDEX IF NOT EXISTS idx_security_active ON security(is_active);

-- Daily OHLC price data
CREATE TABLE IF NOT EXISTS daily_price (
    security_id INTEGER NOT NULL,
    price_date DATE NOT NULL,
    
    -- Raw prices
    open DECIMAL(14,4),
    high DECIMAL(14,4),
    low DECIMAL(14,4),
    close DECIMAL(14,4),
    volume BIGINT,
    
    -- Adjusted prices (for splits/dividends)
    adj_open DECIMAL(14,4),
    adj_high DECIMAL(14,4),
    adj_low DECIMAL(14,4),
    adj_close DECIMAL(14,4),
    adj_volume BIGINT,
    
    -- Corporate actions
    div_cash DECIMAL(10,4) DEFAULT 0,
    split_factor DECIMAL(10,6) DEFAULT 1.0,
    
    -- Metadata
    data_source VARCHAR(20) DEFAULT 'tiingo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (security_id, price_date),
    FOREIGN KEY (security_id) REFERENCES security(id)
);

CREATE INDEX IF NOT EXISTS idx_price_date ON daily_price(price_date);
CREATE INDEX IF NOT EXISTS idx_price_security_date ON daily_price(security_id, price_date DESC);

-- Watchlist management
CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY DEFAULT nextval('watchlist_id_seq'),
    security_id INTEGER NOT NULL,
    list_name VARCHAR(50) DEFAULT 'default',
    priority INTEGER DEFAULT 100,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    FOREIGN KEY (security_id) REFERENCES security(id),
    UNIQUE (security_id, list_name)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_list ON watchlist(list_name);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY DEFAULT nextval('api_usage_id_seq'),
    usage_date DATE NOT NULL UNIQUE,
    requests_made INTEGER DEFAULT 0,
    symbols_queried INTEGER DEFAULT 0,
    reset_at TIMESTAMP
);

-- Sync operation logging
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY DEFAULT nextval('sync_log_id_seq'),
    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_type VARCHAR(20) NOT NULL,
    symbols_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    duration_seconds DECIMAL(10,2),
    status VARCHAR(20) NOT NULL,
    error_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_date ON sync_log(sync_date DESC);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def create_schema() -> None:
    """Create all database tables."""
    logger.info("Creating database schema...")

    # Split and execute each statement
    statements = [s.strip() for s in SCHEMA_SQL.split(";") if s.strip()]

    for statement in statements:
        try:
            execute(statement)
        except Exception as e:
            logger.error(f"Failed to execute: {statement[:50]}... Error: {e}")
            raise

    # Record schema version
    execute(
        """
        INSERT INTO schema_version (version) 
        SELECT ? WHERE NOT EXISTS (SELECT 1 FROM schema_version WHERE version = ?)
        """,
        (SCHEMA_VERSION, SCHEMA_VERSION),
    )

    logger.info("Database schema created successfully")


def initialize_database() -> bool:
    """Initialize the database if not already done.

    Returns:
        True if initialization was performed, False if already initialized
    """
    if is_initialized():
        logger.info("Database already initialized")
        return False

    create_schema()
    return True


def get_schema_version() -> int | None:
    """Get the current schema version.

    Returns:
        Schema version number or None if not initialized
    """
    if not table_exists("schema_version"):
        return None

    from .connection import query

    result = query("SELECT MAX(version) FROM schema_version")
    return result[0][0] if result else None
