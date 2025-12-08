# Example Terraform variables file
# Copy this to terraform.tfvars and fill in your values

project_id              = "atikot-org-share-project"
region                  = "us-central1"
zone                    = "us-central1-a"
environment             = "production"
gke_cluster_name        = "volleyball-cluster"
cloudsql_instance_name  = "volleyball-db"
cloudsql_database_name  = "volleyball"
cloudsql_user           = "volleyball_app"
artifact_registry_name  = "volleyball-images"
vpc_name                = "volleyball-vpc"
github_repository       = "zzed11/volleyball-bot-v2"  # Format: owner/repo
