"""Trading Journal schema definitions.

This module extends the base data-sourcing schema with tables for:
- Depot management (multi-account support)
- Trade positions (options, stocks)
- Wheel cycle tracking
- Dividends
- Notes and screenshots
- Broker import
- Chart replay sessions
- Technical screening profiles
- User settings (i18n)

All new tables use security_id as FK to maintain consistency with
the existing data-sourcing schema.
"""

import logging
from .connection import execute, table_exists

logger = logging.getLogger(__name__)

# Schema version for journal tables
JOURNAL_SCHEMA_VERSION = 1

# =============================================================================
# SECURITY TABLE EXTENSION
# =============================================================================

SECURITY_EXTENSION_SQL = """
-- Add sector and industry columns to security table if not exist
-- These are needed for fundamental analysis screening
ALTER TABLE security ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE security ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
"""

# =============================================================================
# DEPOT MANAGEMENT
# =============================================================================

DEPOT_SCHEMA_SQL = """
-- Create sequences for journal tables
CREATE SEQUENCE IF NOT EXISTS depot_id_seq;
CREATE SEQUENCE IF NOT EXISTS trade_position_id_seq;
CREATE SEQUENCE IF NOT EXISTS wheel_cycle_id_seq;
CREATE SEQUENCE IF NOT EXISTS dividend_id_seq;
CREATE SEQUENCE IF NOT EXISTS trade_note_id_seq;
CREATE SEQUENCE IF NOT EXISTS trade_screenshot_id_seq;
CREATE SEQUENCE IF NOT EXISTS trade_transaction_id_seq;
CREATE SEQUENCE IF NOT EXISTS partial_fill_id_seq;
CREATE SEQUENCE IF NOT EXISTS import_batch_id_seq;
CREATE SEQUENCE IF NOT EXISTS replay_session_id_seq;
CREATE SEQUENCE IF NOT EXISTS chart_note_id_seq;
CREATE SEQUENCE IF NOT EXISTS screening_profile_id_seq;
CREATE SEQUENCE IF NOT EXISTS screening_criterion_id_seq;

-- Depot/Account management
-- Supports multiple brokers, currencies, and individual settings
CREATE TABLE IF NOT EXISTS depot (
    id INTEGER PRIMARY KEY DEFAULT nextval('depot_id_seq'),
    name VARCHAR(100) NOT NULL UNIQUE,
    broker_name VARCHAR(100),
    account_number VARCHAR(50),
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    is_default BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,

    -- P&L Settings
    settings_include_commission_in_pl BOOLEAN DEFAULT TRUE,
    settings_default_withholding_tax_pct DECIMAL(5,2) DEFAULT 0,

    -- Tax reporting (future use)
    settings_tax_reporting_mode VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_depot_name ON depot(name);
CREATE INDEX IF NOT EXISTS idx_depot_default ON depot(is_default);
"""

# =============================================================================
# TRADE POSITIONS (Options & Stocks)
# =============================================================================

