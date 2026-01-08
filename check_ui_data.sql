-- Check what the Cash Flow page actually sees
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
LIMIT 20;

-- Check actual transaction dates for May 2025
SELECT
  transaction_date,
  TO_CHAR(transaction_date, 'Day, Mon DD, YYYY') as formatted_date,
  DATE_TRUNC('week', transaction_date) as week_start_calculated,
  type,
  amount
FROM financial_transactions
WHERE transaction_date >= '2025-05-01' AND transaction_date <= '2025-06-30'
ORDER BY transaction_date;
