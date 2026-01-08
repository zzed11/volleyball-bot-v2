-- Financial Management System
-- Tables for tracking income, expenses, budget, and forecasts

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories from the Excel
INSERT INTO expense_categories (name, description) VALUES
  ('Tournament Prizes', 'Prizes for tournament winners'),
  ('Whistle and Scoreboard', 'Referee equipment and scoreboard'),
  ('Treats for Players', 'Snacks and treats for players'),
  ('Hall Costs', 'Venue rental costs'),
  ('Equipment', 'General sports equipment'),
  ('Trainer', 'Professional trainer fees'),
  ('Other', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

-- Financial transactions (income and expenses)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  game_id INTEGER REFERENCES game_schedule(id) ON DELETE SET NULL,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget items (planned income and expenses)
CREATE TABLE IF NOT EXISTS budget_items (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  frequency VARCHAR(50), -- 'weekly', 'monthly', 'yearly', 'one-time'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial forecasts
CREATE TABLE IF NOT EXISTS financial_forecasts (
  id SERIAL PRIMARY KEY,
  forecast_date DATE NOT NULL,
  forecast_type VARCHAR(50) NOT NULL, -- 'cash_flow', 'income', 'expense'
  amount NUMERIC(10, 2) NOT NULL,
  confidence_level NUMERIC(3, 2), -- 0.00 to 1.00
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash flow summary view (similar to Excel cash flow sheet)
CREATE OR REPLACE VIEW cash_flow_summary AS
SELECT
  DATE_TRUNC('week', transaction_date) as week_start,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_cash_flow,
  SUM(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END))
    OVER (ORDER BY DATE_TRUNC('week', transaction_date)) as running_balance
FROM financial_transactions
GROUP BY DATE_TRUNC('week', transaction_date)
ORDER BY week_start;

-- P&L statement view (monthly aggregation)
CREATE OR REPLACE VIEW profit_loss_statement AS
SELECT
  DATE_TRUNC('month', transaction_date) as month,
  EXTRACT(YEAR FROM transaction_date) as year,
  EXTRACT(MONTH FROM transaction_date) as month_num,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as revenue,
  SUM(CASE WHEN type = 'expense' AND ec.name = 'Tournament Prizes' THEN amount ELSE 0 END) as tournament_prizes,
  SUM(CASE WHEN type = 'expense' AND ec.name = 'Hall Costs' THEN amount ELSE 0 END) as hall_costs,
  SUM(CASE WHEN type = 'expense' AND ec.name = 'Equipment' THEN amount ELSE 0 END) as equipment_costs,
  SUM(CASE WHEN type = 'expense' AND ec.name = 'Trainer' THEN amount ELSE 0 END) as trainer_costs,
  SUM(CASE WHEN type = 'expense' AND ec.name = 'Treats for Players' THEN amount ELSE 0 END) as treats_costs,
  SUM(CASE WHEN type = 'expense' AND ec.name NOT IN ('Tournament Prizes', 'Hall Costs', 'Equipment', 'Trainer', 'Treats for Players') THEN amount ELSE 0 END) as other_expenses,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_profit
FROM financial_transactions ft
LEFT JOIN expense_categories ec ON ft.category_id = ec.id
GROUP BY DATE_TRUNC('month', transaction_date), EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
ORDER BY month DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_game ON financial_transactions(game_id);
CREATE INDEX IF NOT EXISTS idx_budget_year ON budget_items(year);
CREATE INDEX IF NOT EXISTS idx_forecast_date ON financial_forecasts(forecast_date);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_transactions_timestamp
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();

CREATE TRIGGER update_budget_timestamp
  BEFORE UPDATE ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();
