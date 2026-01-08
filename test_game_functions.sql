-- Test the new SQL functions

-- Test 1: Get next available Friday from today
SELECT get_next_available_friday() as next_friday_from_today;

-- Test 2: Get next available Friday from a specific date
SELECT get_next_available_friday('2025-01-08') as next_friday_from_jan8;

-- Test 3: Check player participation stats view
SELECT * FROM player_participation_stats LIMIT 5;

-- Test 4: Check if tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('team_templates', 'team_template_members', 'game_rosters', 'game_roster_players', 'game_feedback', 'player_performance_notes')
ORDER BY table_name;
