-- Initial database schema for Volleyball Community Backend
-- Run this script to initialize the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  telegram_user_id BIGINT UNIQUE,
  username VARCHAR(64),
  display_name VARCHAR(100),
  skill_rating NUMERIC(4,1),
  preferred_position VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_players_telegram_user_id ON players(telegram_user_id);
CREATE INDEX idx_players_username ON players(username);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teams_name ON teams(name);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role VARCHAR(20),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, player_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_player_id ON team_members(player_id);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  team_home_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  team_away_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  match_date TIMESTAMP NOT NULL,
  court VARCHAR(50),
  status VARCHAR(20) DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_matches_match_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  poll_id VARCHAR(100) UNIQUE NOT NULL,
  poll_type VARCHAR(20) NOT NULL,
  day_of_week VARCHAR(10),
  title TEXT NOT NULL,
  questions JSONB,
  game_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  results JSONB,
  CONSTRAINT check_poll_type CHECK (poll_type IN ('trivia', 'game'))
);

CREATE INDEX idx_polls_poll_id ON polls(poll_id);
CREATE INDEX idx_polls_poll_type ON polls(poll_type);
CREATE INDEX idx_polls_created_at ON polls(created_at);
CREATE INDEX idx_polls_game_id ON polls(game_id);

-- Game schedule table
CREATE TABLE IF NOT EXISTS game_schedule (
  id SERIAL PRIMARY KEY,
  game_date TIMESTAMP NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_schedule_game_date ON game_schedule(game_date);
CREATE INDEX idx_game_schedule_notified ON game_schedule(notified);

-- Group members tracking table
CREATE TABLE IF NOT EXISTS group_members (
  user_id BIGINT NOT NULL,
  username VARCHAR(64),
  display_name VARCHAR(100),
  joined_at TIMESTAMP NOT NULL,
  left_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (user_id, joined_at),
  CONSTRAINT check_status CHECK (status IN ('active', 'left'))
);

CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_status ON group_members(status);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id VARCHAR(100) NOT NULL,
  user_id BIGINT NOT NULL,
  option_id INTEGER NOT NULL,
  voted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX idx_poll_votes_voted_at ON poll_votes(voted_at);

-- Job definitions table
CREATE TABLE IF NOT EXISTS job_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  job_type VARCHAR(30) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_job_type CHECK (job_type IN ('trivia', 'game_poll', 'notification'))
);

CREATE INDEX idx_job_definitions_name ON job_definitions(name);
CREATE INDEX idx_job_definitions_is_active ON job_definitions(is_active);

-- Job schedules table
CREATE TABLE IF NOT EXISTS job_schedules (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job_definitions(id) ON DELETE CASCADE,
  cron_expression VARCHAR(20) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_schedules_job_id ON job_schedules(job_id);
CREATE INDEX idx_job_schedules_next_run_at ON job_schedules(next_run_at);
CREATE INDEX idx_job_schedules_enabled ON job_schedules(enabled);

-- Job runs table
CREATE TABLE IF NOT EXISTS job_runs (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job_definitions(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('pending', 'running', 'success', 'failed'))
);

CREATE INDEX idx_job_runs_job_id ON job_runs(job_id);
CREATE INDEX idx_job_runs_status ON job_runs(status);
CREATE INDEX idx_job_runs_scheduled_time ON job_runs(scheduled_time);

-- Insert default job definitions
INSERT INTO job_definitions (name, description, job_type) VALUES
  ('trivia_tuesday', 'Tuesday trivia poll generation', 'trivia'),
  ('trivia_wednesday', 'Wednesday trivia poll generation', 'trivia'),
  ('game_poll_tuesday', 'Tuesday game attendance poll', 'game_poll'),
  ('game_poll_wednesday', 'Wednesday game attendance poll', 'game_poll'),
  ('notification_monday', 'Monday game notification', 'notification'),
  ('notification_thursday', 'Thursday game notification', 'notification')
ON CONFLICT (name) DO NOTHING;

-- Insert default schedules (using cron expressions)
-- Trivia on Tuesday and Wednesday at 10:00 AM
INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 10 * * 2', 'America/New_York', TRUE FROM job_definitions WHERE name = 'trivia_tuesday'
ON CONFLICT DO NOTHING;

INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 10 * * 3', 'America/New_York', TRUE FROM job_definitions WHERE name = 'trivia_wednesday'
ON CONFLICT DO NOTHING;

-- Game polls on Tuesday and Wednesday at 9:00 AM
INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 9 * * 2', 'America/New_York', TRUE FROM job_definitions WHERE name = 'game_poll_tuesday'
ON CONFLICT DO NOTHING;

INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 9 * * 3', 'America/New_York', TRUE FROM job_definitions WHERE name = 'game_poll_wednesday'
ON CONFLICT DO NOTHING;

-- Notifications on Monday and Thursday at 8:00 AM
INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 8 * * 1', 'America/New_York', TRUE FROM job_definitions WHERE name = 'notification_monday'
ON CONFLICT DO NOTHING;

INSERT INTO job_schedules (job_id, cron_expression, timezone, enabled)
SELECT id, '0 8 * * 4', 'America/New_York', TRUE FROM job_definitions WHERE name = 'notification_thursday'
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_schedule_updated_at BEFORE UPDATE ON game_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_definitions_updated_at BEFORE UPDATE ON job_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_schedules_updated_at BEFORE UPDATE ON job_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO volleyball_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO volleyball_app;

COMMIT;
