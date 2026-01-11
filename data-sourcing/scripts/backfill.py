#!/usr/bin/env python3
"""
Backfill script for fetching historical price data.

Usage:
    python scripts/backfill.py TICKER [TICKER ...]
    python scripts/backfill.py --file tickers.txt
    python scripts/backfill.py --list watchlist_name
    
Examples:
    python scripts/backfill.py AAPL MSFT GOOGL
    python scripts/backfill.py --file my_tickers.txt --start 2020-01-01
    python scripts/backfill.py --list portfolio --start 2010-01-01 --end 2024-01-01
"""

import sys
import argparse
import logging
from pathlib import Path
from datetime import date

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from src.database import initialize_database, get_watchlist_tickers
from src.data_sources import create_tiingo_client
from src.services import create_sync_service

console = Console()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_tickers_from_file(filepath: str) -> list[str]:
    """Load ticker symbols from a file (one per line)."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Ticker file not found: {filepath}")
    
    tickers = []
    with open(path) as f:
        for line in f:
            ticker = line.strip().upper()
            if ticker and not ticker.startswith("#"):
                tickers.append(ticker)
    
    return tickers


def main():
    """Main backfill function."""
    parser = argparse.ArgumentParser(
        description="Backfill historical price data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/backfill.py AAPL MSFT GOOGL
    python scripts/backfill.py --file my_tickers.txt --start 2020-01-01
    python scripts/backfill.py --list portfolio
        """,
    )
    
    # Ticker sources (mutually exclusive)
    source_group = parser.add_mutually_exclusive_group()
    source_group.add_argument(
        "tickers",
        nargs="*",
        default=[],
        help="Ticker symbols to backfill",
    )
    source_group.add_argument(
        "--file", "-f",
        help="File containing ticker symbols (one per line)",
    )
    source_group.add_argument(
        "--list", "-l",
        help="Watchlist name to backfill",
    )
    
    # Date range
    parser.add_argument(
        "--start", "-s",
        help="Start date (YYYY-MM-DD, default: 30 years ago)",
    )
    parser.add_argument(
        "--end", "-e",
        help="End date (YYYY-MM-DD, default: today)",
    )
    
    args = parser.parse_args()
    
    # Initialize database
    initialize_database()
    
    # Collect tickers
    tickers = []
    
    if args.file:
        tickers = load_tickers_from_file(args.file)
        console.print(f"Loaded {len(tickers)} tickers from {args.file}")
    elif args.list:
        tickers = get_watchlist_tickers(args.list)
        if not tickers:
            console.print(f"[yellow]No tickers in watchlist '{args.list}'[/yellow]")
            sys.exit(0)
        console.print(f"Found {len(tickers)} tickers in '{args.list}' watchlist")
    elif args.tickers:
        tickers = [t.upper() for t in args.tickers]
    else:
        parser.print_help()
        console.print("\n[red]Please provide tickers to backfill[/red]")
        sys.exit(1)
    
    console.print(f"\n[bold]Backfilling {len(tickers)} tickers[/bold]")
    if args.start:
        console.print(f"Start date: {args.start}")
    if args.end:
        console.print(f"End date: {args.end}")
    console.print()
    
    # Run backfill
    client = create_tiingo_client()
    sync = create_sync_service(client)
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Backfilling...", total=len(tickers))
        
        def on_progress(ticker: str, current: int, total: int):
            progress.update(task, description=f"Processing {ticker}...", completed=current)
        
        result = sync.backfill(
            tickers=tickers,
            start_date=args.start,
            end_date=args.end,
            progress_callback=on_progress,
        )
    
    # Summary
    console.print(f"\n[green bold]Backfill Complete[/green bold]")
    console.print(f"  Symbols processed: {result['symbols_processed']}")
    console.print(f"  Records inserted:  {result['records_inserted']:,}")
    console.print(f"  Errors:            {result['errors']}")
    console.print(f"  Duration:          {result['duration_seconds']:.1f}s")
    
    if result['errors'] > 0:
        console.print("\n[yellow]Some tickers had errors. Check the logs for details.[/yellow]")
        sys.exit(1)


if __name__ == "__main__":
    main()
