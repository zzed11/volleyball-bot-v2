-- Migration 003: Extend players table for volley-balance functionality
-- Run after 002_payments_and_forecast.sql
-- This migration adds volleyball-specific fields to support team balancing features

BEGIN;

-- Add volleyball-specific fields to existing players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
  ADD COLUMN IF NOT EXISTS overall_rating INTEGER,
  ADD COLUMN IF NOT EXISTS best_position VARCHAR(20),
  ADD COLUMN IF NOT EXISTS secondary_position VARCHAR(20),
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS height_cm INTEGER,
  ADD COLUMN IF NOT EXISTS preferred_side VARCHAR(20) DEFAULT 'no_preference',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add check constraints for enums (using DO blocks to check if constraint exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_gender') THEN
        ALTER TABLE players ADD CONSTRAINT check_gender
          CHECK (gender IS NULL OR gender IN ('male', 'female'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_best_position') THEN
        ALTER TABLE players ADD CONSTRAINT check_best_position
          CHECK (best_position IS NULL OR best_position IN
            ('setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'universal'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_secondary_position') THEN
        ALTER TABLE players ADD CONSTRAINT check_secondary_position
          CHECK (secondary_position IS NULL OR secondary_position IN
            ('setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'universal'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_preferred_side') THEN
        ALTER TABLE players ADD CONSTRAINT check_preferred_side
          CHECK (preferred_side IS NULL OR preferred_side IN ('left', 'right', 'no_preference'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_overall_rating_range') THEN
        ALTER TABLE players ADD CONSTRAINT check_overall_rating_range
          CHECK (overall_rating IS NULL OR (overall_rating >= 70 AND overall_rating <= 99));
    END IF;
END $$;

-- Create indexes for volleyball queries
CREATE INDEX IF NOT EXISTS idx_players_overall_rating ON players(overall_rating);
CREATE INDEX IF NOT EXISTS idx_players_best_position ON players(best_position);
CREATE INDEX IF NOT EXISTS idx_players_gender ON players(gender);
CREATE INDEX IF NOT EXISTS idx_players_full_name ON players(full_name);

-- Allow players to exist without Telegram linkage (for volley-balance standalone players)
-- Check if the column has NOT NULL constraint before trying to drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'players'
          AND column_name = 'telegram_user_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE players ALTER COLUMN telegram_user_id DROP NOT NULL;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN players.telegram_user_id IS 'Telegram user ID (NULL for standalone volleyball players)';
COMMENT ON COLUMN players.full_name IS 'Full name for volleyball roster (may differ from display_name)';
COMMENT ON COLUMN players.gender IS 'Player gender (male/female) for team balancing';
COMMENT ON COLUMN players.overall_rating IS 'Volleyball skill rating (70-99, higher is better)';
COMMENT ON COLUMN players.best_position IS 'Primary volleyball position';
COMMENT ON COLUMN players.secondary_position IS 'Secondary volleyball position (optional)';
COMMENT ON COLUMN players.experience_years IS 'Years of volleyball experience';
COMMENT ON COLUMN players.height_cm IS 'Player height in centimeters';
COMMENT ON COLUMN players.preferred_side IS 'Preferred court side (left/right/no_preference)';
COMMENT ON COLUMN players.notes IS 'Additional notes about the player';
COMMENT ON TABLE players IS 'Unified players table supporting both Telegram bot users and standalone volleyball roster';

COMMIT;
