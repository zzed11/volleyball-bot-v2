-- Clear existing 2025 sample data
DELETE FROM financial_transactions
WHERE transaction_date >= '2025-05-09' AND transaction_date <= '2025-12-31';

-- Insert actual 2025 income transactions
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-05-09', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-05-16', 'income', 60.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-05-23', 'income', 285.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-05-30', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-06-06', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-06-13', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-06-27', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-07-04', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-07-11', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-07-18', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-07-25', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-08-01', 'income', 255.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-08-08', 'income', 225.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-08-15', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-08-22', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-08-29', 'income', 225.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-09-05', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-09-12', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-09-19', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-09-26', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-03', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-10', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-17', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-22', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-24', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-29', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-10-31', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-05', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-07', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-12', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-14', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-19', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-21', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-26', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-11-28', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-03', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-05', 'income', 480.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-10', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-12', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-17', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-19', 'income', 270.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-24', 'income', 240.00, 'Weekly volleyball game income');
INSERT INTO financial_transactions (transaction_date, type, amount, description) VALUES ('2025-12-26', 'income', 270.00, 'Weekly volleyball game income');

-- Insert actual 2025 expense transactions
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-05-09', 'expense', 170.00, 2, 'Whistle and scoreboard');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-05-30', 'expense', 250.00, 1, 'Tournament Prizes');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-07-11', 'expense', 354.00, 3, 'Treats for players');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-08-29', 'expense', 547.00, 1, 'Tournament Prizes');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-10-22', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-10-29', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-11-05', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-11-12', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-11-19', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-11-21', 'expense', 265.00, 3, 'Treats for players');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-11-26', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-12-03', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-12-05', 'expense', 1100.00, 1, 'Tournament Prizes');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-12-10', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-12-17', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');
INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description) VALUES ('2025-12-24', 'expense', 250.00, 4, 'Hall cost in Kiryat yam');