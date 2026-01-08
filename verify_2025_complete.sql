-- Get all 2025 transactions ordered by date
SELECT
  transaction_date,
  type,
  amount,
  COALESCE(category_name, 'N/A') as category,
  description
FROM (
  SELECT
    ft.transaction_date,
    ft.type,
    ft.amount,
    ec.name as category_name,
    ft.description
  FROM financial_transactions ft
  LEFT JOIN expense_categories ec ON ft.category_id = ec.id
  WHERE EXTRACT(YEAR FROM ft.transaction_date) = 2025
) sub
ORDER BY transaction_date, type DESC, amount DESC;

-- Summary by category
SELECT
  type,
  COALESCE(ec.name, 'No Category') as category,
  COUNT(*) as count,
  SUM(amount) as total
FROM financial_transactions ft
LEFT JOIN expense_categories ec ON ft.category_id = ec.id
WHERE EXTRACT(YEAR FROM ft.transaction_date) = 2025
GROUP BY type, ec.name
ORDER BY type, total DESC;
