-- Update imported players with generic volleyball statistics
-- This will make them visible in the player cards UI

-- Update players that have display_name but no full_name
UPDATE players
SET
  full_name = display_name,
  gender = CASE
    -- Female names (known patterns)
    WHEN display_name ILIKE '%Alina%' OR display_name ILIKE '%Elena%' OR display_name ILIKE '%Yulia%'
      OR display_name ILIKE '%Liya%' OR display_name ILIKE '%Maria%' OR display_name ILIKE '%Ирочка%'
      OR display_name ILIKE '%Карина%' OR display_name ILIKE '%אולגה%' OR display_name ILIKE '%אלינה%'
      OR display_name ILIKE '%אניה%' THEN 'female'
    -- Default to male for ambiguous/unknown names
    ELSE 'male'
  END,
  -- Generic skill ratings with slight variation (75-82 range)
  attack_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  reception_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  block_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  setting_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  serve_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  physical_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  mentality_rating = 75 + (FLOOR(RANDOM() * 8))::INTEGER,
  -- Default position as universal (flexible player)
  best_position = 'universal',
  secondary_position = NULL,
  preferred_side = 'no_preference',
  experience_years = NULL,
  height_cm = NULL,
  notes = 'Generic stats - needs detailed assessment'
WHERE display_name IS NOT NULL
  AND full_name IS NULL;

-- Show summary of updated players
SELECT
  COUNT(*) as total_updated,
  COUNT(CASE WHEN gender = 'male' THEN 1 END) as males,
  COUNT(CASE WHEN gender = 'female' THEN 1 END) as females
FROM players
WHERE full_name IS NOT NULL;
