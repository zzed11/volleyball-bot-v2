-- Delete ALL 2025 sample data (including Jan-Apr)
DELETE FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025;

-- Verify deletion
SELECT COUNT(*) as remaining_2025_transactions
FROM financial_transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025;
