-- Check what days of week are in 2026 transactions
SELECT
  transaction_date,
  TO_CHAR(transaction_date, 'Day') as day_of_week,
  type,
  amount,
  description
FROM financial_transactions
WHERE transaction_date >= '2026-01-01' AND transaction_date <= '2026-01-31'
ORDER BY transaction_date;
