#!/usr/bin/env python3
"""Generate SQL INSERT statements from CSV"""
import csv
from pathlib import Path

# Read CSV file
csv_path = Path(__file__).parent / "126cc1a7.csv"
sql_path = Path(__file__).parent / "import_players.sql"

print(f"Reading players from {csv_path}")

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    player_names = [row['Player Name'].strip() for row in reader if row['Player Name'].strip()]

print(f"Found {len(player_names)} players in CSV")
print(f"Generating SQL script at {sql_path}")

# Generate SQL
with open(sql_path, 'w', encoding='utf-8') as f:
    f.write("-- Import players from CSV\n")
    f.write("-- First, check for duplicates and only insert new players\n\n")

    for name in player_names:
        # Escape single quotes in names
        escaped_name = name.replace("'", "''")
        f.write(f"INSERT INTO players (display_name, created_at, updated_at)\n")
        f.write(f"SELECT '{escaped_name}', NOW(), NOW()\n")
        f.write(f"WHERE NOT EXISTS (\n")
        f.write(f"    SELECT 1 FROM players WHERE display_name = '{escaped_name}'\n")
        f.write(f");\n\n")

print(f"✓ SQL script generated successfully!")
print(f"\nTo import, run:")
print(f"gcloud sql connect volleyball-db --user=volleyball_app --database=volleyball < import_players.sql")
