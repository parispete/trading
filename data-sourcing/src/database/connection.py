"""DuckDB database connection and management."""

import logging
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

import duckdb

from ..config import get_settings

logger = logging.getLogger(__name__)

# Module-level connection
_connection: duckdb.DuckDBPyConnection | None = None


def get_database_path() -> Path:
    """Get the database file path from settings."""
    return get_settings().database_path


def get_connection() -> duckdb.DuckDBPyConnection:
    """Get or create a database connection.

    Returns:
        DuckDB connection instance
    """
    global _connection

    if _connection is None:
        db_path = get_database_path()

        # Ensure parent directory exists
        db_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Connecting to database: {db_path}")
        _connection = duckdb.connect(str(db_path))

    return _connection


def close_connection() -> None:
    """Close the database connection."""
    global _connection

    if _connection is not None:
        _connection.close()
        _connection = None
        logger.info("Database connection closed")


@contextmanager
def get_cursor() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Context manager for database operations.

    Yields:
        Database connection for executing queries
    """
    conn = get_connection()
    try:
        yield conn
    finally:
        # DuckDB handles transactions automatically
        pass


def execute(sql: str, params: tuple | None = None) -> None:
    """Execute a SQL statement.

    Args:
        sql: SQL statement
        params: Optional query parameters
    """
    conn = get_connection()
    if params:
        conn.execute(sql, params)
    else:
        conn.execute(sql)


def query(sql: str, params: tuple | None = None) -> list[tuple]:
    """Execute a query and return results.

    Args:
        sql: SQL query
        params: Optional query parameters

    Returns:
        List of result tuples
    """
    conn = get_connection()
    if params:
        return conn.execute(sql, params).fetchall()
    return conn.execute(sql).fetchall()


def query_df(sql: str, params: tuple | None = None):
    """Execute a query and return results as DataFrame.

    Args:
        sql: SQL query
        params: Optional query parameters

    Returns:
        pandas DataFrame with results
    """
    conn = get_connection()
    if params:
        return conn.execute(sql, params).df()
    return conn.execute(sql).df()


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database.

    Args:
        table_name: Name of the table to check

    Returns:
        True if table exists
    """
    result = query(
        """
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = ?
        """,
        (table_name,),
    )
    return result[0][0] > 0


def is_initialized() -> bool:
    """Check if the database has been initialized with required tables.

    Returns:
        True if all required tables exist
    """
    required_tables = ["security", "daily_price", "watchlist", "sync_log"]
    return all(table_exists(table) for table in required_tables)
