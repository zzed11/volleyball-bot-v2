#!/usr/bin/env python3
"""Import players from CSV file into the database"""
import csv
import sys
from pathlib import Path

# Add services/bot-api to path
sys.path.insert(0, str(Path(__file__).parent / "services" / "bot-api"))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from config import Settings
from db.models import Player


def main():
    """Import players from CSV"""
    # Load settings
    settings = Settings()
    settings.load_secrets_from_secret_manager()

    # Create database connection
    engine = create_engine(settings.database_url_sync)

    # Read CSV file
    csv_path = Path(__file__).parent / "126cc1a7.csv"
    print(f"Reading players from {csv_path}")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        player_names = [row['Player Name'].strip() for row in reader if row['Player Name'].strip()]

    print(f"Found {len(player_names)} players in CSV")

    # Process players
    with Session(engine) as session:
        # Get existing players
        existing_players = session.execute(select(Player)).scalars().all()
        existing_names = {p.display_name for p in existing_players if p.display_name}

        print(f"Found {len(existing_names)} existing players in database")

        # Filter new players
        new_player_names = [name for name in player_names if name not in existing_names]

        if not new_player_names:
            print("No new players to import!")
            return

        print(f"\nImporting {len(new_player_names)} new players:")

        # Create new player records
        new_players = []
        for name in new_player_names:
            player = Player(display_name=name)
            new_players.append(player)
            print(f"  - {name}")

        # Bulk insert
        session.add_all(new_players)
        session.commit()

        print(f"\n✓ Successfully imported {len(new_players)} players!")
        print(f"Total players in database: {len(existing_names) + len(new_players)}")


if __name__ == "__main__":
    main()
