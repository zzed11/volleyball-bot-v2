#!/usr/bin/env python3
"""Generate recurring Friday and Wednesday transactions for 2026"""
from datetime import date, timedelta

# Configuration
YEAR = 2026
FRIDAY_INCOME = 270.00  # Default income per Friday game
WEDNESDAY_INCOME = 270.00  # Default income per Wednesday game

# Generate all Fridays in 2026
fridays = []
current_date = date(YEAR, 1, 1)
# Find first Friday
while current_date.weekday() != 4:  # 4 = Friday
    current_date += timedelta(days=1)

while current_date.year == YEAR:
    fridays.append(current_date)
    current_date += timedelta(days=7)

# Generate all Wednesdays in 2026
wednesdays = []
current_date = date(YEAR, 1, 1)
# Find first Wednesday
while current_date.weekday() != 2:  # 2 = Wednesday
    current_date += timedelta(days=1)

while current_date.year == YEAR:
    wednesdays.append(current_date)
    current_date += timedelta(days=7)

print(f"-- Generated {len(fridays)} Fridays and {len(wednesdays)} Wednesdays for {YEAR}")
print(f"-- Friday dates: {fridays[0]} to {fridays[-1]}")
print(f"-- Wednesday dates: {wednesdays[0]} to {wednesdays[-1]}")
print()

# Generate SQL
sql_lines = []
sql_lines.append(f"-- Auto-generated recurring transactions for {YEAR}")
sql_lines.append(f"-- {len(fridays)} Fridays + {len(wednesdays)} Wednesdays = {len(fridays) + len(wednesdays)} total games")
sql_lines.append("")
sql_lines.append("-- Friday game income")

for friday in fridays:
    sql_lines.append(
        f"INSERT INTO financial_transactions (transaction_date, type, amount, description) "
        f"VALUES ('{friday}', 'income', {FRIDAY_INCOME:.2f}, 'Friday volleyball game income');"
    )

sql_lines.append("")
sql_lines.append("-- Wednesday game income")

for wednesday in wednesdays:
    sql_lines.append(
        f"INSERT INTO financial_transactions (transaction_date, type, amount, description) "
        f"VALUES ('{wednesday}', 'income', {WEDNESDAY_INCOME:.2f}, 'Wednesday volleyball game income');"
    )

# Write SQL file
with open('load_2026_recurring.sql', 'w') as f:
    f.write('\n'.join(sql_lines))

print(f"Generated SQL script: load_2026_recurring.sql")
print(f"Total transactions: {len(fridays) + len(wednesdays)}")
print(f"Total income: ₪{(len(fridays) * FRIDAY_INCOME + len(wednesdays) * WEDNESDAY_INCOME):.2f}")
