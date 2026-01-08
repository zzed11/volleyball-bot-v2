-- Sample Cash Flow Data for 2025-2026
-- Insert sample financial transactions to demonstrate the Cash Flow page

-- Delete existing sample data (optional - uncomment if you want to start fresh)
-- DELETE FROM financial_transactions;

-- January 2025 - Week 1
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-01-06', 'income', 1200.00, 'Player payments - Week 1'),
  ('2025-01-08', 'expense', 400.00, 'Hall rental'),
  ('2025-01-10', 'expense', 150.00, 'Equipment maintenance');

-- January 2025 - Week 2
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-01-13', 'income', 1350.00, 'Player payments - Week 2'),
  ('2025-01-15', 'expense', 400.00, 'Hall rental'),
  ('2025-01-17', 'expense', 100.00, 'Refreshments');

-- January 2025 - Week 3
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-01-20', 'income', 1400.00, 'Player payments - Week 3'),
  ('2025-01-22', 'expense', 400.00, 'Hall rental'),
  ('2025-01-24', 'expense', 200.00, 'New volleyball balls');

-- January 2025 - Week 4
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-01-27', 'income', 1250.00, 'Player payments - Week 4'),
  ('2025-01-29', 'expense', 400.00, 'Hall rental'),
  ('2025-01-31', 'expense', 500.00, 'Tournament prizes');

-- February 2025 - Week 1
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-02-03', 'income', 1300.00, 'Player payments - Week 1'),
  ('2025-02-05', 'expense', 400.00, 'Hall rental');

-- February 2025 - Week 2
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-02-10', 'income', 1450.00, 'Player payments - Week 2'),
  ('2025-02-12', 'expense', 400.00, 'Hall rental'),
  ('2025-02-14', 'expense', 150.00, 'Treats for players');

-- February 2025 - Week 3
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-02-17', 'income', 1350.00, 'Player payments - Week 3'),
  ('2025-02-19', 'expense', 400.00, 'Hall rental'),
  ('2025-02-21', 'expense', 300.00, 'Professional trainer session');

-- March 2025 - Week 1
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-03-03', 'income', 1500.00, 'Player payments - Week 1'),
  ('2025-03-05', 'expense', 400.00, 'Hall rental');

-- March 2025 - Week 2
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-03-10', 'income', 1400.00, 'Player payments - Week 2'),
  ('2025-03-12', 'expense', 400.00, 'Hall rental'),
  ('2025-03-14', 'expense', 250.00, 'Whistle and scoreboard');

-- March 2025 - Week 3
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-03-17', 'income', 1550.00, 'Player payments - Week 3'),
  ('2025-03-19', 'expense', 400.00, 'Hall rental'),
  ('2025-03-21', 'expense', 800.00, 'Tournament prizes');

-- March 2025 - Week 4
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-03-24', 'income', 1300.00, 'Player payments - Week 4'),
  ('2025-03-26', 'expense', 400.00, 'Hall rental');

-- April 2025 - Week 1
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-04-07', 'income', 1600.00, 'Player payments - Week 1'),
  ('2025-04-09', 'expense', 450.00, 'Hall rental (premium slot)');

-- April 2025 - Week 2
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2025-04-14', 'income', 1450.00, 'Player payments - Week 2'),
  ('2025-04-16', 'expense', 400.00, 'Hall rental'),
  ('2025-04-18', 'expense', 200.00, 'Equipment');

-- 2026 Data - January
INSERT INTO financial_transactions (transaction_date, type, amount, description)
VALUES
  ('2026-01-05', 'income', 1700.00, 'Player payments - Week 1'),
  ('2026-01-07', 'expense', 450.00, 'Hall rental'),
  ('2026-01-12', 'income', 1650.00, 'Player payments - Week 2'),
  ('2026-01-14', 'expense', 450.00, 'Hall rental'),
  ('2026-01-16', 'expense', 350.00, 'New equipment'),
  ('2026-01-19', 'income', 1750.00, 'Player payments - Week 3'),
  ('2026-01-21', 'expense', 450.00, 'Hall rental'),
  ('2026-01-26', 'income', 1600.00, 'Player payments - Week 4'),
  ('2026-01-28', 'expense', 450.00, 'Hall rental'),
  ('2026-01-30', 'expense', 1000.00, 'Special tournament prizes');

-- Display summary
SELECT
  'Cash Flow Data Loaded Successfully!' as status,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance
FROM financial_transactions;

-- Show weekly summary
SELECT * FROM cash_flow_summary ORDER BY week_start DESC LIMIT 10;