TRADE_POSITION_SCHEMA_SQL = """
-- Trade positions for options and stocks
-- Core table for the trading journal
CREATE TABLE IF NOT EXISTS trade_position (
    id INTEGER PRIMARY KEY DEFAULT nextval('trade_position_id_seq'),
    depot_id INTEGER NOT NULL,
    security_id INTEGER NOT NULL,

    -- Position type and status
    position_type VARCHAR(20) NOT NULL,  -- SHORT_PUT, SHORT_CALL, LONG_STOCK
    status VARCHAR(10) DEFAULT 'OPEN',   -- OPEN, CLOSED

    -- Options-specific fields
    strike_price DECIMAL(14,4),
    expiration_date DATE,
    quantity INTEGER NOT NULL,           -- Negative for short positions
    premium_per_contract DECIMAL(10,4),
    delta_at_open DECIMAL(6,4),
    iv_at_open DECIMAL(6,4),
    iv_rank_at_open DECIMAL(6,4),
    underlying_price_at_open DECIMAL(14,4),

    -- Stock-specific fields
    shares INTEGER,
    cost_per_share DECIMAL(14,4),

    -- Dates
    open_date DATE NOT NULL,
    close_date DATE,

    -- Close details
    close_type VARCHAR(20),              -- EXPIRED, BUYBACK, ROLLED, ASSIGNED, CALLED_AWAY
    close_price DECIMAL(10,4),

    -- Commissions
    commission_open DECIMAL(10,4) DEFAULT 0,
    commission_close DECIMAL(10,4),

    -- Relationships
    rolled_from_trade_id INTEGER,
    assigned_to_stock_id INTEGER,
    covered_by_stock_id INTEGER,
    wheel_cycle_id INTEGER,

    -- Broker import reference
    broker_trade_id VARCHAR(100),
    import_batch_id INTEGER,

    -- Calculated fields (stored for performance)
    total_premium DECIMAL(14,4),
    net_premium DECIMAL(14,4),
    realized_pl DECIMAL(14,4),
    break_even DECIMAL(14,4),
    dte_at_open INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (depot_id) REFERENCES depot(id),
    FOREIGN KEY (security_id) REFERENCES security(id),
    FOREIGN KEY (rolled_from_trade_id) REFERENCES trade_position(id),
    FOREIGN KEY (assigned_to_stock_id) REFERENCES trade_position(id),
    FOREIGN KEY (covered_by_stock_id) REFERENCES trade_position(id),
    FOREIGN KEY (wheel_cycle_id) REFERENCES wheel_cycle(id),
    FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE INDEX IF NOT EXISTS idx_trade_depot ON trade_position(depot_id);
CREATE INDEX IF NOT EXISTS idx_trade_security ON trade_position(security_id);
CREATE INDEX IF NOT EXISTS idx_trade_status ON trade_position(status);
CREATE INDEX IF NOT EXISTS idx_trade_type ON trade_position(position_type);
CREATE INDEX IF NOT EXISTS idx_trade_open_date ON trade_position(open_date DESC);
CREATE INDEX IF NOT EXISTS idx_trade_expiration ON trade_position(expiration_date);
CREATE INDEX IF NOT EXISTS idx_trade_wheel_cycle ON trade_position(wheel_cycle_id);
"""

# =============================================================================
# WHEEL CYCLE TRACKING
# =============================================================================

WHEEL_CYCLE_SCHEMA_SQL = """
-- Wheel strategy cycle tracking
-- Groups related trades: Put -> Assignment -> Covered Call -> Called Away
CREATE TABLE IF NOT EXISTS wheel_cycle (
    id INTEGER PRIMARY KEY DEFAULT nextval('wheel_cycle_id_seq'),
    depot_id INTEGER NOT NULL,
    security_id INTEGER NOT NULL,

    -- Cycle identification
    cycle_number INTEGER NOT NULL,
    year INTEGER NOT NULL,

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE, COMPLETED

    -- Aggregated values (calculated)
    total_premium_collected DECIMAL(14,4) DEFAULT 0,
    total_buyback_cost DECIMAL(14,4) DEFAULT 0,
    total_commissions DECIMAL(14,4) DEFAULT 0,
    total_dividends DECIMAL(14,4) DEFAULT 0,
    stock_profit_loss DECIMAL(14,4) DEFAULT 0,
    net_profit_loss DECIMAL(14,4) DEFAULT 0,
    duration_days INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (depot_id) REFERENCES depot(id),
    FOREIGN KEY (security_id) REFERENCES security(id),
    UNIQUE (depot_id, security_id, year, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_cycle_depot ON wheel_cycle(depot_id);
CREATE INDEX IF NOT EXISTS idx_cycle_security ON wheel_cycle(security_id);
CREATE INDEX IF NOT EXISTS idx_cycle_status ON wheel_cycle(status);
CREATE INDEX IF NOT EXISTS idx_cycle_year ON wheel_cycle(year);
"""

# =============================================================================
# DIVIDENDS
# =============================================================================

