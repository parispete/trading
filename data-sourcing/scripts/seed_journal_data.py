#!/usr/bin/env python3
"""Seed script to create example data for the Trading Journal."""

import sys
from pathlib import Path
from datetime import date, timedelta

# Add parent to path so we can import src module
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database import get_connection, execute, query, upsert_security


def main():
    print("Seeding Trading Journal with example data...")
    print("-" * 40)

    conn = get_connection()

    # 1. Create a depot using direct SQL with sequence
    print("1. Creating depot...")

    # First, let's get the max id to manually assign
    result = query("SELECT COALESCE(MAX(id), 0) + 1 FROM depot")
    next_id = result[0][0]

    execute(
        """
        INSERT INTO depot (id, name, broker_name, currency, is_default, description)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (next_id, "Interactive Brokers", "IBKR", "USD", True, "Main trading account")
    )
    depot_id = next_id
    print(f"   Created depot with ID: {depot_id}")

    # 2. Create some securities
    print("2. Creating securities...")
    securities = [
        ("AAPL", "Apple Inc.", "Common Stock", "NASDAQ"),
        ("MSFT", "Microsoft Corporation", "Common Stock", "NASDAQ"),
        ("AMD", "Advanced Micro Devices", "Common Stock", "NASDAQ"),
        ("NVDA", "NVIDIA Corporation", "Common Stock", "NASDAQ"),
        ("TSLA", "Tesla Inc.", "Common Stock", "NASDAQ"),
    ]

    security_ids = {}
    for ticker, name, asset_type, exchange in securities:
        sec_id = upsert_security(ticker, name, asset_type, exchange)
        security_ids[ticker] = sec_id
        print(f"   Created security: {ticker} (ID: {sec_id})")

    # 3. Create some example trades using direct SQL
    print("3. Creating example trades...")

    today = date.today()

    def create_trade(security_id, position_type, quantity, open_date, **kwargs):
        result = query("SELECT COALESCE(MAX(id), 0) + 1 FROM trade_position")
        next_id = result[0][0]

        execute(
            """
            INSERT INTO trade_position (
                id, depot_id, security_id, position_type, quantity, open_date,
                strike_price, expiration_date, premium_per_contract, commission_open,
                shares, cost_per_share, underlying_price_at_open, delta_at_open, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
            """,
            (
                next_id,
                depot_id,
                security_id,
                position_type,
                quantity,
                open_date,
                kwargs.get('strike_price'),
                kwargs.get('expiration_date'),
                kwargs.get('premium_per_contract'),
                kwargs.get('commission_open', 1.0),
                kwargs.get('shares'),
                kwargs.get('cost_per_share'),
                kwargs.get('underlying_price_at_open'),
                kwargs.get('delta_at_open'),
            )
        )
        return next_id

    # Open Short Put on AAPL
    trade1_id = create_trade(
        security_id=security_ids["AAPL"],
        position_type="SHORT_PUT",
        quantity=1,
        open_date=(today - timedelta(days=14)).isoformat(),
        strike_price=180.0,
        expiration_date=(today + timedelta(days=21)).isoformat(),
        premium_per_contract=2.50,
        commission_open=1.00,
        underlying_price_at_open=185.0,
        delta_at_open=-0.25,
    )
    print(f"   Created AAPL Short Put (ID: {trade1_id})")

    # Open Short Put on MSFT
    trade2_id = create_trade(
        security_id=security_ids["MSFT"],
        position_type="SHORT_PUT",
        quantity=2,
        open_date=(today - timedelta(days=7)).isoformat(),
        strike_price=400.0,
        expiration_date=(today + timedelta(days=14)).isoformat(),
        premium_per_contract=3.25,
        commission_open=2.00,
        underlying_price_at_open=415.0,
        delta_at_open=-0.30,
    )
    print(f"   Created MSFT Short Put (ID: {trade2_id})")

    # Open Short Call on AMD (covered call scenario)
    trade3_id = create_trade(
        security_id=security_ids["AMD"],
        position_type="SHORT_CALL",
        quantity=1,
        open_date=(today - timedelta(days=5)).isoformat(),
        strike_price=160.0,
        expiration_date=(today + timedelta(days=9)).isoformat(),
        premium_per_contract=1.85,
        commission_open=1.00,
        underlying_price_at_open=155.0,
        delta_at_open=-0.35,
    )
    print(f"   Created AMD Short Call (ID: {trade3_id})")

    # Long Stock on NVDA
    trade4_id = create_trade(
        security_id=security_ids["NVDA"],
        position_type="LONG_STOCK",
        quantity=100,
        open_date=(today - timedelta(days=30)).isoformat(),
        shares=100,
        cost_per_share=850.0,
        commission_open=1.00,
    )
    print(f"   Created NVDA Long Stock (ID: {trade4_id})")

    # Short Put expiring soon (for "expiring soon" widget)
    trade5_id = create_trade(
        security_id=security_ids["TSLA"],
        position_type="SHORT_PUT",
        quantity=1,
        open_date=(today - timedelta(days=20)).isoformat(),
        strike_price=250.0,
        expiration_date=(today + timedelta(days=3)).isoformat(),
        premium_per_contract=4.50,
        commission_open=1.00,
        underlying_price_at_open=260.0,
        delta_at_open=-0.20,
    )
    print(f"   Created TSLA Short Put expiring soon (ID: {trade5_id})")

    print("-" * 40)
    print("Seed data created successfully!")
    print(f"\nSummary:")
    print(f"  - 1 Depot (Interactive Brokers)")
    print(f"  - 5 Securities (AAPL, MSFT, AMD, NVDA, TSLA)")
    print(f"  - 5 Open Positions:")
    print(f"    - 3 Short Puts (AAPL, MSFT, TSLA)")
    print(f"    - 1 Short Call (AMD)")
    print(f"    - 1 Long Stock (NVDA)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
