-- Query all games in database

\echo '=== ALL SCHEDULED GAMES ==='
SELECT
  id,
  game_date,
  location,
  description,
  price_per_player,
  max_players,
  expected_budget,
  notified,
  created_at
FROM game_schedule
ORDER BY game_date DESC
LIMIT 20;

\echo ''
\echo '=== TOTAL GAMES COUNT ==='
SELECT COUNT(*) as total_games FROM game_schedule;

\echo ''
\echo '=== GAMES BY MONTH ==='
SELECT
  TO_CHAR(game_date, 'YYYY-MM') as month,
  COUNT(*) as games_count,
  SUM(price_per_player * COALESCE(max_players, 10)) as potential_revenue
FROM game_schedule
GROUP BY TO_CHAR(game_date, 'YYYY-MM')
ORDER BY month DESC;
