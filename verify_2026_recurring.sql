-- Verify 2026 recurring transactions
SELECT '=== 2026 Summary ===' as section;
SELECT
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN EXTRACT(DOW FROM transaction_date) = 5 THEN 1 END) as friday_count,
  COUNT(CASE WHEN EXTRACT(DOW FROM transaction_date) = 3 THEN 1 END) as wednesday_count,
  SUM(amount) as total_income,
  MIN(transaction_date) as first_game,
  MAX(transaction_date) as last_game
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2026;

SELECT '=== Monthly Breakdown ===' as section;
SELECT
  TO_CHAR(transaction_date, 'Month YYYY') as month,
  COUNT(*) as games,
  SUM(amount) as income
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2026
GROUP BY DATE_TRUNC('month', transaction_date), TO_CHAR(transaction_date, 'Month YYYY')
ORDER BY DATE_TRUNC('month', transaction_date);

SELECT '=== First 10 Games ===' as section;
SELECT transaction_date, TO_CHAR(transaction_date, 'Day') as day_name, amount, description
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2026
ORDER BY transaction_date
LIMIT 10;
