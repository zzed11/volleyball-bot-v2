# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Volleyball Community Backend - A GCP-based platform for managing a volleyball community with Telegram bot integration, trivia generation, game scheduling, player management, and payment tracking.

**Stack**: Python (FastAPI + aiogram), PostgreSQL (Cloud SQL), GKE Autopilot, Vertex AI Gemini, Terraform, Helm

## Development Commands

### Local Development
```bash
# Set up Python environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r services/bot-api/requirements.txt

# Run bot-api locally (requires .env with DATABASE_URL and TELEGRAM_BOT_TOKEN)
python services/bot-api/main.py
```

### Testing and Code Quality
```bash
make test           # Run pytest for bot-api service
make lint           # Run flake8 on bot-api and jobs
make format         # Format code with black
```

### Infrastructure
```bash
make init           # Initialize Terraform
make plan           # Terraform plan
make apply          # Deploy infrastructure (GKE, Cloud SQL, etc.)
make destroy        # Destroy all infrastructure
```

### Docker
```bash
# Build images (requires PROJECT_ID and REGION env vars)
make docker-build IMAGE_TAG=v1.0.0
make docker-push IMAGE_TAG=v1.0.0

# Note: Jobs Docker build copies db/ directory from bot-api
```

### Deployment
```bash
make deploy IMAGE_TAG=v1.0.0  # Deploy to GKE with Helm
make get-credentials          # Get GKE credentials for kubectl
```

### Database
```bash
make db-migrate               # Run migrations/init.sql on Cloud SQL
gcloud sql connect volleyball-db --user=volleyball_app  # Direct connection
```

### Debugging
```bash
make logs-bot                 # Follow bot-api logs
make logs-jobs                # View recent job pod logs
make port-forward             # Port-forward bot-api to localhost:8080
```

## Architecture

### Service Structure

