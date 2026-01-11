"""Date utilities for trading calendar."""

from datetime import date, datetime, timedelta
from typing import Iterator

import yaml
from pathlib import Path

# US Market holidays (major ones)
DEFAULT_HOLIDAYS = {
    2024: [
        date(2024, 1, 1),   # New Year's Day
        date(2024, 1, 15),  # MLK Day
        date(2024, 2, 19),  # Presidents Day
        date(2024, 3, 29),  # Good Friday
        date(2024, 5, 27),  # Memorial Day
        date(2024, 6, 19),  # Juneteenth
        date(2024, 7, 4),   # Independence Day
        date(2024, 9, 2),   # Labor Day
        date(2024, 11, 28), # Thanksgiving
        date(2024, 12, 25), # Christmas
    ],
    2025: [
        date(2025, 1, 1),   # New Year's Day
        date(2025, 1, 20),  # MLK Day
        date(2025, 2, 17),  # Presidents Day
        date(2025, 4, 18),  # Good Friday
        date(2025, 5, 26),  # Memorial Day
        date(2025, 6, 19),  # Juneteenth
        date(2025, 7, 4),   # Independence Day
        date(2025, 9, 1),   # Labor Day
        date(2025, 11, 27), # Thanksgiving
        date(2025, 12, 25), # Christmas
    ],
}


def load_holidays(config_path: Path | None = None) -> set[date]:
    """Load holidays from config file or use defaults.
    
    Args:
        config_path: Path to holidays.yaml file
        
    Returns:
        Set of holiday dates
    """
    holidays = set()
    
    # Add default holidays
    for year_holidays in DEFAULT_HOLIDAYS.values():
        holidays.update(year_holidays)
    
    # Try to load from config
    if config_path and config_path.exists():
        with open(config_path) as f:
            data = yaml.safe_load(f)
            if data and "holidays" in data:
                for date_str in data["holidays"]:
                    holidays.add(date.fromisoformat(date_str))
    
    return holidays


# Cache holidays
_holidays: set[date] | None = None


def get_holidays() -> set[date]:
    """Get cached holidays set."""
    global _holidays
    if _holidays is None:
        _holidays = load_holidays()
    return _holidays


def is_trading_day(d: date) -> bool:
    """Check if a date is a trading day.
    
    Args:
        d: Date to check
        
    Returns:
        True if trading day (weekday and not holiday)
    """
    # Weekend check
    if d.weekday() >= 5:  # Saturday = 5, Sunday = 6
        return False
    
    # Holiday check
    if d in get_holidays():
        return False
    
    return True


def get_previous_trading_day(d: date) -> date:
    """Get the previous trading day.
    
    Args:
        d: Reference date
        
    Returns:
        Previous trading day
    """
    d = d - timedelta(days=1)
    while not is_trading_day(d):
        d = d - timedelta(days=1)
    return d


def get_next_trading_day(d: date) -> date:
    """Get the next trading day.
    
    Args:
        d: Reference date
        
    Returns:
        Next trading day
    """
    d = d + timedelta(days=1)
    while not is_trading_day(d):
        d = d + timedelta(days=1)
    return d


def get_last_trading_day() -> date:
    """Get the most recent completed trading day.
    
    Returns:
        Last trading day
    """
    today = date.today()
    
    # If it's a trading day but market hasn't closed (before 4pm ET)
    # we might want the previous day, but for simplicity we just
    # check if today is a trading day
    if is_trading_day(today):
        return today
    return get_previous_trading_day(today)


def trading_days_between(start: date, end: date) -> Iterator[date]:
    """Generate trading days between two dates.
    
    Args:
        start: Start date (inclusive)
        end: End date (inclusive)
        
    Yields:
        Trading days
    """
    current = start
    while current <= end:
        if is_trading_day(current):
            yield current
        current += timedelta(days=1)


def count_trading_days(start: date, end: date) -> int:
    """Count trading days between two dates.
    
    Args:
        start: Start date
        end: End date
        
    Returns:
        Number of trading days
    """
    return sum(1 for _ in trading_days_between(start, end))
