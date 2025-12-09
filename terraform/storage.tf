# Cloud Storage bucket for volleyball rules and RAG data
resource "google_storage_bucket" "volleyball_data" {
  name          = "${var.project_id}-volleyball-data"
  location      = var.region
  force_destroy = true  # Allow deletion with objects (set to false for production)

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    app         = "volleyball-bot"
    environment = "production"
    purpose     = "rag-data"
  }
}

# Upload volleyball rules PDF to bucket
resource "google_storage_bucket_object" "volleyball_rules" {
  name   = "volleyball-rules/volleyball-rules.pdf"
  bucket = google_storage_bucket.volleyball_data.name
  source = "../volleyball-rules.pdf"

  content_type = "application/pdf"

  lifecycle {
    ignore_changes = [
      detect_md5hash,
    ]
  }
}

# IAM binding for trivia job to read from bucket
resource "google_storage_bucket_iam_member" "trivia_job_reader" {
  bucket = google_storage_bucket.volleyball_data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.trivia_job.email}"
}