**services/bot-api/** - Main Telegram bot and REST API
- `main.py` - FastAPI app with Telegram webhook handler
- `config.py` - Settings with Secret Manager integration (Pydantic)
- `bot/` - Telegram bot handlers (aiogram)
  - `handlers.py` - Join/leave tracking, poll handlers
  - `payment_commands.py` - `/mark_paid`, `/who_paid`, `/budget_today`, etc.
- `api/` - REST API endpoints
  - `routes.py` - Player/poll/game endpoints
  - `payments.py` - Payment CRUD and budget/forecast endpoints
- `db/` - Database layer
  - `models.py` - SQLAlchemy ORM models
  - `database.py` - Connection and session management

**services/jobs/** - Scheduled CronJobs
- `common.py` - Shared JobConfig, DB session, secret loading
- `trivia_job.py` - Vertex AI Gemini trivia generation (Tue/Wed 10am)
- `game_poll_job.py` - Game attendance polls (Tue/Wed 9am)
- `notification_job.py` - Game reminders (Mon/Thu 8am)
- `budget_analytics_job.py` - Precompute budget/forecast cache (daily 6am)

**Note**: Jobs copy `db/` from `bot-api` during Docker build to share models.

### Infrastructure Components

- **GKE Autopilot**: Runs bot-api deployment (2-10 replicas with HPA) and CronJobs
- **Cloud SQL (PostgreSQL)**: Private IP only, accessed via Cloud SQL Proxy sidecars
- **Secret Manager**: Stores `telegram-bot-token` and `db-password`
- **Artifact Registry**: Docker images at `{REGION}-docker.pkg.dev/{PROJECT_ID}/volleyball-images/`
- **Workload Identity**: Binds K8s service accounts to GCP service accounts (no JSON keys)
- **Vertex AI**: Gemini 1.5 Pro for trivia question generation

### Database Schema

Key tables:
- `players` - Telegram users with username, display_name, telegram_user_id
- `polls` / `poll_votes` - Trivia and game polls with server-side timestamps
- `game_schedule` - Upcoming games with location, time, price_per_player, max_players
- `event_payments` - Payment tracking (game_id, player_id, amount, status, paid_at)
- `budget_cache` / `forecast_cache` - Precomputed analytics (updated by budget_analytics_job)
- `job_definitions` / `job_runs` - Job metadata and execution history

See `migrations/init.sql` and `migrations/002_payments_and_forecast.sql` for full schema.

### Configuration

**Settings load order** (bot-api and jobs):
1. Environment variables
2. `.env` file (local dev)
3. GCP Secret Manager (production)

**Required secrets** (in Secret Manager for production):
- `telegram-bot-token` - Bot token from @BotFather
- `db-password` - PostgreSQL password

**Environment variables**:
- `GCP_PROJECT_ID` - GCP project (enables Secret Manager)
- `TELEGRAM_CHAT_ID` - Telegram group chat ID (for jobs)
- `CLOUDSQL_CONNECTION_NAME` - Format: `project:region:instance` (triggers Cloud SQL Proxy mode)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` - Database connection
- `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL` - Gemini API config

### Payment Tracking Workflow

1. **Game created** with `price_per_player` and `max_players` in `game_schedule`
2. **Players vote** in attendance poll (recorded in `poll_votes`)
3. **Organizer marks payments** via:
   - Bot commands: `/mark_paid @username 50.00` or `/mark_unpaid @username`
   - REST API: `POST /api/games/{game_id}/payments`
4. **System tracks budget**:
   - `event_payments` table stores payment records
   - `budget_cache` precomputed by `budget_analytics_job`
   - Query via `/budget_today` bot command or `GET /api/games/{id}/budget`
5. **Forecasting**: Historical average method predicts attendance/revenue based on weekday, location, past 90 days

**Note**: No PayBox API integration yet - payments tracked manually via bot commands or API.

## Key Patterns

### Database Connections

**Bot-API (async)**:
```python
from db.database import get_session
async with get_session() as session:
    result = await session.execute(select(Player))
```

**Jobs (sync)**:
```python
from common import get_db_session, JobConfig
config = JobConfig()
session = get_db_session(config)
# Use session...
session.close()
```

### Secret Loading

Both `bot-api/config.py` and `jobs/common.py` auto-load from Secret Manager if `GCP_PROJECT_ID` is set. Secrets are loaded once at startup.

### Job Execution Pattern

All jobs follow this pattern:
1. Load config via `JobConfig()` (includes secrets)
2. Create DB session via `get_db_session(config)`
3. Initialize Telegram bot: `Bot(token=config.telegram_bot_token)`
4. Execute job logic
5. Record execution via `record_job_run(session, job_name, status, error_message)`

### Cloud SQL Proxy Mode

When `CLOUDSQL_CONNECTION_NAME` is set:
- Connection string changes to `127.0.0.1:5432` (proxy sidecar)
- Helm deploys Cloud SQL Proxy sidecar in each pod
- No public IP needed for database

## CI/CD

GitHub Actions workflows (`.github/workflows/`):
- **bot-api-ci.yaml**: Triggers on changes to `services/bot-api/**`
- **jobs-ci.yaml**: Triggers on changes to `services/jobs/**`

Both workflows:
1. **Test** (on all commits): flake8, black check, pytest
2. **Build & Push** (on main only): Authenticate via Workload Identity Federation, build Docker, push to Artifact Registry
3. **Deploy** (on main only): Update Helm deployment with new image tag

**Required GitHub secrets**:
- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

## Deployment Checklist

When deploying infrastructure or making changes:

1. **Secrets configured** in Secret Manager (`telegram-bot-token`, `db-password`)
2. **Helm values updated** (`helm/volleyball-bot/values.yaml`):
   - `global.projectId`
   - `botApi.image.repository`
   - `botApi.cloudSqlProxy.instanceConnectionName`
   - `jobs.env[TELEGRAM_CHAT_ID]`
3. **Database migrated**: `gcloud sql connect volleyball-db --user=volleyball_app < migrations/init.sql`
4. **Telegram webhook set**: `curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url={URL}/webhook"`
5. **Verify pods running**: `kubectl get pods`
6. **Check health**: `curl http://{EXTERNAL-IP}/health`

## Common Tasks

### Add a new bot command
1. Add handler in `services/bot-api/bot/handlers.py` or `payment_commands.py`
2. Use `@router.message(Command("command_name"))` decorator
3. Test locally with `.env` file
4. Push to trigger CI/CD

### Add a new API endpoint
1. Add route in `services/bot-api/api/routes.py` or `payments.py`
2. Use `@router.get/post/patch/delete` decorators
3. Access DB via `get_session()` dependency injection

### Add a new database table
1. Add model in `services/bot-api/db/models.py` (SQLAlchemy ORM)
2. Create migration SQL in `migrations/00X_description.sql`
3. Run migration: `gcloud sql connect volleyball-db --user=volleyball_app < migrations/00X_description.sql`
4. Note: Jobs will pick up new models automatically (db/ is copied during build)

### Add a new scheduled job
1. Create `services/jobs/new_job.py` following pattern in `trivia_job.py`
2. Add CronJob definition in `helm/volleyball-bot/templates/cronjobs.yaml`
3. Build and push jobs image
4. Deploy with Helm

### Debug job execution
```bash
# List CronJobs
kubectl get cronjobs

# Manually trigger job
kubectl create job --from=cronjob/volleyball-bot-trivia-tuesday test-job

# Watch job
kubectl get jobs -w

# Check logs
kubectl logs -l job-name=test-job
```

### Scale bot-api
```bash
# Manual scaling
kubectl scale deployment volleyball-bot-bot-api --replicas=5

# Or update HPA in values.yaml and redeploy
```

## Terraform Structure

- `main.tf` - Provider config, backend
- `networking.tf` - VPC, subnets, Cloud NAT
- `gke.tf` - GKE Autopilot cluster
- `cloudsql.tf` - Cloud SQL PostgreSQL instance
- `iam.tf` - Service accounts, Workload Identity bindings
- `secrets.tf` - Secret Manager setup
- `variables.tf` - Input variables
- `outputs.tf` - Outputs (connection names, service accounts, etc.)

Key resources created:
- GKE cluster: `volleyball-cluster`
- Cloud SQL: `volleyball-db`
- Artifact Registry: `volleyball-images`
- Service accounts: `bot-api-sa`, `trivia-job-sa`, `game-poll-job-sa`, `notification-job-sa`, `github-actions-sa`

## Troubleshooting

**Pod not starting**: `kubectl describe pod {pod-name}` - check events for Workload Identity issues, image pull errors

**Database connection failed**: Verify Cloud SQL Proxy sidecar running, check service account has Cloud SQL Client role

**Webhook not working**: `curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"` - verify URL, check ingress IP

**Job not triggering**: Check CronJob schedule timezone, manually trigger with `kubectl create job --from=cronjob/{name} test`

**Payment not recorded**: Check player exists in `players` table, verify game_id in `game_schedule`, check bot logs for errors
