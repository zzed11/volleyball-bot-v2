#!/bin/bash
set -e

PROJECT_ID="atikot-org-share-project"
REGION="us-central1"
REPO="volleyball-images"

echo "Building images with Cloud Build..."

# Build bot-api
echo "Building bot-api..."
gcloud builds submit \
  --config=services/bot-api/cloudbuild.yaml \
  --project=$PROJECT_ID \
  services/bot-api

# Build jobs (from parent directory to access bot-api/db)
echo "Building jobs..."
gcloud builds submit \
  --config=services/jobs/cloudbuild.yaml \
  --project=$PROJECT_ID \
  .

echo "✅ All images built successfully!"
echo ""
echo "Images:"
echo "  - $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/bot-api:latest"
echo "  - $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/jobs:latest"
