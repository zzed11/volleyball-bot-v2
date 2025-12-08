# Service Account for bot-api
resource "google_service_account" "bot_api" {
  account_id   = "bot-api-sa"
  display_name = "Bot API Service Account"
  description  = "Service account for bot-api workloads"
}

# Service Account for trivia jobs
resource "google_service_account" "trivia_job" {
  account_id   = "trivia-job-sa"
  display_name = "Trivia Job Service Account"
  description  = "Service account for trivia generation jobs"
}

# Service Account for game poll jobs
resource "google_service_account" "game_poll_job" {
  account_id   = "game-poll-job-sa"
  display_name = "Game Poll Job Service Account"
  description  = "Service account for game poll jobs"
}

# Service Account for notification jobs
resource "google_service_account" "notification_job" {
  account_id   = "notification-job-sa"
  display_name = "Notification Job Service Account"
  description  = "Service account for notification jobs"
}

# IAM bindings for bot-api
resource "google_project_iam_member" "bot_api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.bot_api.email}"
}

resource "google_secret_manager_secret_iam_member" "bot_api_secret_accessor" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.bot_api.email}"
}

# IAM bindings for trivia job
resource "google_project_iam_member" "trivia_job_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.trivia_job.email}"
}

resource "google_project_iam_member" "trivia_job_aiplatform_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.trivia_job.email}"
}

resource "google_secret_manager_secret_iam_member" "trivia_job_secret_accessor" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.trivia_job.email}"
}

# IAM bindings for game poll job
resource "google_project_iam_member" "game_poll_job_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.game_poll_job.email}"
}

resource "google_secret_manager_secret_iam_member" "game_poll_job_secret_accessor" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.game_poll_job.email}"
}

# IAM bindings for notification job
resource "google_project_iam_member" "notification_job_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.notification_job.email}"
}

resource "google_secret_manager_secret_iam_member" "notification_job_secret_accessor" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.notification_job.email}"
}

# Workload Identity bindings
resource "google_service_account_iam_member" "bot_api_workload_identity" {
  service_account_id = google_service_account.bot_api.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/bot-api]"
}

resource "google_service_account_iam_member" "trivia_job_workload_identity" {
  service_account_id = google_service_account.trivia_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/trivia-job]"
}

resource "google_service_account_iam_member" "game_poll_job_workload_identity" {
  service_account_id = google_service_account.game_poll_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/game-poll-job]"
}

resource "google_service_account_iam_member" "notification_job_workload_identity" {
  service_account_id = google_service_account.notification_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/notification-job]"
}

# GitHub Actions Workload Identity Federation
resource "google_iam_workload_identity_pool" "github_pool" {
  count = var.github_repository != "" ? 1 : 0

  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub Actions"
  disabled                  = false

  depends_on = [google_project_service.required_apis]
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  count = var.github_repository != "" ? 1 : 0

  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"
  disabled                           = false

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}'"
}

# Service account for GitHub Actions
resource "google_service_account" "github_actions" {
  count = var.github_repository != "" ? 1 : 0

  account_id   = "github-actions-sa"
  display_name = "GitHub Actions Service Account"
  description  = "Service account for GitHub Actions workflows"
}

# GitHub Actions SA permissions
resource "google_project_iam_member" "github_actions_artifact_writer" {
  count = var.github_repository != "" ? 1 : 0

  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions[0].email}"
}

resource "google_project_iam_member" "github_actions_gke_developer" {
  count = var.github_repository != "" ? 1 : 0

  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.github_actions[0].email}"
}

resource "google_service_account_iam_member" "github_actions_workload_identity" {
  count = var.github_repository != "" ? 1 : 0

  service_account_id = google_service_account.github_actions[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool[0].name}/attribute.repository/${var.github_repository}"
}

# Cloud Build IAM permissions
resource "google_project_iam_member" "cloudbuild_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

data "google_project" "project" {
  project_id = var.project_id
}
