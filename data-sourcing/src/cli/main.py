"""Trading CLI - Command line interface for data sourcing."""

import logging
from datetime import date
from typing import Optional, List

import typer
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import print as rprint

from ..config import get_settings
from ..database import (
    initialize_database,
    is_initialized,
    get_database_stats,
    add_to_watchlist,
    get_watchlist,
    get_watchlist_tickers,
    get_price_history,
    get_security,
)
from ..data_sources import create_tiingo_client
from ..services import create_sync_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = typer.Typer(
    name="trading-cli",
    help="Trading data sourcing CLI",
    no_args_is_help=True,
)
console = Console()


# ===================
# Database Commands
# ===================

db_app = typer.Typer(help="Database management commands")
app.add_typer(db_app, name="db")


@db_app.command("init")
def db_init():
    """Initialize the database schema."""
    if is_initialized():
        rprint("[yellow]Database already initialized[/yellow]")
        return
    
    with console.status("Initializing database..."):
        initialize_database()
    
    rprint("[green]✓ Database initialized successfully[/green]")


@db_app.command("status")
def db_status():
    """Show database status and statistics."""
    if not is_initialized():
        rprint("[red]Database not initialized. Run 'trading-cli db init' first.[/red]")
        raise typer.Exit(1)
    
    stats = get_database_stats()
    
    table = Table(title="Database Status")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Securities", str(stats["securities"]))
    table.add_row("Price Records", f"{stats['price_records']:,}")
    table.add_row("Oldest Data", str(stats["oldest_date"]) if stats["oldest_date"] else "N/A")
    table.add_row("Newest Data", str(stats["newest_date"]) if stats["newest_date"] else "N/A")
    
    console.print(table)


# ===================
# Watchlist Commands
# ===================

watchlist_app = typer.Typer(help="Watchlist management commands")
app.add_typer(watchlist_app, name="watchlist")


@watchlist_app.command("add")
def watchlist_add(
    tickers: List[str] = typer.Argument(..., help="Ticker symbols to add"),
    list_name: str = typer.Option("default", "--list", "-l", help="Watchlist name"),
):
    """Add tickers to a watchlist."""
    if not is_initialized():
        rprint("[red]Database not initialized. Run 'trading-cli db init' first.[/red]")
        raise typer.Exit(1)
    
    # First, ensure securities exist
    client = create_tiingo_client()
    sync = create_sync_service(client)
    
    for ticker in tickers:
        ticker = ticker.upper()
        
        # Check if security exists, if not fetch it
        if not get_security(ticker):
            rprint(f"[yellow]Fetching data for {ticker}...[/yellow]")
            try:
                sync.backfill([ticker])
            except Exception as e:
                rprint(f"[red]Failed to fetch {ticker}: {e}[/red]")
                continue
        
        # Add to watchlist
        if add_to_watchlist(ticker, list_name):
            rprint(f"[green]✓ Added {ticker} to '{list_name}'[/green]")
        else:
            rprint(f"[yellow]{ticker} already in '{list_name}'[/yellow]")


@watchlist_app.command("show")
def watchlist_show(
    list_name: str = typer.Option("default", "--list", "-l", help="Watchlist name"),
):
    """Show watchlist contents."""
    if not is_initialized():
        rprint("[red]Database not initialized. Run 'trading-cli db init' first.[/red]")
        raise typer.Exit(1)
    
    df = get_watchlist(list_name)
    
    if df.empty:
        rprint(f"[yellow]Watchlist '{list_name}' is empty[/yellow]")
        return
    
    table = Table(title=f"Watchlist: {list_name}")
    table.add_column("Ticker", style="cyan")
    table.add_column("Name")
    table.add_column("Exchange")
    table.add_column("Priority", justify="right")
    
    for _, row in df.iterrows():
        table.add_row(
            row["ticker"],
            row["name"] or "-",
            row["exchange"] or "-",
            str(row["priority"]),
        )
    
    console.print(table)


# ===================
# Fetch Commands
# ===================

fetch_app = typer.Typer(help="Data fetching commands")
app.add_typer(fetch_app, name="fetch")


