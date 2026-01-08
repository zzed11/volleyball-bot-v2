-- Verify that transaction data flows through to all views

-- 1. Check current transactions for January 2026
SELECT '=== TRANSACTIONS TABLE (Source) ===' as section;
SELECT
  id,
  transaction_date,
  TO_CHAR(transaction_date, 'Day') as day_name,
  type,
  amount,
  description
FROM financial_transactions
WHERE transaction_date >= '2026-01-01' AND transaction_date <= '2026-01-31'
ORDER BY transaction_date;

-- 2. Check Cash Flow Summary (calculated from transactions)
SELECT '=== CASH FLOW SUMMARY (Auto-calculated) ===' as section;
SELECT
  week_start,
  total_income,
  total_expenses,
  net_cash_flow,
  running_balance
FROM cash_flow_summary
WHERE EXTRACT(YEAR FROM week_start) = 2026
  AND EXTRACT(MONTH FROM week_start) = 1
ORDER BY week_start;

-- 3. Check P&L Statement (calculated from transactions)
SELECT '=== PROFIT & LOSS STATEMENT (Auto-calculated) ===' as section;
SELECT
  TO_CHAR(month, 'Month YYYY') as period,
  revenue as total_income,
  total_expenses,
  net_profit
FROM profit_loss_statement
WHERE year = 2026 AND month_num = 1
ORDER BY month;

-- 4. Summary counts
SELECT '=== DATA FLOW VERIFICATION ===' as section;
SELECT
  'Transactions' as source,
  COUNT(*) as count,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2026
  AND EXTRACT(MONTH FROM transaction_date) = 1;
