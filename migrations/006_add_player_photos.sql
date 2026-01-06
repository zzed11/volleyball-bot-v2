-- Add photo_url column to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_players_photo_url ON players(photo_url) WHERE photo_url IS NOT NULL;

-- Update the players_with_overall view to include photo_url
DROP VIEW IF EXISTS players_with_overall;

CREATE VIEW players_with_overall AS
SELECT
  id,
  full_name,
  gender,
  attack_rating,
  reception_rating,
  block_rating,
  setting_rating,
  serve_rating,
  physical_rating,
  mentality_rating,
  calculate_overall_rating(
    attack_rating,
    reception_rating,
    block_rating,
    setting_rating,
    serve_rating,
    physical_rating,
    mentality_rating
  ) as overall_rating,
  best_position,
  secondary_position,
  experience_years,
  height_cm,
  preferred_side,
  notes,
  photo_url,
  created_at,
  updated_at
FROM players
WHERE full_name IS NOT NULL;
