"""Tiingo API client for fetching historical stock data."""

import time
import logging
from datetime import date, datetime
from typing import Any

import requests
import pandas as pd

from ..config import get_settings

logger = logging.getLogger(__name__)


class TiingoClient:
    """Client for Tiingo REST API."""

    BASE_URL = "https://api.tiingo.com"

    def __init__(self, api_key: str | None = None):
        """Initialize the Tiingo client.

        Args:
            api_key: Tiingo API key. If not provided, loads from settings.
        """
        settings = get_settings()
        self.api_key = api_key or settings.tiingo_api_key
        self.request_delay = settings.api_request_delay_ms / 1000
        self.max_retries = settings.max_retries
        self._last_request_time = 0.0

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json",
        })

    def _rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self._last_request_time = time.time()

    def _request(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """Make a rate-limited request to Tiingo API.

        Args:
            endpoint: API endpoint path
            params: Query parameters

        Returns:
            JSON response data

        Raises:
            requests.HTTPError: If the request fails
        """
        url = f"{self.BASE_URL}{endpoint}"
        self._rate_limit()

        for attempt in range(self.max_retries):
            try:
                response = self.session.get(url, params=params, timeout=30)

                if response.status_code == 429:
                    # Rate limited - wait and retry
                    wait_time = 60 * (attempt + 1)
                    logger.warning(
                        f"Rate limited. Waiting {wait_time}s before retry..."
                    )
                    time.sleep(wait_time)
                    continue

                response.raise_for_status()
                return response.json()

            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries - 1:
                    wait_time = 5 * (attempt + 1)
                    logger.warning(
                        f"Request failed: {e}. Retrying in {wait_time}s..."
                    )
                    time.sleep(wait_time)
                else:
                    raise

        raise RuntimeError(f"Failed after {self.max_retries} attempts")

    def get_supported_tickers(self) -> pd.DataFrame:
        """Get list of all supported tickers.

        Returns:
            DataFrame with ticker metadata
        """
        logger.info("Fetching supported tickers from Tiingo...")
        data = self._request("/tiingo/daily")

        df = pd.DataFrame(data)
        logger.info(f"Found {len(df)} supported tickers")
        return df

    def get_ticker_metadata(self, ticker: str) -> dict[str, Any]:
        """Get metadata for a specific ticker.

        Args:
            ticker: Stock symbol

        Returns:
            Ticker metadata dictionary
        """
        return self._request(f"/tiingo/daily/{ticker}")

    def get_daily_prices(
        self,
        ticker: str,
        start_date: date | str | None = None,
        end_date: date | str | None = None,
    ) -> pd.DataFrame:
        """Fetch daily OHLC prices for a ticker.

        Args:
            ticker: Stock symbol
            start_date: Start date for historical data
            end_date: End date for historical data

        Returns:
            DataFrame with OHLC data
        """
        params: dict[str, str] = {}

        if start_date:
            if isinstance(start_date, date):
                start_date = start_date.isoformat()
            params["startDate"] = start_date

        if end_date:
            if isinstance(end_date, date):
                end_date = end_date.isoformat()
            params["endDate"] = end_date

        logger.debug(f"Fetching prices for {ticker}: {params}")
        data = self._request(f"/tiingo/daily/{ticker}/prices", params)

        if not data:
            logger.warning(f"No data returned for {ticker}")
            return pd.DataFrame()

        df = pd.DataFrame(data)

        # Convert date column
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"]).dt.date

        return df

    def validate_ticker(self, ticker: str) -> bool:
        """Check if a ticker is valid and available.

        Args:
            ticker: Stock symbol to validate

        Returns:
            True if ticker is valid
        """
        try:
            metadata = self.get_ticker_metadata(ticker)
            return metadata is not None
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return False
            raise

    def get_bulk_prices(
        self,
        tickers: list[str],
        start_date: date | str | None = None,
        end_date: date | str | None = None,
        progress_callback: callable | None = None,
    ) -> dict[str, pd.DataFrame]:
        """Fetch prices for multiple tickers.

        Args:
            tickers: List of stock symbols
            start_date: Start date for historical data
            end_date: End date for historical data
            progress_callback: Optional callback(ticker, index, total)

        Returns:
            Dictionary mapping ticker to DataFrame
        """
        results = {}
        total = len(tickers)

        for i, ticker in enumerate(tickers):
            try:
                df = self.get_daily_prices(ticker, start_date, end_date)
                if not df.empty:
                    results[ticker] = df

                if progress_callback:
                    progress_callback(ticker, i + 1, total)

            except Exception as e:
                logger.error(f"Failed to fetch {ticker}: {e}")

        return results


# Convenience function for creating client
def create_tiingo_client(api_key: str | None = None) -> TiingoClient:
    """Create a Tiingo client instance.

    Args:
        api_key: Optional API key override

    Returns:
        Configured TiingoClient instance
    """
    return TiingoClient(api_key)
