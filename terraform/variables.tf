variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "europe-west1-b"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "gke_cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "volleyball-cluster"
}

variable "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "volleyball-db"
}

variable "cloudsql_database_name" {
  description = "Database name"
  type        = string
  default     = "volleyball"
}

variable "cloudsql_user" {
  description = "Database user"
  type        = string
  default     = "volleyball_app"
}

variable "artifact_registry_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "volleyball-images"
}

variable "vpc_name" {
  description = "VPC name"
  type        = string
  default     = "volleyball-vpc"
}

variable "subnet_cidr" {
  description = "Subnet CIDR range"
  type        = string
  default     = "10.0.0.0/24"
}

variable "pods_cidr" {
  description = "GKE pods secondary CIDR range"
  type        = string
  default     = "10.1.0.0/16"
}

variable "services_cidr" {
  description = "GKE services secondary CIDR range"
  type        = string
  default     = "10.2.0.0/16"
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = ""
}
