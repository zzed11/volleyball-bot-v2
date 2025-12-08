# Quick Start Guide

Get your Volleyball Bot running in 30 minutes!

## Prerequisites

- GCP account with billing enabled
- `gcloud`, `terraform`, `kubectl`, `helm` installed
- Telegram bot token from @BotFather

## Steps

### 1. Set Environment Variables

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export BOT_TOKEN="your-telegram-bot-token"
export CHAT_ID="your-telegram-chat-id"

gcloud config set project $PROJECT_ID
```

### 2. Enable APIs (2 minutes)

```bash
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  compute.googleapis.com
```

### 3. Deploy Infrastructure (10-15 minutes)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your project_id
nano terraform.tfvars

terraform init
terraform apply -auto-approve
```

### 4. Store Secrets (1 minute)

```bash
echo -n "$BOT_TOKEN" | gcloud secrets create telegram-bot-token --data-file=-
```

### 5. Initialize Database (2 minutes)

```bash
gcloud sql connect volleyball-db --user=postgres < ../migrations/init.sql
```

### 6. Build & Push Images (5 minutes)

```bash
cd ..

# Authenticate Docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and push
make docker-build IMAGE_TAG=v1.0.0
make docker-push IMAGE_TAG=v1.0.0
```

### 7. Update Helm Values (2 minutes)

```bash
cd helm/volleyball-bot

# Edit values.yaml:
# - Line 5: projectId: "your-project-id"
# - Line 15: repository: <your-region>-docker.pkg.dev/<your-project>/volleyball-images/bot-api
# - Line 27: iam.gke.io/gcp-service-account: bot-api-sa@<your-project>.iam.gserviceaccount.com
# - Line 50: instanceConnectionName: "<your-project>:us-central1:volleyball-db"
# - Line 166: value: "your-telegram-chat-id"  # TELEGRAM_CHAT_ID

nano values.yaml
```

### 8. Deploy to GKE (5 minutes)

```bash
cd ../..

gcloud container clusters get-credentials volleyball-cluster --region=$REGION

helm upgrade --install volleyball-bot ./helm/volleyball-bot --wait
```

### 9. Configure Webhook (1 minute)

```bash
# Get ingress IP
kubectl get ingress

# Set webhook (use IP or domain)
WEBHOOK_URL="http://<INGRESS-IP>/webhook"
curl "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"

# Verify
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

### 10. Test! (2 minutes)

```bash
# Check pods
kubectl get pods

# View logs
kubectl logs -l app.kubernetes.io/component=bot-api -f

# In Telegram:
# - Add bot to your group
# - Send /start
# - Add/remove a member to test tracking
```

## Verify Everything Works

```bash
# Check health
kubectl get pods
kubectl get svc
kubectl get cronjobs

# Test API
EXTERNAL_IP=$(kubectl get svc volleyball-bot-bot-api -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$EXTERNAL_IP/health

# Manually trigger a job
kubectl create job --from=cronjob/volleyball-bot-trivia-tuesday test-job
kubectl logs -l job-name=test-job -f
```

## Common Issues

### "Webhook not working"
```bash
# Check ingress
kubectl describe ingress

# Reset webhook
curl "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"
curl "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"
```

### "Database connection failed"
```bash
# Check Cloud SQL Proxy
kubectl logs -l app.kubernetes.io/component=bot-api -c cloud-sql-proxy

# Verify permissions
kubectl describe sa bot-api
```

### "Pods not starting"
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

## Next Steps

1. Set up custom domain with SSL
2. Configure GitHub Actions (see DEPLOYMENT.md)
3. Add game schedules to database
4. Monitor logs and metrics
5. Scale as needed

## Cleanup

```bash
helm uninstall volleyball-bot
cd terraform && terraform destroy -auto-approve
```

## Need Help?

- Full documentation: See README.md
- Deployment guide: See DEPLOYMENT.md
- Architecture: See ARCHITECTURE.md
