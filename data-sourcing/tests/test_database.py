"""Tests for database operations."""

import pytest
from datetime import date
import tempfile
import os

# Set test database path before importing modules
os.environ["DATABASE_PATH"] = ":memory:"

from src.database import (
    initialize_database,
    is_initialized,
    upsert_security,
    get_security,
    add_to_watchlist,
    get_watchlist_tickers,
)
from src.config import reset_settings


@pytest.fixture(autouse=True)
def setup_test_db():
    """Setup a fresh test database for each test."""
    reset_settings()
    os.environ["DATABASE_PATH"] = tempfile.mktemp(suffix=".duckdb")
    os.environ["TIINGO_API_KEY"] = "test_key"
    yield
    # Cleanup would go here


class TestDatabaseInitialization:
    """Tests for database initialization."""
    
    def test_initialize_creates_tables(self):
        """Test that initialize_database creates required tables."""
        assert not is_initialized()
        initialize_database()
        assert is_initialized()
    
    def test_double_initialization_is_safe(self):
        """Test that calling initialize twice doesn't error."""
        initialize_database()
        initialize_database()  # Should not raise
        assert is_initialized()


class TestSecurityOperations:
    """Tests for security CRUD operations."""
    
    def test_upsert_security_creates_new(self):
        """Test creating a new security."""
        initialize_database()
        
        security_id = upsert_security(
            ticker="AAPL",
            name="Apple Inc.",
            exchange="NASDAQ",
        )
        
        assert security_id > 0
        
        security = get_security("AAPL")
        assert security is not None
        assert security["ticker"] == "AAPL"
        assert security["name"] == "Apple Inc."
    
    def test_upsert_security_updates_existing(self):
        """Test updating an existing security."""
        initialize_database()
        
        id1 = upsert_security(ticker="MSFT", name="Microsoft")
        id2 = upsert_security(ticker="MSFT", name="Microsoft Corporation")
        
        assert id1 == id2  # Same ID
        
        security = get_security("MSFT")
        assert security["name"] == "Microsoft Corporation"
    
    def test_get_security_case_insensitive(self):
        """Test that ticker lookup is case insensitive."""
        initialize_database()
        upsert_security(ticker="GOOGL")
        
        assert get_security("googl") is not None
        assert get_security("GOOGL") is not None
        assert get_security("Googl") is not None


class TestWatchlistOperations:
    """Tests for watchlist operations."""
    
    def test_add_to_watchlist(self):
        """Test adding a security to a watchlist."""
        initialize_database()
        upsert_security(ticker="NVDA", name="NVIDIA")
        
        result = add_to_watchlist("NVDA", "test_list")
        assert result is True
        
        tickers = get_watchlist_tickers("test_list")
        assert "NVDA" in tickers
    
    def test_add_duplicate_to_watchlist(self):
        """Test that adding duplicate returns False."""
        initialize_database()
        upsert_security(ticker="AMD")
        
        assert add_to_watchlist("AMD", "default") is True
        assert add_to_watchlist("AMD", "default") is False
    
    def test_watchlist_ordering(self):
        """Test that watchlist respects priority ordering."""
        initialize_database()
        upsert_security(ticker="A")
        upsert_security(ticker="B")
        upsert_security(ticker="C")
        
        add_to_watchlist("C", "ordered", priority=3)
        add_to_watchlist("A", "ordered", priority=1)
        add_to_watchlist("B", "ordered", priority=2)
        
        tickers = get_watchlist_tickers("ordered")
        assert tickers == ["A", "B", "C"]
