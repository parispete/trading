#!/usr/bin/env python3
"""
Daily sync script for updating price data.

Usage:
    python scripts/daily_sync.py [--list WATCHLIST]
    
This script is designed to be run as a cron job, e.g.:
    0 18 * * 1-5 cd /path/to/project && python scripts/daily_sync.py

The default schedule is 6pm ET on weekdays (after market close).
"""

import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import get_settings
from src.database import is_initialized, get_watchlist_tickers
from src.data_sources import create_tiingo_client
from src.services import create_sync_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent.parent / "data" / "sync.log"),
    ],
)
logger = logging.getLogger(__name__)


def main():
    """Main sync function."""
    parser = argparse.ArgumentParser(description="Daily price data sync")
    parser.add_argument(
        "--list", "-l",
        default="default",
        help="Watchlist to sync (default: 'default')",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be synced without actually syncing",
    )
    args = parser.parse_args()
    
    logger.info(f"Starting daily sync at {datetime.now()}")
    
    # Check initialization
    if not is_initialized():
        logger.error("Database not initialized. Run setup_database.py first.")
        sys.exit(1)
    
    # Get tickers
    tickers = get_watchlist_tickers(args.list)
    
    if not tickers:
        logger.warning(f"No tickers in watchlist '{args.list}'")
        sys.exit(0)
    
    logger.info(f"Syncing {len(tickers)} tickers from '{args.list}' watchlist")
    
    if args.dry_run:
        logger.info("Dry run - would sync: " + ", ".join(tickers))
        sys.exit(0)
    
    # Run sync
    try:
        client = create_tiingo_client()
        sync = create_sync_service(client)
        
        result = sync.update(
            tickers=tickers,
            progress_callback=lambda t, c, n: logger.info(f"Updating {t} ({c}/{n})"),
        )
        
        logger.info(f"Sync complete: {result['records_inserted']} records inserted")
        
        if result['errors'] > 0:
            logger.warning(f"Sync completed with {result['errors']} errors")
            sys.exit(1)
            
    except Exception as e:
        logger.exception(f"Sync failed: {e}")
        sys.exit(1)
    
    logger.info("Daily sync completed successfully")


if __name__ == "__main__":
    main()