DIVIDEND_SCHEMA_SQL = """
-- Dividend tracking for stock positions
CREATE TABLE IF NOT EXISTS dividend (
    id INTEGER PRIMARY KEY DEFAULT nextval('dividend_id_seq'),
    depot_id INTEGER NOT NULL,
    stock_position_id INTEGER,
    security_id INTEGER NOT NULL,
    wheel_cycle_id INTEGER,

    -- Dates
    ex_dividend_date DATE NOT NULL,
    payment_date DATE,
    record_date DATE,

    -- Amounts
    shares_held INTEGER NOT NULL,
    dividend_per_share DECIMAL(10,6) NOT NULL,
    gross_amount DECIMAL(14,4) NOT NULL,
    withholding_tax DECIMAL(14,4) DEFAULT 0,
    net_amount DECIMAL(14,4) NOT NULL,

    currency VARCHAR(3) DEFAULT 'USD',

    -- Broker import reference
    broker_transaction_id VARCHAR(100),
    import_batch_id INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (depot_id) REFERENCES depot(id),
    FOREIGN KEY (stock_position_id) REFERENCES trade_position(id),
    FOREIGN KEY (security_id) REFERENCES security(id),
    FOREIGN KEY (wheel_cycle_id) REFERENCES wheel_cycle(id),
    FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE INDEX IF NOT EXISTS idx_dividend_depot ON dividend(depot_id);
CREATE INDEX IF NOT EXISTS idx_dividend_security ON dividend(security_id);
CREATE INDEX IF NOT EXISTS idx_dividend_ex_date ON dividend(ex_dividend_date);
CREATE INDEX IF NOT EXISTS idx_dividend_cycle ON dividend(wheel_cycle_id);
"""

# =============================================================================
# NOTES & SCREENSHOTS
# =============================================================================

NOTES_SCHEMA_SQL = """
-- Trade notes (ideas, setup analysis, management notes, reviews)
CREATE TABLE IF NOT EXISTS trade_note (
    id INTEGER PRIMARY KEY DEFAULT nextval('trade_note_id_seq'),
    trade_id INTEGER,
    security_id INTEGER,

    -- Note details
    note_type VARCHAR(20) NOT NULL,      -- IDEA, SETUP, MANAGEMENT, REVIEW
    note_date DATE NOT NULL,
    note_text TEXT,
    is_linked_to_trade BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (trade_id) REFERENCES trade_position(id),
    FOREIGN KEY (security_id) REFERENCES security(id)
);

CREATE INDEX IF NOT EXISTS idx_note_trade ON trade_note(trade_id);
CREATE INDEX IF NOT EXISTS idx_note_security ON trade_note(security_id);
CREATE INDEX IF NOT EXISTS idx_note_type ON trade_note(note_type);
CREATE INDEX IF NOT EXISTS idx_note_date ON trade_note(note_date DESC);

-- Screenshots attached to notes
CREATE TABLE IF NOT EXISTS trade_screenshot (
    id INTEGER PRIMARY KEY DEFAULT nextval('trade_screenshot_id_seq'),
    note_id INTEGER NOT NULL,

    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    caption VARCHAR(500),
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (note_id) REFERENCES trade_note(id)
);

CREATE INDEX IF NOT EXISTS idx_screenshot_note ON trade_screenshot(note_id);
"""

# =============================================================================
# TRANSACTIONS & PARTIAL FILLS
# =============================================================================

TRANSACTIONS_SCHEMA_SQL = """
-- Individual trade transactions (for audit trail and partial fills)
CREATE TABLE IF NOT EXISTS trade_transaction (
    id INTEGER PRIMARY KEY DEFAULT nextval('trade_transaction_id_seq'),
    trade_id INTEGER NOT NULL,

    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL,  -- OPEN, ROLL_CLOSE, ROLL_OPEN, BUYBACK, ASSIGNMENT, CALLED_AWAY, EXPIRE
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    price DECIMAL(10,4) NOT NULL,
    quantity INTEGER NOT NULL,
    commission DECIMAL(10,4) DEFAULT 0,

    -- Partial fill tracking
    is_partial_fill BOOLEAN DEFAULT FALSE,
    fill_sequence INTEGER,
    broker_order_id VARCHAR(100),
    broker_execution_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (trade_id) REFERENCES trade_position(id)
);

CREATE INDEX IF NOT EXISTS idx_txn_trade ON trade_transaction(trade_id);
CREATE INDEX IF NOT EXISTS idx_txn_type ON trade_transaction(transaction_type);
CREATE INDEX IF NOT EXISTS idx_txn_date ON trade_transaction(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_order ON trade_transaction(broker_order_id);

-- Partial fill details (for aggregation from broker imports)
CREATE TABLE IF NOT EXISTS partial_fill (
    id INTEGER PRIMARY KEY DEFAULT nextval('partial_fill_id_seq'),
    trade_id INTEGER NOT NULL,
    transaction_id INTEGER,

    fill_datetime TIMESTAMP NOT NULL,
    fill_quantity INTEGER NOT NULL,
    fill_price DECIMAL(10,4) NOT NULL,
    fill_commission DECIMAL(10,4) DEFAULT 0,

    broker_execution_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (trade_id) REFERENCES trade_position(id),
    FOREIGN KEY (transaction_id) REFERENCES trade_transaction(id)
);

CREATE INDEX IF NOT EXISTS idx_fill_trade ON partial_fill(trade_id);
CREATE INDEX IF NOT EXISTS idx_fill_txn ON partial_fill(transaction_id);
"""

