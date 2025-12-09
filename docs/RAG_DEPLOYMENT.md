# RAG Integration Deployment Guide

This guide covers deploying the Vertex AI RAG (Retrieval-Augmented Generation) integration for volleyball trivia questions based on official FIVB volleyball rules.

## Overview

The RAG integration enhances trivia question generation by:
1. Storing the volleyball rules PDF in Cloud Storage
2. Creating a searchable corpus in Vertex AI
3. Retrieving relevant rule sections during trivia generation
4. Using retrieved context to generate accurate, rule-based questions

## Architecture

```
volleyball-rules.pdf (Cloud Storage)
    ↓
Vertex AI RAG Corpus (vectorized, indexed)
    ↓
Trivia Job → RAG Query → Relevant Rules Context
    ↓
Gemini LLM → Trivia Question (based on actual rules)
```

## Prerequisites

- GCP project with billing enabled
- Terraform initialized and applied
- Vertex AI API enabled
- Cloud Storage bucket created
- Service account with appropriate permissions

## Step 1: Deploy Infrastructure with Terraform

### 1.1 Apply Terraform Changes

The Terraform configuration in `/terraform/storage.tf` creates:
- Cloud Storage bucket for volleyball data
- Uploads volleyball-rules.pdf to the bucket
- IAM permissions for trivia job service account

```bash
cd terraform

# Review changes
terraform plan

# Apply changes
terraform apply

# Get outputs
terraform output storage_bucket_name
terraform output volleyball_rules_pdf_path
```

Expected outputs:
```
storage_bucket_name = "atikot-org-share-project-volleyball-data"
volleyball_rules_pdf_path = "gs://atikot-org-share-project-volleyball-data/volleyball-rules/volleyball-rules.pdf"
```

### 1.2 Verify Bucket and File

```bash
# List buckets
gcloud storage buckets list --project=atikot-org-share-project

# Verify PDF upload
gcloud storage ls gs://atikot-org-share-project-volleyball-data/volleyball-rules/
```

## Step 2: Setup Vertex AI RAG Corpus

### 2.1 Set Environment Variables

```bash
export GCP_PROJECT_ID="atikot-org-share-project"
export VERTEX_AI_LOCATION="us-central1"
export STORAGE_BUCKET_NAME=$(terraform output -raw storage_bucket_name)
```

### 2.2 Run Setup Script

The setup script creates the RAG corpus and imports the PDF:

```bash
cd services/jobs

# Install dependencies
pip install -r requirements.txt

# Run setup script
python setup_rag_corpus.py
```

The script will:
1. Initialize Vertex AI client
2. Create a RAG corpus named "volleyball-rules-corpus"
3. Import volleyball-rules.pdf from Cloud Storage
4. Chunk the document (1024 tokens per chunk, 200 token overlap)
5. Generate embeddings for each chunk
6. Index the corpus for semantic search

Expected output:
```
INFO - Initialized Vertex AI for project: atikot-org-share-project
INFO - Creating RAG corpus: volleyball-rules-corpus
INFO - Successfully created corpus: projects/.../locations/us-central1/ragCorpora/...
INFO - Importing file: gs://.../volleyball-rules.pdf
INFO - Successfully imported file: projects/.../locations/us-central1/ragCorpora/.../ragFiles/...
INFO - Corpus info: {'name': '...', 'display_name': 'volleyball-rules-corpus', 'file_count': 1}

=== RAG Corpus Setup Complete ===
Corpus Name: projects/.../locations/us-central1/ragCorpora/[CORPUS_ID]
Display Name: volleyball-rules-corpus
Files Imported: 1

Set environment variable: RAG_CORPUS_NAME=projects/.../ragCorpora/[CORPUS_ID]
```

### 2.3 Save Corpus Name

**IMPORTANT**: Save the corpus name from the output. You'll need it for the next step.

```bash
export RAG_CORPUS_NAME="projects/atikot-org-share-project/locations/us-central1/ragCorpora/[CORPUS_ID]"
```

## Step 3: Update Helm Configuration

### 3.1 Edit values.yaml

Update `/helm/volleyball-bot/values.yaml` with the RAG corpus name:

```yaml
jobs:
  env:
    - name: RAG_CORPUS_NAME
      value: "projects/atikot-org-share-project/locations/us-central1/ragCorpora/[CORPUS_ID]"
```

Replace `[CORPUS_ID]` with the actual corpus ID from Step 2.2.

### 3.2 Deploy Updated Configuration

```bash
cd helm/volleyball-bot

# Deploy with new configuration
make deploy IMAGE_TAG=latest

# Or manually with helm
helm upgrade volleyball-bot . \
  --namespace default \
  --create-namespace \
  --install \
  --wait
```

## Step 4: Verify RAG Integration

### 4.1 Test Trivia Job Locally

```bash
cd services/jobs

# Set all required environment variables
export GCP_PROJECT_ID="atikot-org-share-project"
export TELEGRAM_CHAT_ID="-4707740966"
export VERTEX_AI_LOCATION="us-central1"
export VERTEX_AI_MODEL="gemini-1.5-pro-002"
export RAG_CORPUS_NAME="projects/.../ragCorpora/[CORPUS_ID]"
export DB_HOST="127.0.0.1"
export DB_PORT="5432"
export DB_NAME="volleyball"
export DB_USER="volleyball_app"

# Run trivia job
python trivia_job.py trivia_test
```

