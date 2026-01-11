# Trading Data Sourcing

Python module for fetching and managing historical stock price data from Tiingo.

## Features

- Fetch 30+ years of historical OHLC data
- DuckDB storage for fast analytical queries
- CLI for easy data management
- Watchlist support
- Incremental updates

## Installation

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install package
pip install -e .

# For development
pip install -e ".[dev]"

# For export features (Excel, Parquet)
pip install -e ".[export]"
```

## Configuration

Copy `.env.example` to `.env` and add your Tiingo API key:

```bash
cp .env.example .env
```

Get a free API key at [tiingo.com](https://www.tiingo.com).

## Quick Start

```bash
# Initialize database and add sample data
python scripts/setup_database.py

# Or manually:
trading-cli db init
trading-cli watchlist add AAPL MSFT GOOGL AMZN NVDA
trading-cli fetch backfill AAPL MSFT GOOGL AMZN NVDA
```

## CLI Reference

### Database Commands

```bash
# Initialize database
trading-cli db init

# Show status
trading-cli db status
```

### Watchlist Commands

```bash
# Add tickers
trading-cli watchlist add AAPL MSFT --list mylist

# Show watchlist
trading-cli watchlist show --list default
```

### Fetch Commands

```bash
# Backfill historical data
trading-cli fetch backfill AAPL MSFT
trading-cli fetch backfill AAPL --start 2020-01-01 --end 2024-01-01

# Update existing tickers
trading-cli fetch update --list default
```

### Query Commands

```bash
# Query prices
trading-cli query prices AAPL --limit 20
trading-cli query prices AAPL --start 2024-01-01 --end 2024-06-30
```

## API Reference

### TiingoClient

```python
from src.data_sources import create_tiingo_client

client = create_tiingo_client()

# Get price history
df = client.get_daily_prices("AAPL", start_date="2020-01-01")

# Validate ticker
is_valid = client.validate_ticker("AAPL")
```

### SyncService

```python
from src.services import create_sync_service

sync = create_sync_service()

# Backfill data
result = sync.backfill(["AAPL", "MSFT"], start_date="2020-01-01")

# Update existing
result = sync.update(watchlist="default")
```

### Database Operations

```python
from src.database import (
    initialize_database,
    upsert_security,
    get_price_history,
    add_to_watchlist,
)

# Initialize
initialize_database()

# Add security
security_id = upsert_security("AAPL", name="Apple Inc.")

# Query prices
df = get_price_history("AAPL", start_date=date(2024, 1, 1))
```

## Database Schema

### Tables

- **security**: Ticker master data
- **daily_price**: OHLC price history
- **watchlist**: User watchlists
- **sync_log**: Sync operation history
- **api_usage**: API rate tracking

### Price Data Fields

| Field | Description |
|-------|-------------|
| open, high, low, close | Raw prices |
| adj_open, adj_high, adj_low, adj_close | Split/dividend adjusted |
| volume, adj_volume | Trading volume |
| div_cash | Cash dividend amount |
| split_factor | Stock split factor |

## Scheduled Updates

Set up a cron job for daily updates:

```bash
# Edit crontab
crontab -e

# Add line (runs at 6pm ET on weekdays)
0 18 * * 1-5 cd /path/to/data-sourcing && .venv/bin/python scripts/daily_sync.py
```

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=src
```

## Rate Limits

Tiingo Free Tier:
- 1,000 API requests/day
- 500 unique symbols/month

The module automatically handles rate limiting and retries.