# =============================================================================
# BROKER IMPORT
# =============================================================================

IMPORT_SCHEMA_SQL = """
-- Import batch tracking for broker data imports
CREATE TABLE IF NOT EXISTS import_batch (
    id INTEGER PRIMARY KEY DEFAULT nextval('import_batch_id_seq'),
    depot_id INTEGER NOT NULL,

    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) NOT NULL,         -- INTERACTIVE_BROKERS, MANUAL, OTHER
    file_name VARCHAR(500),

    -- Statistics
    records_total INTEGER DEFAULT 0,
    records_imported INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_duplicate INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, PARTIAL, FAILED
    error_log TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (depot_id) REFERENCES depot(id)
);

CREATE INDEX IF NOT EXISTS idx_import_depot ON import_batch(depot_id);
CREATE INDEX IF NOT EXISTS idx_import_date ON import_batch(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_import_status ON import_batch(status);
"""

# =============================================================================
# CHART REPLAY
# =============================================================================

REPLAY_SCHEMA_SQL = """
-- Chart replay session state
CREATE TABLE IF NOT EXISTS replay_session (
    id INTEGER PRIMARY KEY DEFAULT nextval('replay_session_id_seq'),
    security_id INTEGER NOT NULL,

    current_date DATE NOT NULL,
    timeframe VARCHAR(1) DEFAULT 'D',    -- D (daily), W (weekly)
    viewport_size INTEGER DEFAULT 100,

    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (security_id) REFERENCES security(id),
    UNIQUE (security_id)
);

CREATE INDEX IF NOT EXISTS idx_replay_security ON replay_session(security_id);

-- Chart annotations/notes at specific dates
CREATE TABLE IF NOT EXISTS chart_note (
    id INTEGER PRIMARY KEY DEFAULT nextval('chart_note_id_seq'),
    security_id INTEGER NOT NULL,

    note_date DATE NOT NULL,
    note_text TEXT,
    screenshot_path VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (security_id) REFERENCES security(id)
);

CREATE INDEX IF NOT EXISTS idx_chart_note_security ON chart_note(security_id);
CREATE INDEX IF NOT EXISTS idx_chart_note_date ON chart_note(note_date);
"""

# =============================================================================
# TECHNICAL SCREENING
# =============================================================================

SCREENING_SCHEMA_SQL = """
-- Screening profiles (saved filter combinations)
CREATE TABLE IF NOT EXISTS screening_profile (
    id INTEGER PRIMARY KEY DEFAULT nextval('screening_profile_id_seq'),

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    timeframe VARCHAR(1) DEFAULT 'D',    -- D (daily), W (weekly)
    is_system_template BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profile_name ON screening_profile(name);

-- Individual screening criteria within a profile
CREATE TABLE IF NOT EXISTS screening_criterion (
    id INTEGER PRIMARY KEY DEFAULT nextval('screening_criterion_id_seq'),
    profile_id INTEGER NOT NULL,

    -- Indicator type
    indicator_type VARCHAR(20) NOT NULL, -- RSI, BB, SMA, EMA, MACD, VOLUME, PRICE
    is_active BOOLEAN DEFAULT TRUE,

    -- Indicator parameters
    param_period INTEGER,                -- RSI, BB, SMA, EMA periods
    param_period_2 INTEGER,              -- MACD slow, or SMA comparison
    param_period_3 INTEGER,              -- MACD signal
    param_std_dev DECIMAL(4,2),          -- BB standard deviation

    -- Criterion definition
    operator VARCHAR(20) NOT NULL,       -- LT, GT, BETWEEN, EQ, POSITION
    value_1 DECIMAL(14,4),
    value_2 DECIMAL(14,4),               -- For BETWEEN
    position_value VARCHAR(20),          -- LOWER_THIRD, MIDDLE_THIRD, UPPER_THIRD, BELOW_LOWER, ABOVE_UPPER

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (profile_id) REFERENCES screening_profile(id)
);

CREATE INDEX IF NOT EXISTS idx_criterion_profile ON screening_criterion(profile_id);
CREATE INDEX IF NOT EXISTS idx_criterion_indicator ON screening_criterion(indicator_type);
"""

