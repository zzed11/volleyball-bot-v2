-- Drop the old view
DROP VIEW IF EXISTS cash_flow_summary;

-- Create new view that shows actual transaction dates, not Monday week-starts
CREATE OR REPLACE VIEW cash_flow_summary AS
WITH daily_totals AS (
  SELECT
    transaction_date as week_start,  -- Using actual date, not week start
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_cash_flow
  FROM financial_transactions
  GROUP BY transaction_date
)
SELECT
  week_start,
  total_income,
  total_expenses,
  net_cash_flow,
  SUM(net_cash_flow) OVER (ORDER BY week_start) as running_balance
FROM daily_totals
ORDER BY week_start;

-- Verify the fix
SELECT
  week_start,
  TO_CHAR(week_start, 'Day, Mon DD, YYYY') as formatted_date,
  total_income,
  total_expenses,
  net_cash_flow,
  running_balance
FROM cash_flow_summary
WHERE EXTRACT(YEAR FROM week_start) = 2025
ORDER BY week_start
LIMIT 15;
