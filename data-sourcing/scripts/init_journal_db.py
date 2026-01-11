#!/usr/bin/env python3
"""Simple script to initialize the journal database tables."""

import sys
from pathlib import Path

# Add parent to path so we can import src module
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database import get_connection, initialize_database
from src.database.journal_schema import initialize_journal_database


def main():
    print("Initializing Trading Journal Database...")
    print("-" * 40)

    # Initialize core database first
    print("1. Initializing core database schema...")
    try:
        initialize_database()
        print("   Core schema ready.")
    except Exception as e:
        print(f"   Error: {e}")
        return 1

    # Initialize journal tables
    print("2. Initializing journal tables...")
    try:
        result = initialize_journal_database()
        if result:
            print("   Journal tables created successfully.")
        else:
            print("   Journal tables already exist.")
    except Exception as e:
        print(f"   Error: {e}")
        return 1

    # Verify tables
    print("3. Verifying tables...")
    conn = get_connection()
    tables = conn.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'main'
        ORDER BY table_name
    """).fetchall()

    print(f"   Found {len(tables)} tables:")
    for (table_name,) in tables:
        print(f"   - {table_name}")

    print("-" * 40)
    print("Database initialization complete!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
