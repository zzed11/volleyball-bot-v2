# Payment Tracking and Budget Forecasting

This document describes the payment tracking and budget forecasting features added to the Volleyball Community Backend.

## Overview

The system now supports:

1. **Payment tracking** - Record who paid for each game
2. **Budget monitoring** - Track expected vs actual income
3. **Attendance forecasting** - Predict turnout and revenue
4. **Bot commands** - Query payment status and budgets
5. **Admin tools** - Mark players as paid/unpaid

## Database Schema

### Extended game_schedule Table

```sql
ALTER TABLE game_schedule
  ADD COLUMN price_per_player NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN max_players INTEGER,
  ADD COLUMN expected_budget NUMERIC(10,2);
```

### New event_payments Table

```sql
CREATE TABLE event_payments (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game_schedule(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  amount NUMERIC(8,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ILS',
  paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
  method VARCHAR(20) DEFAULT 'paybox',
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  external_payment_id VARCHAR(100),
  external_provider VARCHAR(20) DEFAULT 'paybox',
  notes TEXT,
  UNIQUE (game_id, player_id)
);
```

### Cache Tables

```sql
CREATE TABLE budget_cache (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL UNIQUE,
  expected_income NUMERIC(10,2),
  actual_income NUMERIC(10,2),
  number_of_payers INTEGER,
  paid_players_list JSONB,
  unpaid_players_list JSONB,
  computed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE forecast_cache (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL UNIQUE,
  forecasted_players INTEGER,
  forecasted_income NUMERIC(10,2),
  confidence_level VARCHAR(20) DEFAULT 'medium',
  method VARCHAR(50) DEFAULT 'historical_average',
  metadata JSONB,
  computed_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Payment Management

**Create Payment**
```http
POST /api/games/{game_id}/payments
Content-Type: application/json

{
  "player_id": 123,
  "amount": 50.00,
  "currency": "ILS",
  "method": "paybox",
  "status": "confirmed",
  "notes": "Paid via PayBox"
}
```

**Delete Payment** (mark as unpaid)
```http
DELETE /api/games/{game_id}/payments/{player_id}
```

**Update Payment**
```http
PATCH /api/games/{game_id}/payments/{player_id}
Content-Type: application/json

{
  "amount": 60.00,
  "status": "confirmed",
  "notes": "Updated amount"
}
```

### Budget Information

**Get Budget for Game**
```http
GET /api/games/{game_id}/budget
```

Response:
```json
{
  "game_id": 1,
  "game_date": "2024-03-15T18:00:00Z",
  "location": "Main Court",
  "price_per_player": 50.00,
  "max_players": 18,
  "expected_income": 900.00,
  "actual_income": 750.00,
  "number_of_payers": 15,
  "registered_players": 18,
  "paid_players": [...],
  "unpaid_players": [...]
}
```

### Forecast Information

**Get Forecast for Game**
```http
GET /api/games/{game_id}/forecast
```

Response:
```json
{
  "game_id": 1,
  "game_date": "2024-03-15T18:00:00Z",
  "forecasted_players": 16,
  "forecasted_income": 800.00,
  "confidence_level": "high",
  "method": "historical_average",
  "historical_data": {
    "historical_games_count": 8,
    "weekday": 2,
    "location": "Main Court"
  }
}
```

## Bot Commands

### User Commands

**See who paid**
```
/who_paid
```
Shows list of all players who have paid for today's game.

**See who hasn't paid**
```
/who_not_paid
```
Shows list of players who registered but haven't paid yet.

**Budget summary**
```
/budget_today
```
Shows complete budget breakdown for today's game:
- Expected vs actual income
- Number of paid/unpaid players
- Collection rate

**Forecast**
```
/forecast_today
```
Shows predicted attendance and revenue based on historical data.

### Admin Commands

**Mark player as paid**
```
/mark_paid @username 50.00
/mark_paid 123 @username 50.00  # Specify game_id
```

Creates a payment record. Amount defaults to `price_per_player` if not specified.

**Mark player as unpaid**
```
/mark_unpaid @username
/mark_unpaid 123 @username  # Specify game_id
```

Removes payment record for the player.

## Payment Workflow

### Current Process (No PayBox Integration)

1. **Players pay via PayBox app** (external, no API integration)
2. **Organizer syncs payments** using one of:
   - Bot commands: `/mark_paid @username 50.00`
   - Web admin UI (future enhancement)
   - API calls directly

3. **System records payment** in `event_payments` table
4. **Budget updates automatically** via cache or real-time calculation

### Example Workflow

```bash
# Game created with pricing
INSERT INTO game_schedule (game_date, location, price_per_player, max_players)
VALUES ('2024-03-15 18:00', 'Main Court', 50.00, 18);

