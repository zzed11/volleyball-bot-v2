-- Migration 008: Game Scheduling, Team Templates, and Feedback System
-- Comprehensive game management with support for both templates and one-off rosters

BEGIN;

-- 1. EXTEND GAME_SCHEDULE TABLE
-- Add status tracking and game completion features
ALTER TABLE game_schedule
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS court_name VARCHAR(100);

-- Add unique constraint: one game per Friday
CREATE UNIQUE INDEX idx_game_schedule_unique_friday
  ON game_schedule (DATE_TRUNC('day', game_date))
  WHERE status NOT IN ('cancelled');

-- 2. TEAM TEMPLATES TABLE
-- Reusable team configurations that can be used across multiple games
CREATE TABLE IF NOT EXISTS team_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by_user_id INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_templates_name ON team_templates(name);
CREATE INDEX idx_team_templates_is_active ON team_templates(is_active);

-- 3. TEAM TEMPLATE MEMBERS
-- Players assigned to each template
CREATE TABLE IF NOT EXISTS team_template_members (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES team_templates(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position_in_team INTEGER CHECK (position_in_team BETWEEN 1 AND 6),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, player_id)
);

CREATE INDEX idx_template_members_template_id ON team_template_members(template_id);
CREATE INDEX idx_template_members_player_id ON team_template_members(player_id);

-- 4. GAME ROSTERS (ACTUAL TEAM ASSIGNMENTS PER GAME)
-- Links games to specific team configurations (can use templates or be one-off)
CREATE TABLE IF NOT EXISTS game_rosters (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game_schedule(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL CHECK (team_number IN (1, 2, 3)),
  team_name VARCHAR(50) NOT NULL,
  template_id INTEGER REFERENCES team_templates(id) ON DELETE SET NULL,
  average_rating NUMERIC(5,2),
  female_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_id, team_number)
);

CREATE INDEX idx_game_rosters_game_id ON game_rosters(game_id);
CREATE INDEX idx_game_rosters_template_id ON game_rosters(template_id);

