# Secret for Telegram Bot Token (placeholder - add actual value manually)
resource "google_secret_manager_secret" "telegram_bot_token" {
  secret_id = "telegram-bot-token"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

# Note: You need to manually add the secret version with the actual token
# Run: echo -n "YOUR_TOKEN" | gcloud secrets versions add telegram-bot-token --data-file=-

# Grant access to bot-api
resource "google_secret_manager_secret_iam_member" "bot_api_telegram_token" {
  secret_id = google_secret_manager_secret.telegram_bot_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.bot_api.email}"
}

# Grant access to all job service accounts
resource "google_secret_manager_secret_iam_member" "trivia_job_telegram_token" {
  secret_id = google_secret_manager_secret.telegram_bot_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.trivia_job.email}"
}

resource "google_secret_manager_secret_iam_member" "game_poll_job_telegram_token" {
  secret_id = google_secret_manager_secret.telegram_bot_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.game_poll_job.email}"
}

resource "google_secret_manager_secret_iam_member" "notification_job_telegram_token" {
  secret_id = google_secret_manager_secret.telegram_bot_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.notification_job.email}"
}

# Authentication secrets for volley-balance-api

# Session secret
resource "google_secret_manager_secret" "session_secret" {
  secret_id = "session-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

# Google OAuth Client ID
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "google-client-id"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

# Google OAuth Client Secret
resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "google-client-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

# Grant balance-api access to authentication secrets
resource "google_secret_manager_secret_iam_member" "balance_api_session_secret" {
  secret_id = google_secret_manager_secret.session_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.balance_api.email}"
}

resource "google_secret_manager_secret_iam_member" "balance_api_google_client_id" {
  secret_id = google_secret_manager_secret.google_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.balance_api.email}"
}

resource "google_secret_manager_secret_iam_member" "balance_api_google_client_secret" {
  secret_id = google_secret_manager_secret.google_client_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.balance_api.email}"
}
