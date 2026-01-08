-- Remove the incorrect Monday entry
DELETE FROM financial_transactions
WHERE transaction_date = '2026-01-05';

-- Show what remains for January 2026
SELECT
  transaction_date,
  TO_CHAR(transaction_date, 'Day') as day_of_week,
  type,
  amount,
  description
FROM financial_transactions
WHERE transaction_date >= '2026-01-01' AND transaction_date <= '2026-01-31'
ORDER BY transaction_date;

-- Show summary
SELECT
  'January 2026 after fix' as period,
  COUNT(*) as transactions,
  SUM(amount) as total_income
FROM financial_transactions
WHERE transaction_date >= '2026-01-01' AND transaction_date <= '2026-01-31';