-- 5. GAME ROSTER PLAYERS
-- Individual player assignments to teams for a specific game
CREATE TABLE IF NOT EXISTS game_roster_players (
  id SERIAL PRIMARY KEY,
  roster_id INTEGER NOT NULL REFERENCES game_rosters(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position_in_team INTEGER CHECK (position_in_team BETWEEN 1 AND 6),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(roster_id, player_id)
);

CREATE INDEX idx_roster_players_roster_id ON game_roster_players(roster_id);
CREATE INDEX idx_roster_players_player_id ON game_roster_players(player_id);
CREATE INDEX idx_roster_players_game_lookup ON game_roster_players(roster_id, player_id);

-- 6. GAME FEEDBACK
-- Post-game feedback collection (only after game completion)
CREATE TABLE IF NOT EXISTS game_feedback (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game_schedule(id) ON DELETE CASCADE,
  submitted_by_user_id INTEGER,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  balance_rating INTEGER CHECK (balance_rating BETWEEN 1 AND 5),
  fun_rating INTEGER CHECK (fun_rating BETWEEN 1 AND 5),
  comments TEXT,
  would_play_again BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_feedback_game_id ON game_feedback(game_id);
CREATE INDEX idx_game_feedback_created_at ON game_feedback(created_at);

-- 7. PLAYER PERFORMANCE NOTES (Optional detailed feedback)
CREATE TABLE IF NOT EXISTS player_performance_notes (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER NOT NULL REFERENCES game_feedback(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(feedback_id, player_id)
);

CREATE INDEX idx_performance_notes_feedback_id ON player_performance_notes(feedback_id);
CREATE INDEX idx_performance_notes_player_id ON player_performance_notes(player_id);

-- 8. DATABASE VIEWS FOR ANALYTICS

-- Game summary view with roster counts
CREATE OR REPLACE VIEW game_summary_view AS
SELECT
  gs.id,
  gs.game_date,
  gs.location,
  gs.status,
  gs.price_per_player,
  gs.max_players,
  gs.completed_at,
  gs.auto_completed,
  COUNT(DISTINCT grp.player_id) as total_players,
  COUNT(DISTINCT gr.id) as team_count,
  AVG(CASE WHEN gf.overall_rating IS NOT NULL THEN gf.overall_rating END) as avg_feedback_rating,
  COUNT(DISTINCT gf.id) as feedback_count
FROM game_schedule gs
LEFT JOIN game_rosters gr ON gs.id = gr.game_id
LEFT JOIN game_roster_players grp ON gr.id = grp.roster_id
LEFT JOIN game_feedback gf ON gs.id = gf.game_id
GROUP BY gs.id;

-- Player participation analytics view
CREATE OR REPLACE VIEW player_participation_stats AS
SELECT
  p.id as player_id,
  p.full_name,
  p.gender,
  p.overall_rating,
  p.best_position,
  COUNT(DISTINCT grp.roster_id) as games_played,
  COUNT(DISTINCT CASE WHEN gs.status = 'completed' THEN grp.roster_id END) as completed_games,
  AVG(gr.average_rating) as avg_team_rating,
  MIN(gs.game_date) as first_game_date,
  MAX(gs.game_date) as last_game_date
FROM players_with_overall p
LEFT JOIN game_roster_players grp ON p.id = grp.player_id
LEFT JOIN game_rosters gr ON grp.roster_id = gr.id
LEFT JOIN game_schedule gs ON gr.game_id = gs.id
WHERE p.full_name IS NOT NULL
GROUP BY p.id, p.full_name, p.gender, p.overall_rating, p.best_position;

-- Team balance comparison view (for a specific game)
CREATE OR REPLACE VIEW game_team_balance_view AS
SELECT
  gr.game_id,
  gr.team_number,
  gr.team_name,
  gr.average_rating,
  gr.female_count,
  COUNT(grp.id) as player_count,
  STRING_AGG(p.full_name, ', ' ORDER BY grp.position_in_team) as player_names,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'player_id', p.id,
      'name', p.full_name,
      'rating', p.overall_rating,
      'position', p.best_position,
      'gender', p.gender
    ) ORDER BY grp.position_in_team
  ) as players_detail
FROM game_rosters gr
LEFT JOIN game_roster_players grp ON gr.id = grp.roster_id
LEFT JOIN players_with_overall p ON grp.player_id = p.id
GROUP BY gr.id, gr.game_id, gr.team_number, gr.team_name, gr.average_rating, gr.female_count;

-- 9. TRIGGERS

-- Check if function exists before creating trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- Auto-update updated_at for team_templates
    DROP TRIGGER IF EXISTS update_team_templates_updated_at ON team_templates;
    CREATE TRIGGER update_team_templates_updated_at
      BEFORE UPDATE ON team_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Auto-update updated_at for game_feedback
    DROP TRIGGER IF EXISTS update_game_feedback_updated_at ON game_feedback;
    CREATE TRIGGER update_game_feedback_updated_at
      BEFORE UPDATE ON game_feedback
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  ELSE
    RAISE NOTICE 'Function update_updated_at_column does not exist. Skipping trigger creation.';
  END IF;
END $$;

-- 10. HELPER FUNCTION: Get next available Friday
CREATE OR REPLACE FUNCTION get_next_available_friday(from_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
DECLARE
  next_friday DATE;
  is_available BOOLEAN;
BEGIN
  -- Calculate next Friday (5 = Friday in DOW)
  next_friday := from_date + ((5 - EXTRACT(DOW FROM from_date)::INTEGER + 7) % 7)::INTEGER;

  -- If calculated date is today and today is Friday, use it
  -- Otherwise, if calculated date is in the past, add 7 days
  IF next_friday < from_date THEN
    next_friday := next_friday + 7;
  END IF;

  -- Check if Friday is available (no existing planned/in_progress games)
  LOOP
    SELECT NOT EXISTS(
      SELECT 1 FROM game_schedule
      WHERE DATE_TRUNC('day', game_date) = next_friday
        AND status NOT IN ('cancelled')
    ) INTO is_available;

    IF is_available THEN
      EXIT;
    END IF;

    -- Try next Friday
    next_friday := next_friday + 7;
  END LOOP;

  RETURN next_friday;
END;
$$ LANGUAGE plpgsql;

-- 11. HELPER FUNCTION: Auto-complete past games
CREATE OR REPLACE FUNCTION auto_complete_past_games()
RETURNS TABLE(game_id INTEGER, game_date TIMESTAMP) AS $$
BEGIN
  RETURN QUERY
  UPDATE game_schedule
  SET
    status = 'completed',
    completed_at = NOW(),
    auto_completed = TRUE
  WHERE
    status = 'planned'
    AND game_date < CURRENT_DATE
  RETURNING id, game_schedule.game_date;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Test queries (commented out, run manually after migration)
-- SELECT get_next_available_friday();
-- SELECT get_next_available_friday('2025-01-08');
-- SELECT * FROM auto_complete_past_games();
-- SELECT * FROM player_participation_stats LIMIT 10;
