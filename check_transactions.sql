-- Check transaction counts
SELECT
  'Total transactions' as metric,
  COUNT(*) as count
FROM financial_transactions
UNION ALL
SELECT
  'Transactions in 2026',
  COUNT(*)
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2026
UNION ALL
SELECT
  'Transactions in 2025',
  COUNT(*)
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025;

-- Sample transactions to verify data
SELECT
  id,
  transaction_date,
  type,
  amount,
  description
FROM financial_transactions
ORDER BY transaction_date DESC
LIMIT 10;
