#!/usr/bin/env python3
"""Parse Excel budget file and generate SQL for 2025 transactions"""
import sys
import pandas as pd
from datetime import datetime
from pathlib import Path

# Excel file path
excel_path = Path(__file__).parent / "cash flow-volparty, budget plan 2025.xlsx"

try:
    # Read all sheets
    excel_file = pd.ExcelFile(excel_path)
    print(f"Available sheets: {excel_file.sheet_names}\n")

    # Try to read the cash flow sheet
    for sheet_name in excel_file.sheet_names:
        print(f"\n{'='*60}")
        print(f"Sheet: {sheet_name}")
        print('='*60)

        df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)

        # Display first 30 rows to understand structure
        print("\nFirst 30 rows:")
        print(df.head(30).to_string())

        # Save to CSV for easier inspection
        csv_path = Path(__file__).parent / f"budget_sheet_{sheet_name}.csv"
        df.to_csv(csv_path, index=False, header=False)
        print(f"\nSaved to: {csv_path}")

except Exception as e:
    print(f"Error reading Excel: {e}")
    sys.exit(1)
