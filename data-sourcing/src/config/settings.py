"""Configuration management for trading data sourcing."""

import os
from pathlib import Path
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # Required fields (no defaults) must come first
    tiingo_api_key: str
    database_path: Path

    # Optional fields with defaults
    max_daily_api_calls: int = 900
    api_request_delay_ms: int = 50
    max_retries: int = 3
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from environment variables."""
        api_key = os.getenv("TIINGO_API_KEY", "")
        if not api_key:
            raise ValueError(
                "TIINGO_API_KEY environment variable is required. "
                "Get a free key at https://www.tiingo.com"
            )

        db_path = os.getenv("DATABASE_PATH", "./data/trading_data.duckdb")

        return cls(
            tiingo_api_key=api_key,
            max_daily_api_calls=int(os.getenv("MAX_DAILY_API_CALLS", "900")),
            api_request_delay_ms=int(os.getenv("API_REQUEST_DELAY_MS", "50")),
            max_retries=int(os.getenv("MAX_RETRIES", "3")),
            database_path=Path(db_path),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


# Global settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get the global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings.from_env()
    return _settings


def reset_settings() -> None:
    """Reset settings (useful for testing)."""
    global _settings
    _settings = None
