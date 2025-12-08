# Bastion VM for accessing Cloud SQL via IAP
resource "google_compute_instance" "bastion" {
  name         = "cloudsql-bastion"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 10
    }
  }

  network_interface {
    network    = google_compute_network.vpc.name
    subnetwork = google_compute_subnetwork.subnet.name
    # No external IP - access via IAP only
  }

  # Install PostgreSQL client on startup
  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y postgresql-client
  EOF

  # Allow IAP access
  tags = ["iap-bastion"]

  service_account {
    email  = google_service_account.bastion.email
    scopes = ["cloud-platform"]
  }

  depends_on = [
    google_project_service.required_apis,
    google_compute_firewall.allow_iap_ssh,
  ]
}

# Service account for bastion
resource "google_service_account" "bastion" {
  account_id   = "cloudsql-bastion-sa"
  display_name = "Cloud SQL Bastion Service Account"
}

# Allow bastion to access Cloud SQL
resource "google_project_iam_member" "bastion_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.bastion.email}"
}

# Allow bastion to access secrets
resource "google_secret_manager_secret_iam_member" "bastion_secret_accessor" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.bastion.email}"
}

# Firewall rule to allow IAP SSH access
resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "${var.vpc_name}-allow-iap-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # IAP's IP range
  source_ranges = ["35.235.240.0/20"]

  target_tags = ["iap-bastion"]
}
