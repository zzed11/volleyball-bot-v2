# Volleyball Community Backend

A comprehensive GCP-based platform for managing a volleyball community with Telegram bot integration, trivia generation, game scheduling, and player management.

## Architecture Overview

- **Platform**: Google Cloud Platform (GCP)
- **Container Orchestration**: GKE Autopilot
- **Database**: Cloud SQL (PostgreSQL)
- **LLM**: Vertex AI Gemini for trivia generation
- **Bot Framework**: aiogram (Python)
- **API**: FastAPI (Python)
- **IaC**: Terraform
- **Deployment**: Helm + GitHub Actions
- **Security**: Zero Trust (Workload Identity, Secret Manager, private networking)

## Project Structure

```
.
├── terraform/                 # Infrastructure as Code
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── gke.tf
│   ├── cloudsql.tf
│   ├── iam.tf
│   ├── networking.tf
│   └── secrets.tf
├── helm/                      # Kubernetes deployments
│   └── volleyball-bot/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── services/                  # Application code
│   ├── bot-api/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── main.py
│   │   ├── bot/
│   │   ├── api/
│   │   └── db/
│   └── jobs/
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── trivia_job.py
│       ├── game_poll_job.py
│       └── notification_job.py
├── migrations/                # Database migrations
│   └── init.sql
├── .github/
│   └── workflows/
│       ├── bot-api-ci.yaml
│       └── jobs-ci.yaml
└── README.md
```

## Core Use Cases

1. **Twice-weekly trivia polls** (Tue & Wed) - AI-generated questions using Vertex AI
2. **Twice-weekly game polls** (Tue & Wed) - Who's coming to the game
3. **Twice-weekly game notifications** (Mon & Thu) - When and where
4. **Continuous join/leave handling** - Track members and send welcome messages
5. **Bot queries** - "Who are the first 18 players?", time-based analytics
6. **Payment tracking** - Record payments, budget monitoring, and forecasting (see [PAYMENTS.md](PAYMENTS.md))

## Prerequisites

- GCP Project with billing enabled
- `gcloud` CLI installed and authenticated
- `terraform` >= 1.5
- `kubectl` CLI
- `helm` >= 3.0
- Docker for local development
- GitHub repository with Actions enabled

## Setup Instructions

### 1. Configure GCP Project

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
gcloud config set project $PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  compute.googleapis.com
```

### 3. Deploy Infrastructure with Terraform

```bash
cd terraform
terraform init
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION"
terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION"
```

### 4. Configure Secrets in Secret Manager

```bash
# Telegram Bot Token
echo -n "YOUR_TELEGRAM_BOT_TOKEN" | gcloud secrets create telegram-bot-token \
  --data-file=- --replication-policy=automatic

# Database Password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=- --replication-policy=automatic
```

### 5. Run Database Migrations

```bash
# Get Cloud SQL connection name
export DB_INSTANCE=$(terraform output -raw cloudsql_connection_name)

# Connect and run migrations
gcloud sql connect volleyball-db --user=postgres < migrations/init.sql
```

### 6. Deploy Services with Helm

```bash
# Get GKE credentials
gcloud container clusters get-credentials volleyball-cluster --region=$REGION

# Deploy using Helm
cd helm
helm upgrade --install volleyball-bot ./volleyball-bot \
  --set image.tag=$(git rev-parse --short HEAD) \
  --set projectId=$PROJECT_ID
```

### 7. Configure GitHub Actions

Set up Workload Identity Federation for GitHub Actions:

1. Follow Terraform outputs for WIF configuration
2. Add GitHub secrets:
   - `GCP_PROJECT_ID`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT`

## Development

### Local Development Setup

```bash
# Set up Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r services/bot-api/requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost/volleyball"
export TELEGRAM_BOT_TOKEN="your-token"

# Run locally
python services/bot-api/main.py
```

### Running Tests

```bash
pytest services/bot-api/tests/
```

## Monitoring and Operations

- **Logs**: View in Cloud Logging or `kubectl logs`
- **Metrics**: GKE metrics in Cloud Monitoring
- **Alerts**: Set up Cloud Monitoring alerts for job failures
- **Database**: Cloud SQL insights for query performance

## Security Considerations

- All services use Workload Identity (no JSON keys)
- Secrets stored in Secret Manager
- Cloud SQL uses private IP only
- Network policies restrict pod-to-pod traffic
- Least-privilege IAM roles for each service account
- GitHub Actions uses Workload Identity Federation

## Cost Optimization

- GKE Autopilot for right-sizing
- Cloud SQL automated backups with 7-day retention
- Consider Cloud Run for jobs if infrequent execution
- Use preemptible nodes where appropriate

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Create pull request
5. CI/CD will automatically deploy to staging on merge

## License

MIT