@fetch_app.command("backfill")
def fetch_backfill(
    tickers: List[str] = typer.Argument(..., help="Ticker symbols to backfill"),
    start_date: Optional[str] = typer.Option(None, "--start", "-s", help="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = typer.Option(None, "--end", "-e", help="End date (YYYY-MM-DD)"),
):
    """Backfill historical data for tickers."""
    initialize_database()
    
    client = create_tiingo_client()
    sync = create_sync_service(client)
    
    tickers = [t.upper() for t in tickers]
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Backfilling...", total=len(tickers))
        
        def on_progress(ticker: str, current: int, total: int):
            progress.update(task, description=f"Processing {ticker}...", completed=current)
        
        result = sync.backfill(
            tickers=tickers,
            start_date=start_date,
            end_date=end_date,
            progress_callback=on_progress,
        )
    
    rprint(f"\n[green]✓ Backfill complete[/green]")
    rprint(f"  Symbols processed: {result['symbols_processed']}")
    rprint(f"  Records inserted: {result['records_inserted']:,}")
    rprint(f"  Errors: {result['errors']}")
    rprint(f"  Duration: {result['duration_seconds']:.1f}s")


@fetch_app.command("update")
def fetch_update(
    list_name: str = typer.Option("default", "--list", "-l", help="Watchlist to update"),
):
    """Update prices for watchlist (incremental sync)."""
    if not is_initialized():
        rprint("[red]Database not initialized. Run 'trading-cli db init' first.[/red]")
        raise typer.Exit(1)
    
    tickers = get_watchlist_tickers(list_name)
    
    if not tickers:
        rprint(f"[yellow]No tickers in watchlist '{list_name}'[/yellow]")
        return
    
    client = create_tiingo_client()
    sync = create_sync_service(client)
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Updating...", total=len(tickers))
        
        def on_progress(ticker: str, current: int, total: int):
            progress.update(task, description=f"Updating {ticker}...", completed=current)
        
        result = sync.update(
            tickers=tickers,
            progress_callback=on_progress,
        )
    
    rprint(f"\n[green]✓ Update complete[/green]")
    rprint(f"  Symbols processed: {result['symbols_processed']}")
    rprint(f"  Records inserted: {result['records_inserted']:,}")
    rprint(f"  Errors: {result['errors']}")
    rprint(f"  Duration: {result['duration_seconds']:.1f}s")


# ===================
# Query Commands
# ===================

query_app = typer.Typer(help="Data query commands")
app.add_typer(query_app, name="query")


@query_app.command("prices")
def query_prices(
    ticker: str = typer.Argument(..., help="Ticker symbol"),
    start_date: Optional[str] = typer.Option(None, "--start", "-s", help="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = typer.Option(None, "--end", "-e", help="End date (YYYY-MM-DD)"),
    limit: int = typer.Option(10, "--limit", "-n", help="Number of rows to show"),
):
    """Query price history for a ticker."""
    if not is_initialized():
        rprint("[red]Database not initialized. Run 'trading-cli db init' first.[/red]")
        raise typer.Exit(1)
    
    start = date.fromisoformat(start_date) if start_date else None
    end = date.fromisoformat(end_date) if end_date else None
    
    df = get_price_history(ticker.upper(), start, end)
    
    if df.empty:
        rprint(f"[yellow]No data found for {ticker.upper()}[/yellow]")
        return
    
    # Show most recent first
    df = df.sort_values("price_date", ascending=False).head(limit)
    
    table = Table(title=f"Price History: {ticker.upper()}")
    table.add_column("Date", style="cyan")
    table.add_column("Open", justify="right")
    table.add_column("High", justify="right")
    table.add_column("Low", justify="right")
    table.add_column("Close", justify="right")
    table.add_column("Volume", justify="right")
    
    for _, row in df.iterrows():
        table.add_row(
            str(row["price_date"]),
            f"{row['adj_open']:.2f}",
            f"{row['adj_high']:.2f}",
            f"{row['adj_low']:.2f}",
            f"{row['adj_close']:.2f}",
            f"{row['adj_volume']:,.0f}",
        )
    
    console.print(table)
    rprint(f"\n[dim]Showing {len(df)} of {len(get_price_history(ticker.upper(), start, end))} records[/dim]")


# ===================
# Main Entry Point
# ===================

def main():
    """Main entry point for the CLI."""
    app()


if __name__ == "__main__":
    main()
