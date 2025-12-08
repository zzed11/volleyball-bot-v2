-- Migration 002: Add payments and budget tracking
-- Run after init.sql

-- Extend game_schedule with budget fields
ALTER TABLE game_schedule
  ADD COLUMN IF NOT EXISTS price_per_player NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_players INTEGER,
  ADD COLUMN IF NOT EXISTS expected_budget NUMERIC(10,2);

-- Create event_payments table
CREATE TABLE IF NOT EXISTS event_payments (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game_schedule(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount NUMERIC(8,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ILS',
  paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
  method VARCHAR(20) DEFAULT 'paybox',      -- 'paybox', 'cash', 'bank_transfer', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',  -- 'pending', 'confirmed', 'refunded'
  external_payment_id VARCHAR(100),         -- Optional PayBox reference
  external_provider VARCHAR(20) DEFAULT 'paybox',
  notes TEXT,                               -- Optional admin notes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_game_player_payment UNIQUE (game_id, player_id),
  CONSTRAINT check_payment_status CHECK (status IN ('pending', 'confirmed', 'refunded')),
  CONSTRAINT check_amount_positive CHECK (amount >= 0)
);

CREATE INDEX idx_event_payments_game_id ON event_payments(game_id);
CREATE INDEX idx_event_payments_player_id ON event_payments(player_id);
CREATE INDEX idx_event_payments_status ON event_payments(status);
CREATE INDEX idx_event_payments_paid_at ON event_payments(paid_at);

-- Create budget cache table (optional for performance)
CREATE TABLE IF NOT EXISTS budget_cache (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game_schedule(id) ON DELETE CASCADE UNIQUE,
  expected_income NUMERIC(10,2),
  actual_income NUMERIC(10,2),
  number_of_payers INTEGER,
  expected_players INTEGER,
  registered_players INTEGER,
  paid_players_list JSONB,
  unpaid_players_list JSONB,
  computed_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_game_budget UNIQUE (game_id)
);

CREATE INDEX idx_budget_cache_game_id ON budget_cache(game_id);
CREATE INDEX idx_budget_cache_computed_at ON budget_cache(computed_at);

-- Create forecast cache table
CREATE TABLE IF NOT EXISTS forecast_cache (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game_schedule(id) ON DELETE CASCADE,
  forecasted_players INTEGER,
  forecasted_income NUMERIC(10,2),
  confidence_level VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high'
  method VARCHAR(50) DEFAULT 'historical_average',
  metadata JSONB,                          -- Store calculation details
  computed_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_game_forecast UNIQUE (game_id)
);

CREATE INDEX idx_forecast_cache_game_id ON forecast_cache(game_id);
CREATE INDEX idx_forecast_cache_computed_at ON forecast_cache(computed_at);

-- Add trigger for event_payments updated_at
CREATE TRIGGER update_event_payments_updated_at BEFORE UPDATE ON event_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for quick payment summary
CREATE OR REPLACE VIEW payment_summary AS
SELECT
  gs.id AS game_id,
  gs.game_date,
  gs.location,
  gs.price_per_player,
  gs.max_players,
  gs.expected_budget,
  COUNT(DISTINCT ep.id) FILTER (WHERE ep.status = 'confirmed') AS paid_count,
  COALESCE(SUM(ep.amount) FILTER (WHERE ep.status = 'confirmed'), 0) AS total_collected,
  gs.price_per_player * gs.max_players AS potential_income
FROM game_schedule gs
LEFT JOIN event_payments ep ON gs.id = ep.game_id
GROUP BY gs.id, gs.game_date, gs.location, gs.price_per_player, gs.max_players, gs.expected_budget;

-- View for unpaid players (players who responded to poll but haven't paid)
CREATE OR REPLACE VIEW unpaid_players_view AS
SELECT DISTINCT
  pv.poll_id,
  p.poll_type,
  p.game_id,
  pv.user_id,
  pl.username,
  pl.display_name,
  gs.price_per_player
FROM poll_votes pv
JOIN polls p ON pv.poll_id = p.poll_id
JOIN game_schedule gs ON p.game_id = gs.id
LEFT JOIN players pl ON pv.user_id = pl.telegram_user_id
LEFT JOIN event_payments ep ON (ep.game_id = gs.id AND ep.player_id = pl.id)
WHERE p.poll_type = 'game'
  AND pv.option_id = 0  -- Assuming option 0 is "I'm in!"
  AND (ep.id IS NULL OR ep.status != 'confirmed');

-- First, alter the check constraint to allow 'analytics' job type
ALTER TABLE job_definitions DROP CONSTRAINT IF EXISTS check_job_type;
ALTER TABLE job_definitions ADD CONSTRAINT check_job_type
  CHECK (job_type IN ('trivia', 'game_poll', 'notification', 'analytics'));

-- Insert budget analytics job definition
INSERT INTO job_definitions (name, description, job_type, is_active) VALUES
  ('budget_analytics', 'Precompute budget and forecast metrics for upcoming games', 'analytics', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert schedule for budget analytics (daily at 6am)
INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 6 * * *', 'America/New_York', TRUE
FROM job_definitions
WHERE name = 'budget_analytics'
ON CONFLICT DO NOTHING;

COMMIT;

-- Sample data for testing (commented out - uncomment if needed)
-- UPDATE game_schedule SET price_per_player = 50.00, max_players = 18 WHERE id = 1;
-- INSERT INTO event_payments (game_id, player_id, amount, currency, method, status)
-- VALUES (1, 1, 50.00, 'ILS', 'paybox', 'confirmed');
