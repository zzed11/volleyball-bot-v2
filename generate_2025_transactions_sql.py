#!/usr/bin/env python3
"""Generate SQL INSERT statements from Excel budget data"""
import pandas as pd
from datetime import datetime
from pathlib import Path

# Read the parsed cash flow CSV
csv_path = Path(__file__).parent / "budget_sheet_cash flow 2025.csv"
df = pd.read_csv(csv_path, header=None)

# Category mapping (based on expense_categories table)
CATEGORY_MAP = {
    'Tournament Prizes': 1,      # Row 4
    'Whistle and scoreboard': 2, # Row 5
    'Treats for players': 3,     # Row 6
    'Hall cost': 4,              # Row 7
}

# Parse dates from row 0 (skip first column which is the label)
dates = []
for col_idx in range(1, len(df.columns)):
    date_val = df.iloc[0, col_idx]
    if pd.notna(date_val):
        try:
            # Handle datetime objects or string dates
            if isinstance(date_val, str):
                parsed_date = pd.to_datetime(date_val).date()
            else:
                parsed_date = pd.to_datetime(date_val).date()
            dates.append((col_idx, parsed_date))
        except:
            continue

print(f"-- Parsed {len(dates)} dates from Excel")
print(f"-- Date range: {dates[0][1] if dates else 'N/A'} to {dates[-1][1] if dates else 'N/A'}")
print()

# Generate SQL
sql_lines = []
sql_lines.append("-- Clear existing 2025 sample data")
sql_lines.append("DELETE FROM financial_transactions")
sql_lines.append("WHERE transaction_date >= '2025-05-09' AND transaction_date <= '2025-12-31';")
sql_lines.append("")
sql_lines.append("-- Insert actual 2025 income transactions")

# Process each date column
for col_idx, transaction_date in dates:
    # Income from row 1 (index 1)
    income = df.iloc[1, col_idx]
    if pd.notna(income):
        try:
            income_val = float(income)
            if income_val > 0:
                sql_lines.append(
                    f"INSERT INTO financial_transactions (transaction_date, type, amount, description) "
                    f"VALUES ('{transaction_date}', 'income', {income_val:.2f}, 'Weekly volleyball game income');"
                )
        except (ValueError, TypeError):
            pass

sql_lines.append("")
sql_lines.append("-- Insert actual 2025 expense transactions")

# Process expenses from rows 4-7
expense_rows = [
    (4, 'Tournament Prizes', 1),
    (5, 'Whistle and scoreboard', 2),
    (6, 'Treats for players', 3),
    (7, 'Hall cost in Kiryat yam', 4),
]

for col_idx, transaction_date in dates:
    for row_idx, description, category_id in expense_rows:
        expense = df.iloc[row_idx, col_idx]
        if pd.notna(expense):
            try:
                expense_val = float(expense)
                if expense_val > 0:
                    sql_lines.append(
                        f"INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) "
                        f"VALUES ('{transaction_date}', 'expense', {expense_val:.2f}, {category_id}, '{description}');"
                    )
            except (ValueError, TypeError):
                pass

# Write SQL file
output_path = Path(__file__).parent / "load_2025_actual_data.sql"
with open(output_path, 'w') as f:
    f.write('\n'.join(sql_lines))

print(f"\nGenerated SQL script: {output_path}")
print(f"Total transactions to insert: {len([l for l in sql_lines if l.startswith('INSERT')])}")