# =============================================================================
# USER SETTINGS (i18n)
# =============================================================================

USER_SETTINGS_SCHEMA_SQL = """
-- User settings for internationalization and preferences
CREATE TABLE IF NOT EXISTS user_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(200),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default settings (use INSERT ... ON CONFLICT for DuckDB)
INSERT INTO user_settings (setting_key, setting_value) VALUES ('language', 'en') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO user_settings (setting_key, setting_value) VALUES ('date_format', 'YYYY-MM-DD') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO user_settings (setting_key, setting_value) VALUES ('number_format', 'en-US') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO user_settings (setting_key, setting_value) VALUES ('theme', 'system') ON CONFLICT (setting_key) DO NOTHING;
"""

# =============================================================================
# SCHEMA VERSION TRACKING
# =============================================================================

JOURNAL_VERSION_SQL = """
-- Journal schema version tracking (separate from data-sourcing)
CREATE TABLE IF NOT EXISTS journal_schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(200)
);
"""

# =============================================================================
# INITIALIZATION FUNCTIONS
# =============================================================================

def create_journal_schema() -> None:
    """Create all trading journal tables."""
    logger.info("Creating trading journal schema...")

    # Order matters due to foreign key dependencies
    schema_parts = [
        ("Journal version tracking", JOURNAL_VERSION_SQL),
        ("Depot management", DEPOT_SCHEMA_SQL),
        ("Import batch", IMPORT_SCHEMA_SQL),
        ("Wheel cycle", WHEEL_CYCLE_SCHEMA_SQL),
        ("Trade positions", TRADE_POSITION_SCHEMA_SQL),
        ("Dividends", DIVIDEND_SCHEMA_SQL),
        ("Notes & screenshots", NOTES_SCHEMA_SQL),
        ("Transactions", TRANSACTIONS_SCHEMA_SQL),
        ("Chart replay", REPLAY_SCHEMA_SQL),
        ("Screening", SCREENING_SCHEMA_SQL),
        ("User settings", USER_SETTINGS_SCHEMA_SQL),
    ]

    for name, sql in schema_parts:
        logger.info(f"Creating {name}...")
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        for statement in statements:
            try:
                execute(statement)
            except Exception as e:
                # Ignore "column already exists" errors for ALTER TABLE
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    logger.debug(f"Skipping (already exists): {statement[:50]}...")
                else:
                    logger.error(f"Failed to execute: {statement[:50]}... Error: {e}")
                    raise

    # Record schema version
    execute(
        """
        INSERT INTO journal_schema_version (version, description)
        SELECT ?, ? WHERE NOT EXISTS (
            SELECT 1 FROM journal_schema_version WHERE version = ?
        )
        """,
        (JOURNAL_SCHEMA_VERSION, "Initial journal schema", JOURNAL_SCHEMA_VERSION),
    )

    logger.info("Trading journal schema created successfully")


def extend_security_table() -> None:
    """Add sector and industry columns to existing security table."""
    logger.info("Extending security table with sector/industry...")

    # DuckDB uses ADD COLUMN IF NOT EXISTS
    try:
        execute("ALTER TABLE security ADD COLUMN sector VARCHAR(100)")
        logger.info("Added 'sector' column to security table")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            logger.debug("Column 'sector' already exists")
        else:
            raise

    try:
        execute("ALTER TABLE security ADD COLUMN industry VARCHAR(100)")
        logger.info("Added 'industry' column to security table")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            logger.debug("Column 'industry' already exists")
        else:
            raise


