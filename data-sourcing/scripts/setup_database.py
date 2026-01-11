#!/usr/bin/env python3
"""
Setup script for initializing the trading database.

Usage:
    python scripts/setup_database.py

This script will:
1. Create the database file and data sourcing schema
2. Create the trading journal schema (depots, trades, etc.)
3. Optionally add sample tickers to a watchlist
4. Optionally backfill historical data for sample tickers
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rich.console import Console
from rich.prompt import Confirm

from src.config import get_settings
from src.database import (
    initialize_database,
    is_initialized,
    add_to_watchlist,
    initialize_journal_database,
    get_journal_schema_version,
    create_default_depot,
    create_system_screening_templates,
)
from src.data_sources import create_tiingo_client
from src.services import create_sync_service

console = Console()

# Sample tickers for initial setup
SAMPLE_TICKERS = [
    "AAPL",   # Apple
    "MSFT",   # Microsoft
    "GOOGL",  # Alphabet
    "AMZN",   # Amazon
    "NVDA",   # NVIDIA
    "META",   # Meta Platforms
    "TSLA",   # Tesla
    "JPM",    # JPMorgan Chase
    "V",      # Visa
    "WMT",    # Walmart
]


def main():
    """Main setup function."""
    console.print("\n[bold blue]Trading Platform - Database Setup[/bold blue]\n")

    # Check settings
    try:
        settings = get_settings()
        console.print(f"[green]✓[/green] Tiingo API key configured")
        console.print(f"[green]✓[/green] Database path: {settings.database_path}")
    except ValueError as e:
        console.print(f"[red]✗ Configuration error: {e}[/red]")
        console.print("\n[yellow]Please create a .env file with your TIINGO_API_KEY[/yellow]")
        console.print("Copy .env.example to .env and add your key from https://www.tiingo.com")
        sys.exit(1)

    # Step 1: Initialize data sourcing schema
    console.print("\n[bold]Step 1: Initialize Data Sourcing Schema[/bold]")

    if is_initialized():
        console.print("[yellow]Data sourcing schema already initialized[/yellow]")
    else:
        with console.status("Creating data sourcing schema..."):
            initialize_database()
        console.print("[green]✓ Data sourcing schema created[/green]")

    # Step 2: Initialize trading journal schema
    console.print("\n[bold]Step 2: Initialize Trading Journal Schema[/bold]")

    journal_version = get_journal_schema_version()
    if journal_version is not None:
        console.print(f"[yellow]Trading journal schema already initialized (v{journal_version})[/yellow]")
    else:
        with console.status("Creating trading journal schema..."):
            initialize_journal_database()
        console.print("[green]✓ Trading journal schema created[/green]")

        # Create default depot
        with console.status("Creating default depot..."):
            depot_id = create_default_depot()
        console.print(f"[green]✓ Default depot created (ID: {depot_id})[/green]")

        # Create system screening templates
        with console.status("Creating screening templates..."):
            create_system_screening_templates()
        console.print("[green]✓ System screening templates created[/green]")

    # Step 3: Sample data
    console.print("\n[bold]Step 3: Sample Data (Optional)[/bold]")
    console.print(f"Sample tickers: {', '.join(SAMPLE_TICKERS)}")
    
    if Confirm.ask("\nWould you like to add sample tickers to your watchlist?", default=True):
        for ticker in SAMPLE_TICKERS:
            add_to_watchlist(ticker, "default", priority=10)
        console.print(f"[green]✓ Added {len(SAMPLE_TICKERS)} tickers to watchlist[/green]")
        
        if Confirm.ask("\nWould you like to backfill historical data for these tickers?", default=True):
            console.print("\n[yellow]This will take a few minutes...[/yellow]\n")
            
            client = create_tiingo_client()
            sync = create_sync_service(client)
            
            with console.status("Fetching historical data...") as status:
                def on_progress(ticker, current, total):
                    status.update(f"Fetching {ticker} ({current}/{total})...")
                
                result = sync.backfill(
                    tickers=SAMPLE_TICKERS,
                    progress_callback=on_progress,
                )
            
            console.print(f"\n[green]✓ Backfill complete[/green]")
            console.print(f"  Records inserted: {result['records_inserted']:,}")
            console.print(f"  Duration: {result['duration_seconds']:.1f}s")
    
    # Summary
    console.print("\n[bold green]Setup Complete![/bold green]")
    console.print("\nNext steps:")
    console.print("  1. Start the Next.js dev server: [cyan]yarn dev[/cyan]")
    console.print("  2. Open http://localhost:3000/trading")
    console.print("  3. Use the CLI for more operations: [cyan]trading-cli --help[/cyan]")
    console.print()


if __name__ == "__main__":
    main()
