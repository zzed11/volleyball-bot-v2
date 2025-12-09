# RAG Corpus Setup Guide

## Overview

This guide documents the Vertex AI RAG (Retrieval-Augmented Generation) corpus setup for the Volleyball Community Bot trivia feature.

## What Was Set Up

### 1. RAG Corpus Created ✅
- **Corpus Name**: `volleyball-rules-corpus`
- **Location**: `us-west1`
- **Corpus ID**: `projects/atikot-org-share-project/locations/us-west1/ragCorpora/4611686018427387904`
- **Description**: Official FIVB Volleyball Rules 2025-2028 for trivia generation
- **Files Imported**: 1 (volleyball-rules.pdf)
- **Chunking Config**: 1024 tokens per chunk, 200 token overlap

### 2. Code Integration ✅
- `services/jobs/trivia_job.py` - Already has RAG integration
- `services/jobs/common.py` - Updated default location to `us-west1`
- `helm/volleyball-bot/values.yaml` - Updated with RAG configuration
- `services/jobs/setup_rag_corpus.py` - Setup script (for future updates)

### 3. Testing ✅
- RAG context retrieval: **Working** (successfully retrieves volleyball rules)
- Test script: `services/jobs/test_rag_trivia.py`

## Important: Regional Limitation ⚠️

### The Challenge

There's a regional compatibility issue:
- **RAG Engine** is available in: `us-west1`, `europe-west1`, `europe-west2`, `asia-northeast1`
- **RAG Engine** is RESTRICTED in: `us-central1`, `us-east4` (for new projects)
- **Gemini models** may not be available in all RAG-supported regions

The current setup uses `us-west1` for RAG, but Gemini models may not be available in that region.

### Solutions

#### Option 1: Use Compatible Region (Recommended)
Move both RAG corpus and Gemini to a region that supports both:
- `europe-west1` (recommended - supports both RAG and Gemini)
- `asia-northeast1` (alternative)

**Steps**:
1. Run `setup_rag_corpus.py` with `VERTEX_AI_LOCATION=europe-west1`
2. Update Helm values to use `europe-west1`
3. Test trivia generation

#### Option 2: Cross-Region Access
Keep RAG in `us-west1` but use `us-central1` for Gemini:
- **Pros**: RAG stays in current location
- **Cons**: Cross-region calls (may have latency), more complex config

**Implementation**:
```python
# In trivia_job.py, modify TriviaGenerator
def __init__(self, config: JobConfig):
    self.rag_location = "us-west1"  # For RAG retrieval
    self.model_location = "us-central1"  # For Gemini

    # Initialize RAG with us-west1
    vertexai.init(project=config.project_id, location=self.rag_location)
    # ... RAG setup ...

def generate_trivia_questions(...):
    # Reinitialize for Gemini in us-central1
    vertexai.init(project=self.config.project_id, location=self.model_location)
    model = GenerativeModel(self.model_name)
    # ... generate ...
```

#### Option 3: Request Allowlisting
Contact Google to get your project allowlisted for RAG in `us-central1`:
- Email: `vertex-ai-rag-engine-support@google.com`
- **Pros**: Use your preferred region
- **Cons**: Requires approval, may take time

## Current Configuration

### Environment Variables (Helm values.yaml)
```yaml
- name: VERTEX_AI_LOCATION
  value: "us-west1"  # RAG Engine supported region
- name: VERTEX_AI_MODEL
  value: "gemini-1.5-pro"
- name: RAG_CORPUS_NAME
  value: "projects/atikot-org-share-project/locations/us-west1/ragCorpora/4611686018427387904"
```

### Files Updated
1. `services/jobs/common.py` - Default region changed to `us-west1`
2. `services/jobs/setup_rag_corpus.py` - Default region changed to `us-west1`
3. `helm/volleyball-bot/values.yaml` - RAG configuration added
4. `services/jobs/test_rag_trivia.py` - Test script created

## Testing

### Local Test (RAG retrieval only)
```bash
cd services/jobs
./venv-3.12/bin/python test_rag_trivia.py
```

**Expected Result**:
- ✅ RAG context retrieval works
- ⚠️  Gemini generation may fail due to region (fallback question is used)

### Full Integration Test
Requires:
- Telegram bot token in Secret Manager
- Database connection
- Chat ID configured

## Next Steps

### Immediate Actions
1. **Choose Solution** from options above
2. **Recommended**: Move to `europe-west1`
   ```bash
   cd services/jobs
   export GCP_PROJECT_ID=atikot-org-share-project
   export STORAGE_BUCKET_NAME=atikot-org-share-project-volleyball-data
   export VERTEX_AI_LOCATION=europe-west1
   ./venv-3.12/bin/python setup_rag_corpus.py
   ```

3. **Update Configuration**
   - Update `helm/volleyball-bot/values.yaml` with new corpus name
   - Update `VERTEX_AI_LOCATION` to `europe-west1`

4. **Test End-to-End**
   ```bash
   ./venv-3.12/bin/python test_rag_trivia.py
   ```

### Deployment
Once testing is successful:

1. **Build & Push Docker Images**
   ```bash
   # From project root
   make docker-build IMAGE_TAG=v1.1.0-rag
   make docker-push IMAGE_TAG=v1.1.0-rag
   ```

2. **Deploy to GKE**
   ```bash
   make deploy IMAGE_TAG=v1.1.0-rag
   ```

3. **Verify Deployment**
   ```bash
   kubectl get cronjobs
   kubectl get pods -l app=volleyball-bot
   ```

4. **Test Trivia Job Manually**
   ```bash
   kubectl create job --from=cronjob/volleyball-bot-trivia-tuesday test-trivia-rag
   kubectl logs -f job/test-trivia-rag
   ```

## Maintenance

### Updating Volleyball Rules PDF
When new rules are released:

1. Upload new PDF to Cloud Storage:
   ```bash
   gsutil cp volleyball-rules-new.pdf gs://atikot-org-share-project-volleyball-data/volleyball-rules/volleyball-rules.pdf
   ```

2. Re-import to RAG corpus:
   ```bash
   cd services/jobs
   ./venv-3.12/bin/python setup_rag_corpus.py
   ```

### Monitoring
- Check job logs: `kubectl logs -l job-name=volleyball-bot-trivia-tuesday`
- Check CronJob status: `kubectl get cronjobs`
- Verify RAG queries in Cloud Logging

## Troubleshooting

### RAG Corpus Not Found
- Verify `RAG_CORPUS_NAME` environment variable is set correctly
- Check corpus exists: Use GCP Console → Vertex AI → RAG Engine

### Region Errors
- Ensure RAG corpus and model are in compatible regions
- Check [Vertex AI regions documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)

### No Context Retrieved
- Verify volleyball-rules.pdf was successfully imported
- Check file exists in corpus via GCP Console
- Ensure query is relevant to volleyball rules

### Trivia Questions Not Based on Rules
- Check RAG retrieval is returning contexts (see logs)
- Verify contexts are being included in Gemini prompt
- Adjust `similarity_top_k` parameter if needed

## Resources

- [Vertex AI RAG Engine Overview](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview)
- [RAG Supported Regions](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview#supported-regions)
- [Gemini Model Versions](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)

## Summary

✅ **What's Working**:
- RAG corpus created with volleyball rules
- RAG context retrieval functioning correctly
- Code integrated and ready to deploy

⚠️ **Action Required**:
- Choose region strategy (recommended: europe-west1)
- Update configuration accordingly
- Test end-to-end with Gemini generation
- Deploy to GKE

The infrastructure is ready - just need to resolve the regional compatibility to enable full RAG-powered trivia generation!