def initialize_journal_database() -> bool:
    """Initialize the journal database tables.

    Returns:
        True if initialization was performed, False if already initialized
    """
    if table_exists("journal_schema_version"):
        logger.info("Journal database already initialized")
        return False

    # First extend the security table
    extend_security_table()

    # Then create all journal tables
    create_journal_schema()

    return True


def get_journal_schema_version() -> int | None:
    """Get the current journal schema version.

    Returns:
        Schema version number or None if not initialized
    """
    if not table_exists("journal_schema_version"):
        return None

    from .connection import query
    result = query("SELECT MAX(version) FROM journal_schema_version")
    return result[0][0] if result else None


def create_default_depot() -> int:
    """Create a default depot if none exists.

    Returns:
        ID of the default depot
    """
    from .connection import query

    # Check if any depot exists
    result = query("SELECT id FROM depot WHERE is_default = TRUE LIMIT 1")
    if result:
        return result[0][0]

    # Check if any depot exists at all
    result = query("SELECT id FROM depot LIMIT 1")
    if result:
        # Make first depot the default
        depot_id = result[0][0]
        execute("UPDATE depot SET is_default = TRUE WHERE id = ?", (depot_id,))
        return depot_id

    # Create a default depot
    execute(
        """
        INSERT INTO depot (name, currency, is_default)
        VALUES ('Default', 'USD', TRUE)
        """
    )
    result = query("SELECT id FROM depot WHERE is_default = TRUE")
    return result[0][0]


def create_system_screening_templates() -> None:
    """Create predefined system screening templates."""
    logger.info("Creating system screening templates...")

    # Oversold Setup template
    execute(
        """
        INSERT OR IGNORE INTO screening_profile (name, description, timeframe, is_system_template)
        VALUES ('Oversold Setup', 'RSI < 30 AND price in lower BB third', 'D', TRUE)
        """
    )

    from .connection import query
    result = query("SELECT id FROM screening_profile WHERE name = 'Oversold Setup'")
    if result:
        profile_id = result[0][0]
        # RSI < 30
        execute(
            """
            INSERT OR IGNORE INTO screening_criterion
            (profile_id, indicator_type, param_period, operator, value_1, sort_order)
            VALUES (?, 'RSI', 14, 'LT', 30, 1)
            """,
            (profile_id,)
        )
        # BB lower third
        execute(
            """
            INSERT OR IGNORE INTO screening_criterion
            (profile_id, indicator_type, param_period, param_std_dev, operator, position_value, sort_order)
            VALUES (?, 'BB', 20, 2.0, 'POSITION', 'LOWER_THIRD', 2)
            """,
            (profile_id,)
        )

    # Bullish Momentum template
    execute(
        """
        INSERT OR IGNORE INTO screening_profile (name, description, timeframe, is_system_template)
        VALUES ('Bullish Momentum', 'RSI > 50 AND MACD > Signal AND price > SMA(50)', 'D', TRUE)
        """
    )

    result = query("SELECT id FROM screening_profile WHERE name = 'Bullish Momentum'")
    if result:
        profile_id = result[0][0]
        # RSI > 50
        execute(
            """
            INSERT OR IGNORE INTO screening_criterion
            (profile_id, indicator_type, param_period, operator, value_1, sort_order)
            VALUES (?, 'RSI', 14, 'GT', 50, 1)
            """,
            (profile_id,)
        )
        # MACD > Signal (represented as MACD with GT operator)
        execute(
            """
            INSERT OR IGNORE INTO screening_criterion
            (profile_id, indicator_type, param_period, param_period_2, param_period_3, operator, value_1, sort_order)
            VALUES (?, 'MACD', 12, 26, 9, 'GT', 0, 2)
            """,
            (profile_id,)
        )
        # Price > SMA(50)
        execute(
            """
            INSERT OR IGNORE INTO screening_criterion
            (profile_id, indicator_type, param_period, operator, position_value, sort_order)
            VALUES (?, 'SMA', 50, 'POSITION', 'ABOVE_UPPER', 3)
            """,
            (profile_id,)
        )

    logger.info("System screening templates created")
