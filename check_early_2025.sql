-- Check early 2025 data (before May 9)
SELECT
  transaction_date,
  type,
  amount,
  description
FROM financial_transactions
WHERE transaction_date >= '2025-01-01' AND transaction_date < '2025-05-09'
ORDER BY transaction_date
LIMIT 20;

-- Count by month
SELECT
  DATE_TRUNC('month', transaction_date) as month,
  COUNT(*) as count,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
FROM financial_transactions
WHERE transaction_date >= '2025-01-01' AND transaction_date < '2025-05-09'
GROUP BY DATE_TRUNC('month', transaction_date)
ORDER BY month;
