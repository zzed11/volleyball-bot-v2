# Architecture Documentation

## System Overview

The Volleyball Community Bot is a cloud-native application built on Google Cloud Platform (GCP) that manages a volleyball community through a Telegram bot interface. It handles trivia generation, game scheduling, attendance tracking, and member management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Telegram Users                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GCP Load Balancer (Ingress)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GKE Autopilot Cluster                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                Bot API Service (Deployment)              │   │
│  │  - aiogram Telegram webhook handler                      │   │
│  │  - FastAPI REST API                                      │   │
│  │  - Horizontal Pod Autoscaler (2-10 replicas)            │   │
│  └────────────┬──────────────────────────┬──────────────────┘   │
│               │                          │                      │
│               │                          │                      │
│  ┌────────────▼──────┐      ┌───────────▼──────────┐          │
│  │  Cloud SQL Proxy  │      │  Secret Manager CSI  │          │
│  │    Sidecar        │      │     (Secrets)        │          │
│  └────────────┬──────┘      └──────────────────────┘          │
│               │                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Scheduled CronJobs                        │    │
│  │  - Trivia Generation (Tue/Wed 10am)                   │    │
│  │  - Game Polls (Tue/Wed 9am)                           │    │
│  │  - Notifications (Mon/Thu 8am)                        │    │
│  │  Each with Cloud SQL Proxy sidecar                    │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────────┐  ┌────────────┐
    │  Cloud SQL  │  │    Vertex AI │  │   Secret   │
    │ (PostgreSQL)│  │    Gemini    │  │  Manager   │
    │             │  │              │  │            │
    │  - Private  │  │ - Trivia Gen │  │  - Bot     │
    │    IP only  │  │              │  │    Token   │
    │  - Auto     │  │              │  │  - DB Pass │
    │    Backup   │  │              │  │            │
    └─────────────┘  └──────────────┘  └────────────┘
```

## Components

### 1. Infrastructure Layer (Terraform)

**Purpose**: Provision and manage all GCP resources

**Resources:**
- VPC Network with private subnets
- GKE Autopilot cluster
- Cloud SQL PostgreSQL instance (private IP)
- Artifact Registry for Docker images
- Secret Manager for sensitive data
- IAM service accounts with Workload Identity
- Workload Identity Federation for GitHub Actions

**Key Features:**
- Zero Trust networking (private IPs, no public access to database)
- Least privilege IAM roles
- Automated backups and point-in-time recovery
- VPC Service Controls for data protection

### 2. Application Layer

#### Bot API Service (Python/FastAPI/aiogram)

**Purpose**: Handle Telegram webhook events and provide REST API

**Responsibilities:**
- Receive Telegram webhook updates (new members, poll answers, messages)
- Track group membership (join/leave events)
- Store poll votes with server-side timestamps
- Expose REST API for web clients
- Health and readiness checks

**Endpoints:**
- `POST /webhook` - Telegram webhook handler
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /api/games/next/players?limit=N` - Get first N players for next game
- `GET /api/polls/{id}/stats` - Poll statistics
- `GET /api/players` - List players
- `GET /api/polls` - List polls

**Deployment:**
- Kubernetes Deployment with 2-10 replicas (HPA)
- Cloud SQL Proxy sidecar for database access
- Workload Identity for GCP authentication
- Network policies for security

#### Scheduled Jobs (Python)

**Purpose**: Execute time-based tasks

**Jobs:**

1. **Trivia Jobs** (Tuesday/Wednesday 10am)
   - Call Vertex AI Gemini to generate trivia questions
   - Create poll in Telegram
   - Record poll in database

2. **Game Poll Jobs** (Tuesday/Wednesday 9am)
   - Find next scheduled game
   - Create attendance poll
   - Send game details to group

3. **Notification Jobs** (Monday/Thursday 8am)
   - Find games needing notification
   - Send reminder messages
   - Mark games as notified

**Deployment:**
- Kubernetes CronJobs with timezone support
- Cloud SQL Proxy sidecar for database access
- Separate service accounts per job type
- Concurrency policy: Forbid (prevent overlapping runs)

### 3. Data Layer

#### Cloud SQL PostgreSQL

**Schema:**

```sql
players           # Telegram users and their profiles
teams             # Team definitions
team_members      # Many-to-many: players ↔ teams
matches           # Game records with scores
polls             # Trivia and game polls
poll_votes        # Individual votes with timestamps
game_schedule     # Upcoming games
group_members     # Join/leave tracking
job_definitions   # Job metadata
job_schedules     # Cron schedules
job_runs          # Execution history
```

**Features:**
- Private IP only (no public access)
- Automated daily backups (7-day retention)
- Point-in-time recovery enabled
- Query insights for performance monitoring
- Connection via Cloud SQL Proxy (not direct)

#### Vertex AI

**Purpose**: Generate trivia questions using LLM

**Model**: Gemini 1.5 Pro
**Integration**: Python SDK
**Features:**
- Few-shot prompting for consistent format
- JSON output parsing
- Fallback questions if API fails

### 4. Security

#### Authentication & Authorization

**Workload Identity:**
- Kubernetes service accounts bound to GCP service accounts
- No static JSON keys in pods
- Automatic credential rotation

**Secret Management:**
- All secrets stored in Secret Manager
- Access via service account permissions
- Secrets mounted as CSI volumes or env vars

**IAM Roles (Least Privilege):**
- `bot-api-sa`: Cloud SQL Client, Secret Accessor
- `trivia-job-sa`: Cloud SQL Client, Vertex AI User, Secret Accessor
- `game-poll-job-sa`: Cloud SQL Client, Secret Accessor
- `notification-job-sa`: Cloud SQL Client, Secret Accessor
- `github-actions-sa`: Artifact Registry Writer, GKE Developer

