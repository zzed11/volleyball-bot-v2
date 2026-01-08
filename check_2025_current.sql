-- Check current 2025 data
SELECT
  transaction_date,
  TO_CHAR(transaction_date, 'Day') as day_name,
  type,
  amount,
  description
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
ORDER BY transaction_date
LIMIT 20;

-- Summary
SELECT
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  MIN(transaction_date) as first_date,
  MAX(transaction_date) as last_date
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025;
