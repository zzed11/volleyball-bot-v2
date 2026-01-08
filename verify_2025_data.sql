-- Verify 2025 transaction data import
SELECT '=== Transaction Count ===' as section;
SELECT
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
FROM financial_transactions
WHERE transaction_date >= '2025-05-09' AND transaction_date <= '2025-12-31';

SELECT '=== Financial Summary ===' as section;
SELECT
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance
FROM financial_transactions
WHERE transaction_date >= '2025-05-09' AND transaction_date <= '2025-12-31';

SELECT '=== Date Range ===' as section;
SELECT
  MIN(transaction_date) as first_transaction,
  MAX(transaction_date) as last_transaction
FROM financial_transactions
WHERE transaction_date >= '2025-05-09' AND transaction_date <= '2025-12-31';

SELECT '=== Expense Breakdown ===' as section;
SELECT
  ec.name,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM financial_transactions ft
JOIN expense_categories ec ON ft.category_id = ec.id
WHERE ft.type = 'expense'
  AND ft.transaction_date >= '2025-05-09'
  AND ft.transaction_date <= '2025-12-31'
GROUP BY ec.name
ORDER BY total_amount DESC;

SELECT '=== Sample Transactions ===' as section;
SELECT transaction_date, type, amount, description
FROM financial_transactions
WHERE transaction_date >= '2025-05-09' AND transaction_date <= '2025-12-31'
ORDER BY transaction_date
LIMIT 10;