# Players vote in poll (automated via bot)
# User @john votes "I'm in!" → recorded in poll_votes

# Organizer marks payments as received
/mark_paid @john 50.00
/mark_paid @sarah 50.00
/mark_paid @mike 50.00

# Check status
/budget_today
# Output:
# 💵 Price per player: 50.00 ILS
# 👥 Registered: 18
# ✅ Paid: 3
# ❌ Unpaid: 15
# 💰 Expected income: 900.00 ILS
# ✅ Actual income: 150.00 ILS
# 📈 Collection rate: 16.7%
```

## Forecasting

### Historical Average Method

The default forecasting method analyzes past games to predict future attendance:

1. **Finds similar games**:
   - Same weekday (Monday, Tuesday, etc.)
   - Same location
   - Within last 90 days

2. **Calculates averages**:
   - Average number of players who paid
   - Average revenue collected

3. **Confidence levels**:
   - **High**: 5+ historical games found
   - **Medium**: 2-4 historical games
   - **Low**: 0-1 historical games (uses max_players as fallback)

### Future: Vertex AI Forecasting

The system is designed to easily integrate Vertex AI for more sophisticated forecasting:

```python
# services/jobs/forecast_vertexai.py (future)
def forecast_with_vertex_ai(game_data, historical_data):
    # Use Vertex AI regression model
    # Features: weekday, location, season, weather, etc.
    # Returns: predicted attendance + confidence interval
    pass
```

To switch to Vertex AI forecasting:
1. Implement `forecast_vertexai.py` job
2. Update `forecast_cache.method` to `'vertex_ai'`
3. Deploy new job via Helm

## Budget Analytics Job

### Purpose

Precomputes budget and forecast metrics for upcoming games to improve performance.

### Schedule

Runs daily at 6:00 AM (configurable in Helm values).

### What It Does

1. **Finds upcoming games** (next 7 days)
2. **For each game**:
   - Computes budget metrics (expected/actual income, paid/unpaid lists)
   - Computes forecast (predicted attendance/revenue)
   - Updates cache tables
3. **Records execution** in `job_runs`

### Benefits

- Faster API responses (read from cache instead of computing)
- Consistent data across requests
- Historical tracking of budget changes

### Manual Trigger

```bash
# Trigger job manually for testing
kubectl create job --from=cronjob/volleyball-bot-budget-analytics test-budget

# Check logs
kubectl logs -l job-name=test-budget -f
```

## Configuration

### Game Setup

Set pricing for games:

```sql
UPDATE game_schedule
SET price_per_player = 50.00,
    max_players = 18,
    expected_budget = 900.00
WHERE id = 1;
```

Or via API (future):
```http
PATCH /api/games/1
{
  "price_per_player": 50.00,
  "max_players": 18
}
```

### Helm Values

```yaml
jobs:
  budgetAnalytics:
    enabled: true
    schedule: "0 6 * * *"  # Daily at 6am
    timezone: "America/New_York"
```

## Monitoring

### Check Payment Status

```bash
# Via API
curl http://your-api/api/games/1/budget

# Via bot
# Send /budget_today in Telegram
```

### View Logs

```bash
# Budget analytics job logs
kubectl logs -l app.kubernetes.io/component=budget-analytics

# Bot API logs (payment commands)
kubectl logs -l app.kubernetes.io/component=bot-api | grep payment
```

### Database Queries

```sql
-- Total payments for a game
SELECT
  COUNT(*) as paid_count,
  SUM(amount) as total_revenue
FROM event_payments
WHERE game_id = 1 AND status = 'confirmed';

-- Unpaid players
SELECT p.username, p.display_name
FROM poll_votes pv
JOIN players p ON pv.user_id = p.telegram_user_id
WHERE pv.poll_id = 'xxx' AND pv.option_id = 0
  AND NOT EXISTS (
    SELECT 1 FROM event_payments ep
    WHERE ep.player_id = p.id AND ep.game_id = 1
  );

