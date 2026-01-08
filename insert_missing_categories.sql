-- Insert missing expense categories
INSERT INTO expense_categories (id, name, description, is_active) VALUES
  (2, 'Whistle and Scoreboard', 'Referee equipment and scoreboard', true),
  (3, 'Treats for Players', 'Snacks and treats for players', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Verify all categories
SELECT * FROM expense_categories ORDER BY id;
