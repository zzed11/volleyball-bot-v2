# Makefile for Volleyball Bot project

.PHONY: help init plan apply destroy test lint format docker-build docker-push deploy clean

# Variables
PROJECT_ID ?= $(shell gcloud config get-value project)
REGION ?= us-central1
IMAGE_TAG ?= latest

help:
	@echo "Available commands:"
	@echo "  make init           - Initialize Terraform"
	@echo "  make plan           - Run Terraform plan"
	@echo "  make apply          - Apply Terraform changes"
	@echo "  make destroy        - Destroy all infrastructure"
	@echo "  make test           - Run Python tests"
	@echo "  make lint           - Lint Python code"
	@echo "  make format         - Format Python code with black"
	@echo "  make docker-build   - Build all Docker images"
	@echo "  make docker-push    - Push Docker images to registry"
	@echo "  make deploy         - Deploy to GKE with Helm"
	@echo "  make clean          - Clean up local artifacts"

# Terraform commands
init:
	cd terraform && terraform init

plan:
	cd terraform && terraform plan -var="project_id=$(PROJECT_ID)"

apply:
	cd terraform && terraform apply -var="project_id=$(PROJECT_ID)"

destroy:
	cd terraform && terraform destroy -var="project_id=$(PROJECT_ID)"

# Development commands
test:
	cd services/bot-api && python -m pytest tests/

lint:
	cd services/bot-api && flake8 .
	cd services/jobs && flake8 .

format:
	cd services/bot-api && black .
	cd services/jobs && black .

# Docker commands
docker-build:
	docker build -t $(REGION)-docker.pkg.dev/$(PROJECT_ID)/volleyball-images/bot-api:$(IMAGE_TAG) services/bot-api
	cd services/jobs && cp -r ../bot-api/db . && cd ../.. && \
	docker build -t $(REGION)-docker.pkg.dev/$(PROJECT_ID)/volleyball-images/jobs:$(IMAGE_TAG) services/jobs

docker-push:
	gcloud auth configure-docker $(REGION)-docker.pkg.dev
	docker push $(REGION)-docker.pkg.dev/$(PROJECT_ID)/volleyball-images/bot-api:$(IMAGE_TAG)
	docker push $(REGION)-docker.pkg.dev/$(PROJECT_ID)/volleyball-images/jobs:$(IMAGE_TAG)

# Deployment commands
deploy:
	gcloud container clusters get-credentials volleyball-cluster --region=$(REGION)
	helm upgrade --install volleyball-bot ./helm/volleyball-bot \
		--set botApi.image.tag=$(IMAGE_TAG) \
		--set global.projectId=$(PROJECT_ID) \
		--set global.region=$(REGION) \
		--wait

# Database commands
db-migrate:
	@echo "Running database migrations..."
	gcloud sql connect volleyball-db --user=volleyball_app < migrations/init.sql

# Utility commands
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	cd terraform && rm -rf .terraform terraform.tfstate* .terraform.lock.hcl

# Get cluster credentials
get-credentials:
	gcloud container clusters get-credentials volleyball-cluster --region=$(REGION)

# View logs
logs-bot:
	kubectl logs -l app.kubernetes.io/component=bot-api -f --tail=100

logs-jobs:
	kubectl get pods | grep -E "(trivia|game|notification)" | head -1 | awk '{print $$1}' | xargs kubectl logs

# Port forward for local testing
port-forward:
	kubectl port-forward svc/volleyball-bot-bot-api 8080:80
