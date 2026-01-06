-- Add detailed volleyball attributes to players table
-- Drop overall_rating as it will be calculated from individual skills

ALTER TABLE players
  -- Remove simple overall_rating (will be calculated)
  DROP COLUMN IF EXISTS overall_rating,
  
  -- Technical Skills (70-99 scale)
  ADD COLUMN IF NOT EXISTS attack_rating INTEGER CHECK (attack_rating >= 70 AND attack_rating <= 99),
  ADD COLUMN IF NOT EXISTS reception_rating INTEGER CHECK (reception_rating >= 70 AND reception_rating <= 99),
  ADD COLUMN IF NOT EXISTS block_rating INTEGER CHECK (block_rating >= 70 AND block_rating <= 99),
  ADD COLUMN IF NOT EXISTS setting_rating INTEGER CHECK (setting_rating >= 70 AND setting_rating <= 99),
  ADD COLUMN IF NOT EXISTS serve_rating INTEGER CHECK (serve_rating >= 70 AND serve_rating <= 99),
  
  -- Physical & Mental Attributes (70-99 scale)
  ADD COLUMN IF NOT EXISTS physical_rating INTEGER CHECK (physical_rating >= 70 AND physical_rating <= 99),
  ADD COLUMN IF NOT EXISTS mentality_rating INTEGER CHECK (mentality_rating >= 70 AND mentality_rating <= 99);

-- Create a function to calculate overall rating
CREATE OR REPLACE FUNCTION calculate_overall_rating(
  attack INTEGER,
  reception INTEGER,
  block INTEGER,
  setting INTEGER,
  serve INTEGER,
  physical INTEGER,
  mentality INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- Weighted average based on volleyball trainer perspective:
  -- Attack: 20% (offensive power)
  -- Reception: 20% (defensive foundation)
  -- Block: 15% (defensive presence)
  -- Setting: 15% (playmaking)
  -- Serve: 15% (scoring weapon)
  -- Physical: 10% (athleticism)
  -- Mentality: 5% (consistency & clutch)
  
  RETURN ROUND(
    (attack * 0.20) +
    (reception * 0.20) +
    (block * 0.15) +
    (setting * 0.15) +
    (serve * 0.15) +
    (physical * 0.10) +
    (mentality * 0.05)
  );
END;
$$ LANGUAGE plpgsql;

-- Create a view that includes calculated overall rating
CREATE OR REPLACE VIEW players_with_overall AS
SELECT 
  p.*,
  calculate_overall_rating(
    COALESCE(p.attack_rating, 75),
    COALESCE(p.reception_rating, 75),
    COALESCE(p.block_rating, 75),
    COALESCE(p.setting_rating, 75),
    COALESCE(p.serve_rating, 75),
    COALESCE(p.physical_rating, 75),
    COALESCE(p.mentality_rating, 75)
  ) as overall_rating
FROM players p;

COMMENT ON COLUMN players.attack_rating IS 'Attacking ability: spiking power, accuracy, variety (70-99)';
COMMENT ON COLUMN players.reception_rating IS 'Reception/Passing ability: serve receive, dig accuracy (70-99)';
COMMENT ON COLUMN players.block_rating IS 'Blocking ability: timing, reach, reading (70-99)';
COMMENT ON COLUMN players.setting_rating IS 'Setting ability: accuracy, decision making, tempo (70-99)';
COMMENT ON COLUMN players.serve_rating IS 'Serving ability: power, accuracy, variety (70-99)';
COMMENT ON COLUMN players.physical_rating IS 'Physical attributes: speed, jump, endurance, strength (70-99)';
COMMENT ON COLUMN players.mentality_rating IS 'Mental strength: focus, clutch performance, team spirit (70-99)';