-- Payment collection rate by game
SELECT
  gs.game_date,
  gs.location,
  COUNT(ep.id) as paid,
  COUNT(pv.id) as registered,
  ROUND(COUNT(ep.id)::numeric / NULLIF(COUNT(pv.id), 0) * 100, 1) as collection_rate
FROM game_schedule gs
LEFT JOIN polls p ON p.game_id = gs.id
LEFT JOIN poll_votes pv ON pv.poll_id = p.poll_id AND pv.option_id = 0
LEFT JOIN event_payments ep ON ep.game_id = gs.id AND ep.status = 'confirmed'
GROUP BY gs.id, gs.game_date, gs.location
ORDER BY gs.game_date DESC;
```

## Security Considerations

### Admin Commands

Currently, payment admin commands (`/mark_paid`, `/mark_unpaid`) are not protected by authentication. In production, you should:

1. **Add admin user list**:
```python
ADMIN_USER_IDS = [123456789, 987654321]  # Telegram user IDs

@payment_command_router.message(Command("mark_paid"))
async def cmd_mark_paid(message: Message):
    if message.from_user.id not in ADMIN_USER_IDS:
        await message.answer("Unauthorized")
        return
    # ... rest of handler
```

2. **Use API authentication**:
   - Add API keys for programmatic access
   - Implement OAuth2 for web admin UI
   - Use service accounts for job-to-job communication

3. **Audit logging**:
```sql
CREATE TABLE payment_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(20),
  game_id INTEGER,
  player_id INTEGER,
  admin_user_id BIGINT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Future Enhancements

### PayBox API Integration

When PayBox API becomes available:

1. **Webhook handler**:
```python
@app.post("/webhooks/paybox")
async def paybox_webhook(payload: dict):
    # Verify webhook signature
    # Extract payment info
    # Create event_payment record
    # Send confirmation to player
    pass
```

2. **Payment links**:
```python
# Generate PayBox payment link for player
link = create_paybox_link(
    amount=game.price_per_player,
    player_id=player.id,
    game_id=game.id
)
await bot.send_message(player.telegram_user_id, f"Pay here: {link}")
```

### Advanced Analytics

- Payment trends over time
- Player payment reliability scores
- Automatic reminders for unpaid players
- Revenue forecasting with ML (Vertex AI)
- Integration with accounting systems

### Web Admin UI

- Dashboard showing all games and payment status
- Bulk payment entry
- Export to CSV/Excel
- Receipt generation
- Refund management

## Troubleshooting

### Payment Not Showing

```bash
# Check if player exists
SELECT * FROM players WHERE username = 'john';

# Check if payment was created
SELECT * FROM event_payments WHERE game_id = 1 AND player_id = 123;

# Check bot logs
kubectl logs -l app.kubernetes.io/component=bot-api --tail=100 | grep mark_paid
```

### Forecast Shows Low Confidence

This happens when there's insufficient historical data:

```sql
-- Check historical games
SELECT game_date, location, COUNT(ep.id) as payments
FROM game_schedule gs
LEFT JOIN event_payments ep ON ep.game_id = gs.id
WHERE game_date > NOW() - INTERVAL '90 days'
  AND game_date < NOW()
GROUP BY gs.id, gs.game_date, gs.location
ORDER BY game_date DESC;
```

**Solution**: Wait for more games to build history, or manually set expected values.

### Budget Cache Out of Date

```bash
# Manually trigger analytics job
kubectl create job --from=cronjob/volleyball-bot-budget-analytics manual-update

# Or clear cache to force recomputation
DELETE FROM budget_cache WHERE game_id = 1;
DELETE FROM forecast_cache WHERE game_id = 1;

# Next API call will recompute
```

## Migration Guide

### Running the Payment Migration

```bash
# Connect to Cloud SQL
gcloud sql connect volleyball-db --user=volleyball_app

# Run migration
\i migrations/002_payments_and_forecast.sql

# Verify tables created
\dt event_payments
\dt budget_cache
\dt forecast_cache
```

### Updating Existing Games

```sql
-- Set price for all future games
UPDATE game_schedule
SET price_per_player = 50.00,
    max_players = 18
WHERE game_date > NOW();
```

### Backfilling Historical Data

If you have historical payment data in another system:

```sql
-- Example: Import from CSV
COPY event_payments (game_id, player_id, amount, currency, paid_at, method, status)
FROM '/path/to/payments.csv'
DELIMITER ','
CSV HEADER;
```
