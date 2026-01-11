"""Database module.

This module provides:
- Data sourcing: OHLCV price data management
- Trading journal: Trade positions, depots, dividends, wheel cycles
- Screening: Technical indicator-based stock filtering
- User settings: Internationalization and preferences
"""

from .connection import (
    get_connection,
    close_connection,
    execute,
    query,
    query_df,
    is_initialized,
)
from .schema import initialize_database, create_schema, get_schema_version
from .journal_schema import (
    initialize_journal_database,
    create_journal_schema,
    get_journal_schema_version,
    extend_security_table,
    create_default_depot,
    create_system_screening_templates,
)
from .repository import (
    upsert_security,
    get_security_id,
    get_security,
    get_all_securities,
    insert_prices,
    get_last_price_date,
    get_price_history,
    add_to_watchlist,
    get_watchlist,
    get_watchlist_tickers,
    start_sync_log,
    complete_sync_log,
    get_database_stats,
)
from .journal_repository import (
    # Depot operations
    create_depot,
    get_depot,
    get_depot_by_name,
    get_default_depot,
    get_all_depots,
    update_depot,
    archive_depot,
    delete_depot,
    get_depot_summary,
    # Trade position operations
    create_trade_position,
    get_trade_position,
    get_open_positions,
    get_positions_by_security,
    close_position,
    roll_position,
    assign_position,
    get_trade_history,
    # Wheel cycle operations
    create_wheel_cycle,
    get_wheel_cycle,
    get_active_wheel_cycles,
    update_wheel_cycle_totals,
    complete_wheel_cycle,
    # Dividend operations
    create_dividend,
    get_dividends,
    get_dividend_summary,
    # Trade note operations
    create_trade_note,
    get_trade_note,
    get_notes_for_trade,
    get_notes_for_security,
    get_trade_ideas,
    update_trade_note,
    delete_trade_note,
    add_screenshot,
    get_note_screenshots,
    delete_screenshot,
    # Screening operations
    create_screening_profile,
    get_screening_profile,
    get_screening_profile_by_name,
    get_all_screening_profiles,
    update_screening_profile,
    delete_screening_profile,
    add_screening_criterion,
    get_profile_criteria,
    update_screening_criterion,
    delete_screening_criterion,
    # User settings operations
    get_user_setting,
    set_user_setting,
    get_all_user_settings,
    get_language,
    set_language,
    get_date_format,
    set_date_format,
    get_number_format,
    set_number_format,
    get_theme,
    set_theme,
    # Chart replay operations
    get_or_create_replay_session,
    update_replay_session,
    create_chart_note,
    get_chart_notes,
    delete_chart_note,
    # Dashboard operations
    get_dashboard_summary,
)

__all__ = [
    # Connection
    "get_connection",
    "close_connection",
    "execute",
    "query",
    "query_df",
    "is_initialized",
    # Data sourcing schema
    "initialize_database",
    "create_schema",
    "get_schema_version",
    # Journal schema
    "initialize_journal_database",
    "create_journal_schema",
    "get_journal_schema_version",
    "extend_security_table",
    "create_default_depot",
    "create_system_screening_templates",
    # Repository - Securities
    "upsert_security",
    "get_security_id",
    "get_security",
    "get_all_securities",
    # Repository - Prices
    "insert_prices",
    "get_last_price_date",
    "get_price_history",
    # Repository - Watchlist
    "add_to_watchlist",
    "get_watchlist",
    "get_watchlist_tickers",
    # Repository - Sync
    "start_sync_log",
    "complete_sync_log",
    "get_database_stats",
    # Journal - Depots
    "create_depot",
    "get_depot",
    "get_depot_by_name",
    "get_default_depot",
    "get_all_depots",
    "update_depot",
    "archive_depot",
    "delete_depot",
    "get_depot_summary",
    # Journal - Trade Positions
    "create_trade_position",
    "get_trade_position",
    "get_open_positions",
    "get_positions_by_security",
    "close_position",
    "roll_position",
    "assign_position",
    "get_trade_history",
    # Journal - Wheel Cycles
    "create_wheel_cycle",
    "get_wheel_cycle",
    "get_active_wheel_cycles",
    "update_wheel_cycle_totals",
    "complete_wheel_cycle",
    # Journal - Dividends
    "create_dividend",
    "get_dividends",
    "get_dividend_summary",
    # Journal - Notes
    "create_trade_note",
    "get_trade_note",
    "get_notes_for_trade",
    "get_notes_for_security",
    "get_trade_ideas",
    "update_trade_note",
    "delete_trade_note",
    "add_screenshot",
    "get_note_screenshots",
    "delete_screenshot",
    # Journal - Screening
    "create_screening_profile",
    "get_screening_profile",
    "get_screening_profile_by_name",
    "get_all_screening_profiles",
    "update_screening_profile",
    "delete_screening_profile",
    "add_screening_criterion",
    "get_profile_criteria",
    "update_screening_criterion",
    "delete_screening_criterion",
    # Journal - User Settings
    "get_user_setting",
    "set_user_setting",
    "get_all_user_settings",
    "get_language",
    "set_language",
    "get_date_format",
    "set_date_format",
    "get_number_format",
    "set_number_format",
    "get_theme",
    "set_theme",
    # Journal - Chart Replay
    "get_or_create_replay_session",
    "update_replay_session",
    "create_chart_note",
    "get_chart_notes",
    "delete_chart_note",
    # Journal - Dashboard
    "get_dashboard_summary",
]
