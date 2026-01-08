-- Check what years have transaction data
SELECT
  EXTRACT(YEAR FROM transaction_date) as year,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  MIN(transaction_date) as first_date,
  MAX(transaction_date) as last_date
FROM financial_transactions
GROUP BY EXTRACT(YEAR FROM transaction_date)
ORDER BY year DESC;
