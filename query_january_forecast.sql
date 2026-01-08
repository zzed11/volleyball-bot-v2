-- January 2026 Forecast Query
-- Get game schedule, budget, and financial forecast for January 2026

\echo '=== JANUARY 2026 GAME SCHEDULE ==='
SELECT
  id,
  game_date,
  location,
  description,
  price_per_player,
  max_players,
  expected_budget,
  notified
FROM game_schedule
WHERE game_date >= '2026-01-01' AND game_date < '2026-02-01'
ORDER BY game_date;

\echo ''
\echo '=== BUDGET CACHE FOR JANUARY GAMES ==='
SELECT
  gs.game_date,
  gs.location,
  bc.expected_income,
  bc.actual_income,
  bc.expected_players,
  bc.registered_players,
  bc.number_of_payers,
  bc.computed_at
FROM budget_cache bc
JOIN game_schedule gs ON bc.game_id = gs.id
WHERE gs.game_date >= '2026-01-01' AND gs.game_date < '2026-02-01'
ORDER BY gs.game_date;

\echo ''
\echo '=== FORECAST CACHE FOR JANUARY GAMES ==='
SELECT
  gs.game_date,
  gs.location,
  fc.forecasted_players,
  fc.forecasted_income,
  fc.confidence_level,
  fc.method,
  fc.computed_at
FROM forecast_cache fc
JOIN game_schedule gs ON fc.game_id = gs.id
WHERE gs.game_date >= '2026-01-01' AND gs.game_date < '2026-02-01'
ORDER BY gs.game_date;

\echo ''
\echo '=== PAYMENT SUMMARY FOR JANUARY ==='
SELECT
  gs.game_date,
  gs.location,
  COUNT(ep.id) as total_payments,
  SUM(ep.amount) as total_amount,
  COUNT(CASE WHEN ep.status = 'confirmed' THEN 1 END) as confirmed_payments,
  COUNT(CASE WHEN ep.status = 'pending' THEN 1 END) as pending_payments
FROM game_schedule gs
LEFT JOIN event_payments ep ON gs.id = ep.game_id
WHERE gs.game_date >= '2026-01-01' AND gs.game_date < '2026-02-01'
GROUP BY gs.id, gs.game_date, gs.location
ORDER BY gs.game_date;

\echo ''
\echo '=== JANUARY TOTALS ==='
SELECT
  COUNT(DISTINCT gs.id) as total_games,
  SUM(gs.price_per_player * COALESCE(gs.max_players, 10)) as potential_revenue,
  SUM(bc.actual_income) as actual_income,
  SUM(fc.forecasted_income) as forecasted_income,
  AVG(fc.forecasted_players) as avg_forecasted_players
FROM game_schedule gs
LEFT JOIN budget_cache bc ON gs.id = bc.game_id
LEFT JOIN forecast_cache fc ON gs.id = fc.game_id
WHERE gs.game_date >= '2026-01-01' AND gs.game_date < '2026-02-01';