Expected log output:
```
INFO - Generating trivia questions...
INFO - Retrieving context for query: volleyball rules about volleyball
INFO - Retrieved 5 relevant context chunks
INFO - Generated 1 trivia questions
INFO - Sending poll to Telegram chat...
```

### 4.2 Manual Trigger in GKE

```bash
# Get GKE credentials
make get-credentials

# Manually trigger trivia job
kubectl create job --from=cronjob/volleyball-bot-trivia-tuesday test-trivia-rag

# Watch job
kubectl get jobs -w

# Check logs
kubectl logs -l job-name=test-trivia-rag -f
```

Look for these log lines indicating RAG is working:
- `Retrieving context for query: volleyball rules about volleyball`
- `Retrieved X relevant context chunks`
- `Generate X multiple-choice trivia question(s) about volleyball using the rules context above`

### 4.3 Verify Question Quality

The generated questions should now:
- Reference specific volleyball rules
- Be more accurate and detailed
- Include rule numbers or specific terminology from the official rules
- Test knowledge of actual FIVB regulations

## Troubleshooting

### Issue: "RAG corpus not configured, skipping context retrieval"

**Cause**: RAG_CORPUS_NAME environment variable not set

**Solution**:
```bash
# Verify environment variable in Helm values
kubectl describe cronjob volleyball-bot-trivia-tuesday | grep RAG_CORPUS_NAME

# Update values.yaml and redeploy
helm upgrade volleyball-bot . --namespace default
```

### Issue: "Error retrieving RAG context: 404"

**Cause**: Corpus doesn't exist or incorrect corpus name

**Solution**:
```bash
# List all corpora
gcloud ai indexes list --region=us-central1 --project=atikot-org-share-project

# Re-run setup script
python setup_rag_corpus.py
```

### Issue: "Permission denied accessing RAG corpus"

**Cause**: Service account lacks Vertex AI permissions

**Solution**:
```bash
# Grant Vertex AI User role
gcloud projects add-iam-policy-binding atikot-org-share-project \
  --member="serviceAccount:trivia-job-sa@atikot-org-share-project.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Issue: "File not found in Cloud Storage"

**Cause**: PDF not uploaded or incorrect path

**Solution**:
```bash
# Verify file exists
gcloud storage ls gs://atikot-org-share-project-volleyball-data/volleyball-rules/

# Manually upload if needed
gcloud storage cp volleyball-rules.pdf gs://atikot-org-share-project-volleyball-data/volleyball-rules/
```

### Issue: No relevant context retrieved

**Cause**: Query not matching indexed content

**Solution**:
- Check the corpus has been indexed (can take a few minutes after import)
- Try different query terms in `retrieve_volleyball_rules_context()`
- Increase `top_k` parameter for more results

## Testing Different Topics

You can customize the trivia topics by modifying the context query in `services/jobs/trivia_job.py`:

```python
# Example: Focus on serving rules
context_query = "volleyball rules about serving"

# Example: Focus on scoring
context_query = "volleyball rules about scoring and points"

# Example: Focus on player positions
context_query = "volleyball rules about player positions and rotations"
```

## Monitoring and Observability

### View RAG Queries

```bash
# Check trivia job logs for RAG retrieval
kubectl logs -l app=volleyball-bot-trivia --tail=100 | grep "Retrieving context"
```

### Monitor Vertex AI Usage

```bash
# View Vertex AI metrics in Cloud Console
gcloud logging read "resource.type=aiplatform.googleapis.com/Endpoint" --limit 50
```

## Cost Considerations

- **Cloud Storage**: ~$0.02/GB/month (PDF is 5MB = $0.0001/month)
- **Vertex AI RAG**:
  - Corpus storage: ~$0.30/GB/month
  - Query costs: ~$0.0002 per query
- **Embeddings**: Generated once during import, minimal cost

Expected monthly cost: **< $5** for typical usage (2 queries per week)

## Updating the Rules PDF

If FIVB publishes new rules:

```bash
# 1. Replace the PDF file
cp new-volleyball-rules.pdf volleyball-rules.pdf

# 2. Re-apply Terraform to upload new PDF
cd terraform
terraform apply

# 3. Delete old corpus
gcloud ai indexes delete [CORPUS_ID] --region=us-central1

# 4. Re-run setup script
cd ../services/jobs
python setup_rag_corpus.py

# 5. Update RAG_CORPUS_NAME in Helm values
# 6. Redeploy
```

## Advanced Configuration

### Chunking Strategy

Modify chunk size and overlap in `setup_rag_corpus.py`:

```python
file_name = setup.import_file(
    corpus_name=corpus_name,
    gcs_uri=gcs_uri,
    chunk_size=2048,     # Larger chunks for more context
    chunk_overlap=400,   # More overlap for continuity
)
```

### Retrieval Parameters

Adjust retrieval in `trivia_job.py`:

```python
retrieved_context = self.retrieve_volleyball_rules_context(
    query=context_query,
    top_k=10  # Retrieve more chunks for broader context
)
```

## Next Steps

1. Monitor question quality over a few weeks
2. Collect user feedback on trivia questions
3. Consider adding more volleyball-related documents (coaching guides, strategy documents)
4. Implement topic rotation to cover all rule sections evenly

## References

- [Vertex AI RAG Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/rag-api)
- [FIVB Official Rules](https://www.fivb.com/en/volleyball/thegame_glossary)
- [Terraform Google Provider - Storage](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket)
