# Trading Platform

Personal trading support system with historical US stock data analysis. Built with Next.js 16, React 19, DuckDB, and real market data from Tiingo.

## Features

- **30+ Years of Historical Data**: Access OHLC price data going back to 1990s
- **Local Database**: DuckDB-powered storage for fast analytical queries
- **Interactive Charts**: Visualize price history with Recharts
- **Watchlists**: Track your favorite stocks
- **Free Data Source**: Uses Tiingo's free API tier (1,000 calls/day)
- **TypeScript + Python**: Best of both worlds for web UI and data processing

## Tech Stack

### Frontend (Next.js)
- Next.js 16 with App Router and Turbopack
- React 19
- TypeScript
- Tailwind CSS v4
- TanStack Query for data fetching
- Recharts for visualization
- Radix UI for accessible components

### Backend (Python Data Sourcing)
- Python 3.11+
- DuckDB for storage
- Tiingo API for market data
- Typer CLI framework

## Quick Start

### Prerequisites

- Node.js 20.9+ (required for Next.js 16)
- Python 3.11+
- Yarn (or npm)
- Free Tiingo API key ([get one here](https://www.tiingo.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/parispete/trading.git
   cd trading
   ```

2. **Install Node.js dependencies**
   ```bash
   yarn install
   ```

3. **Set up Python environment**
   ```bash
   cd data-sourcing
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -e .
   ```

4. **Configure environment**
   ```bash
   # In project root
   cp .env.example .env.local
   
   # In data-sourcing directory
   cp .env.example .env
   ```
   
   Add your Tiingo API key to both `.env` files.

5. **Initialize the database**
   ```bash
   cd data-sourcing
   python scripts/setup_database.py
   ```

6. **Start the development server**
   ```bash
   # From project root
   yarn dev
   ```

7. **Open the dashboard**
   
   Navigate to [http://localhost:3000/trading](http://localhost:3000/trading)

## Project Structure

```
trading/
├── app/                    # Next.js App Router pages
│   ├── trading/           # Trading dashboard
│   └── api/               # API routes
├── components/            # Shared React components
│   └── ui/               # UI primitives (Button, Card, etc.)
├── lib/                   # Shared utilities
├── modules/
│   └── trading/          # Trading module
│       ├── actions/      # Server actions
│       ├── components/   # Trading components
│       ├── hooks/        # React Query hooks
│       ├── lib/          # DuckDB connection
│       └── types/        # TypeScript types
├── data-sourcing/         # Python data sourcing
│   ├── src/
│   │   ├── cli/          # CLI commands
│   │   ├── config/       # Settings
│   │   ├── data_sources/ # API clients
│   │   ├── database/     # DuckDB operations
│   │   └── services/     # Sync service
│   ├── scripts/          # Utility scripts
│   └── tests/            # Python tests
└── public/               # Static assets
```

## CLI Commands

The Python module provides a CLI for data operations:

```bash
# Initialize database
trading-cli db init

# Show database status
trading-cli db status

# Add tickers to watchlist
trading-cli watchlist add AAPL MSFT GOOGL

# Show watchlist
trading-cli watchlist show

# Backfill historical data
trading-cli fetch backfill AAPL --start 2020-01-01

# Update prices (incremental)
trading-cli fetch update

# Query prices
trading-cli query prices AAPL --limit 20
```

## Data Sources

### Tiingo (Primary)

- **Free Tier**: 1,000 API calls/day, 500 unique symbols/month
- **Data**: 30+ years of OHLC data with adjusted prices
- **Signup**: [tiingo.com](https://www.tiingo.com)

## Database Schema

The DuckDB database contains the following tables:

- **security**: Master data for tracked securities
- **daily_price**: Historical OHLC price data
- **watchlist**: User-defined stock lists
- **sync_log**: Data sync operation history
- **api_usage**: API rate limit tracking

## Development

### Run in Development Mode

```bash
# Frontend (from project root)
yarn dev

# Run Python tests
cd data-sourcing
pytest
```

### Type Checking

```bash
yarn typecheck
```

### Linting

```bash
yarn lint
```

## Scheduled Sync

For automatic daily updates, set up a cron job:

```bash
# Run at 6pm ET on weekdays (after market close)
0 18 * * 1-5 cd /path/to/trading && ./data-sourcing/.venv/bin/python ./data-sourcing/scripts/daily_sync.py
```

## License

MIT

## Acknowledgments

- [Tiingo](https://www.tiingo.com) for providing free market data
- [DuckDB](https://duckdb.org) for the amazing embedded analytics database
- [Next.js](https://nextjs.org) for the React framework
- [shadcn/ui](https://ui.shadcn.com) for UI component inspiration