#### Network Security

**VPC:**
- Private subnet for GKE nodes
- Private IP for Cloud SQL
- Cloud NAT for outbound internet (Telegram API)

**Network Policies:**
- Allow ingress only from load balancer
- Allow egress to Cloud SQL, DNS, Telegram API
- Deny all other traffic

**GKE Security:**
- Autopilot (Google-managed nodes)
- Binary Authorization enabled
- Workload Identity enforced
- Run as non-root user
- Read-only root filesystem where possible

### 5. CI/CD Pipeline (GitHub Actions)

#### Workflow: Bot API

**Trigger**: Push to `main` or PR on `services/bot-api/**`

**Steps:**
1. **Test** (on all commits)
   - Run flake8 linter
   - Check black formatting
   - Run pytest (when tests exist)

2. **Build & Push** (on main only)
   - Authenticate via Workload Identity Federation
   - Build Docker image
   - Tag with git SHA and 'latest'
   - Push to Artifact Registry

3. **Deploy** (on main only)
   - Get GKE credentials
   - Deploy with Helm
   - Wait for rollout
   - Verify deployment

#### Workflow: Jobs

**Trigger**: Push to `main` or PR on `services/jobs/**`

**Steps:**
- Same as Bot API workflow
- Updates all CronJob images
- Copies database models before build

### 6. Observability

#### Logging

**Sources:**
- Application logs (stdout/stderr)
- GKE system logs
- Cloud SQL audit logs

**Collection:**
- Automatic via GKE integration
- Structured logging (JSON)
- Cloud Logging for storage and query

#### Monitoring

**Metrics:**
- GKE cluster metrics (CPU, memory, network)
- Application metrics via Managed Prometheus
- Cloud SQL metrics (connections, queries, storage)

**Alerts** (to be configured):
- Pod crash loops
- High error rates
- Database connection exhaustion
- Job failures

#### Tracing

**Future Enhancement:**
- OpenTelemetry integration
- Distributed tracing across services

### 7. Scaling Strategy

#### Horizontal Scaling

**Bot API:**
- HPA based on CPU (80%) and memory (80%)
- Min: 2 replicas (HA)
- Max: 10 replicas

**Jobs:**
- Single pod per execution (CronJob)
- Concurrency: Forbid

#### Vertical Scaling

**GKE Autopilot:**
- Automatic right-sizing of pods
- No need to manage node pools

**Cloud SQL:**
- Manual tier upgrade via Terraform
- Or enable automatic storage increase

### 8. Disaster Recovery

#### Backup Strategy

**Cloud SQL:**
- Automated daily backups
- 7-day retention
- Point-in-time recovery (7 days)
- Backup to separate region (optional)

**Infrastructure:**
- Terraform state in GCS (recommended)
- Git repository for all IaC

**Recovery Procedures:**

1. **Database Failure:**
   ```bash
   gcloud sql backups restore <BACKUP_ID> --backup-instance=volleyball-db
   ```

2. **Complete Infrastructure Loss:**
   ```bash
   terraform apply  # Rebuild everything
   # Restore database from backup
   # Redeploy applications via CI/CD
   ```

### 9. Cost Optimization

**GKE Autopilot:**
- Pay only for pod resources
- No over-provisioning
- Automatic bin-packing

**Cloud SQL:**
- Right-sized instance (db-f1-micro for dev)
- Automatic storage increase
- Backup retention = 7 days

**Jobs:**
- Run on schedule only (not 24/7)
- Consider Cloud Run for lower frequency jobs

**Artifact Registry:**
- Automatic cleanup of old images (configure lifecycle)

### 10. Future Enhancements

**Technical:**
- Implement caching (Redis/Memorystore)
- Add web frontend (Next.js)
- Implement GraphQL API
- Add real-time features (WebSockets)
- Implement rate limiting
- Add API authentication (OAuth2)

**Features:**
- Player skill ratings (ELO system)
- Team auto-balancing
- Statistics dashboard
- Multi-language support
- Integration with calendar apps
- Payment processing for fees

**Operations:**
- Multi-environment (dev/staging/prod)
- Canary deployments
- A/B testing framework
- Advanced monitoring and alerting
- SLO/SLA tracking
- Disaster recovery drills

## Design Decisions

### Why GKE Autopilot?
- Simplified operations (Google manages nodes)
- Built-in security best practices
- Automatic scaling and updates
- Cost-effective for variable workloads

### Why CronJobs instead of Cloud Run?
- Tight integration with bot-api service
- Shared database connection patterns
- Consistent deployment model
- Could migrate to Cloud Run later if needed

### Why Cloud SQL instead of Cloud Spanner?
- PostgreSQL compatibility
- Lower cost for small dataset
- Sufficient for community size
- Easier migration path from local dev

### Why aiogram instead of python-telegram-bot?
- Modern async/await support
- Type hints throughout
- Better performance
- Active development

### Why FastAPI instead of Flask?
- Native async support
- Automatic OpenAPI documentation
- Type validation with Pydantic
- Better performance

## Performance Characteristics

**Expected Load:**
- ~100-500 active users
- ~10-50 requests/minute
- ~6 scheduled jobs/week
- ~1000 poll votes/week

**Current Capacity:**
- Bot API: 2-10 pods × 1000 req/min = 2000-10000 req/min
- Database: db-f1-micro suitable for dev, upgrade to db-custom for production
- Jobs: Single execution, completes in <1 minute

**Bottlenecks:**
- Database connections (use connection pooling)
- Vertex AI API rate limits (10 req/min on free tier)
- Telegram API rate limits (30 msg/sec)
