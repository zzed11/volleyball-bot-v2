-- Delete all future transactions (after today: 2026-01-08)
DELETE FROM financial_transactions
WHERE transaction_date > '2026-01-08';

-- Show what remains
SELECT
  EXTRACT(YEAR FROM transaction_date) as year,
  COUNT(*) as transaction_count,
  MIN(transaction_date) as first_date,
  MAX(transaction_date) as last_date,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
FROM financial_transactions
GROUP BY EXTRACT(YEAR FROM transaction_date)
ORDER BY year;

-- Show latest transactions
SELECT
  transaction_date,
  type,
  amount,
  description
FROM financial_transactions
WHERE transaction_date >= '2026-01-01'
ORDER BY transaction_date;
