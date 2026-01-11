"""Data synchronization service."""

import logging
import time
from datetime import date, datetime, timedelta
from typing import Callable

from ..data_sources import TiingoClient
from ..database import (
    initialize_database,
    upsert_security,
    get_security_id,
    insert_prices,
    get_last_price_date,
    get_watchlist_tickers,
    start_sync_log,
    complete_sync_log,
)

logger = logging.getLogger(__name__)


class SyncService:
    """Service for synchronizing stock data from Tiingo to local database."""

    def __init__(self, client: TiingoClient | None = None):
        """Initialize the sync service.

        Args:
            client: Optional Tiingo client instance
        """
        self.client = client or TiingoClient()

    def backfill(
        self,
        tickers: list[str],
        start_date: date | str | None = None,
        end_date: date | str | None = None,
        progress_callback: Callable[[str, int, int], None] | None = None,
    ) -> dict:
        """Backfill historical data for multiple tickers.

        Args:
            tickers: List of stock symbols
            start_date: Start date for backfill (default: 30 years ago)
            end_date: End date for backfill (default: today)
            progress_callback: Optional progress callback(ticker, current, total)

        Returns:
            Summary statistics
        """
        # Ensure database is initialized
        initialize_database()

        # Set default dates
        if start_date is None:
            start_date = date.today() - timedelta(days=365 * 30)
        if end_date is None:
            end_date = date.today()

        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)

        # Start sync log
        sync_id = start_sync_log("backfill")
        start_time = time.time()

        total = len(tickers)
        records_inserted = 0
        errors = []

        for i, ticker in enumerate(tickers):
            try:
                logger.info(f"Backfilling {ticker} ({i+1}/{total})")

                # Get ticker metadata and create/update security
                try:
                    metadata = self.client.get_ticker_metadata(ticker)
                    security_id = upsert_security(
                        ticker=ticker,
                        name=metadata.get("name"),
                        exchange=metadata.get("exchange"),
                    )
                except Exception as e:
                    logger.warning(f"Could not get metadata for {ticker}: {e}")
                    security_id = upsert_security(ticker=ticker)

                # Fetch price data
                prices_df = self.client.get_daily_prices(
                    ticker, start_date, end_date
                )

                if not prices_df.empty:
                    count = insert_prices(security_id, prices_df)
                    records_inserted += count
                    logger.info(f"Inserted {count} records for {ticker}")

                if progress_callback:
                    progress_callback(ticker, i + 1, total)

            except Exception as e:
                logger.error(f"Failed to backfill {ticker}: {e}")
                errors.append(f"{ticker}: {e}")

        # Complete sync log
        duration = time.time() - start_time
        complete_sync_log(
            sync_id=sync_id,
            symbols_processed=total,
            records_inserted=records_inserted,
            records_updated=0,
            errors_count=len(errors),
            duration_seconds=duration,
            error_details="\n".join(errors) if errors else None,
        )

        return {
            "symbols_processed": total,
            "records_inserted": records_inserted,
            "errors": len(errors),
            "duration_seconds": duration,
        }

    def update(
        self,
        tickers: list[str] | None = None,
        watchlist: str | None = "default",
        progress_callback: Callable[[str, int, int], None] | None = None,
    ) -> dict:
        """Update prices for tickers (incremental sync).

        Args:
            tickers: List of tickers to update (optional)
            watchlist: Watchlist name to update (default: "default")
            progress_callback: Optional progress callback

        Returns:
            Summary statistics
        """
        # Ensure database is initialized
        initialize_database()

        # Get tickers from watchlist if not provided
        if tickers is None:
            if watchlist:
                tickers = get_watchlist_tickers(watchlist)
            else:
                raise ValueError("Must provide either tickers or watchlist")

        if not tickers:
            logger.warning("No tickers to update")
            return {"symbols_processed": 0, "records_inserted": 0}

        # Start sync log
        sync_id = start_sync_log("incremental")
        start_time = time.time()

        total = len(tickers)
        records_inserted = 0
        errors = []

        for i, ticker in enumerate(tickers):
            try:
                security_id = get_security_id(ticker)
                if not security_id:
                    logger.warning(f"Security {ticker} not found, skipping")
                    continue

                # Get last price date
                last_date = get_last_price_date(security_id)
                if last_date:
                    start_date = last_date + timedelta(days=1)
                else:
                    # No data yet, do full backfill
                    start_date = date.today() - timedelta(days=365 * 30)

                end_date = date.today()

                # Skip if already up to date
                if start_date > end_date:
                    logger.debug(f"{ticker} is up to date")
                    continue

                logger.info(f"Updating {ticker} from {start_date} ({i+1}/{total})")

                # Fetch new data
                prices_df = self.client.get_daily_prices(
                    ticker, start_date, end_date
                )

                if not prices_df.empty:
                    count = insert_prices(security_id, prices_df)
                    records_inserted += count
                    logger.info(f"Inserted {count} new records for {ticker}")

                if progress_callback:
                    progress_callback(ticker, i + 1, total)

            except Exception as e:
                logger.error(f"Failed to update {ticker}: {e}")
                errors.append(f"{ticker}: {e}")

        # Complete sync log
        duration = time.time() - start_time
        complete_sync_log(
            sync_id=sync_id,
            symbols_processed=total,
            records_inserted=records_inserted,
            records_updated=0,
            errors_count=len(errors),
            duration_seconds=duration,
            error_details="\n".join(errors) if errors else None,
        )

        return {
            "symbols_processed": total,
            "records_inserted": records_inserted,
            "errors": len(errors),
            "duration_seconds": duration,
        }


def create_sync_service(client: TiingoClient | None = None) -> SyncService:
    """Create a sync service instance.

    Args:
        client: Optional Tiingo client

    Returns:
        SyncService instance
    """
    return SyncService(client)
