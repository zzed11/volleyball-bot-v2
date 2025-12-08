output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cloudsql_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "cloudsql_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "database_name" {
  description = "Database name"
  value       = google_sql_database.database.name
}

output "database_user" {
  description = "Database user"
  value       = google_sql_user.app_user.name
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "bot_api_service_account" {
  description = "Bot API service account email"
  value       = google_service_account.bot_api.email
}

output "trivia_job_service_account" {
  description = "Trivia job service account email"
  value       = google_service_account.trivia_job.email
}

output "game_poll_job_service_account" {
  description = "Game poll job service account email"
  value       = google_service_account.game_poll_job.email
}

output "notification_job_service_account" {
  description = "Notification job service account email"
  value       = google_service_account.notification_job.email
}

output "github_actions_service_account" {
  description = "GitHub Actions service account email"
  value       = var.github_repository != "" ? google_service_account.github_actions[0].email : ""
}

output "workload_identity_provider" {
  description = "Workload Identity Provider for GitHub Actions"
  value       = var.github_repository != "" ? google_iam_workload_identity_pool_provider.github_provider[0].name : ""
}

output "vpc_name" {
  description = "VPC network name"
  value       = google_compute_network.vpc.name
}

output "subnet_name" {
  description = "Subnet name"
  value       = google_compute_subnetwork.subnet.name
}

output "configure_kubectl_command" {
  description = "Command to configure kubectl"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --region ${var.region} --project ${var.project_id}"
}

output "database_connection_string" {
  description = "Database connection string (without password)"
  value       = "postgresql://${google_sql_user.app_user.name}:PASSWORD@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.database.name}"
  sensitive   = true
}
