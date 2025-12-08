"""Application configuration"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from google.cloud import secretmanager


class Settings(BaseSettings):
    """Application settings"""

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    # GCP
    project_id: str = os.getenv("GCP_PROJECT_ID", "")
    region: str = os.getenv("GCP_REGION", "us-central1")

    # Telegram Bot
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = os.getenv("TELEGRAM_CHAT_ID")
    telegram_webhook_path: str = "/webhook"
    telegram_webhook_url: Optional[str] = os.getenv("TELEGRAM_WEBHOOK_URL")

    # Database
    database_host: str = os.getenv("DB_HOST", "localhost")
    database_port: int = int(os.getenv("DB_PORT", "5432"))
    database_name: str = os.getenv("DB_NAME", "volleyball")
    database_user: str = os.getenv("DB_USER", "volleyball_app")
    database_password: Optional[str] = None
    cloudsql_connection_name: Optional[str] = os.getenv("CLOUDSQL_CONNECTION_NAME")

    # API
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8080"))

    # Vertex AI
    vertex_ai_location: str = os.getenv("VERTEX_AI_LOCATION", "us-central1")
    vertex_ai_model: str = os.getenv("VERTEX_AI_MODEL", "gemini-1.5-pro-002")

    class Config:
        env_file = ".env"
        case_sensitive = False

    def load_secrets_from_secret_manager(self):
        """Load secrets from GCP Secret Manager"""
        if not self.project_id:
            return

        try:
            client = secretmanager.SecretManagerServiceClient()

            # Load Telegram bot token
            if not self.telegram_bot_token:
                try:
                    name = f"projects/{self.project_id}/secrets/telegram-bot-token/versions/latest"
                    response = client.access_secret_version(request={"name": name})
                    self.telegram_bot_token = response.payload.data.decode("UTF-8")
                except Exception as e:
                    print(f"Warning: Could not load telegram-bot-token from Secret Manager: {e}")

            # Load database password
            if not self.database_password:
                try:
                    name = f"projects/{self.project_id}/secrets/db-password/versions/latest"
                    response = client.access_secret_version(request={"name": name})
                    self.database_password = response.payload.data.decode("UTF-8")
                except Exception as e:
                    print(f"Warning: Could not load db-password from Secret Manager: {e}")

        except Exception as e:
            print(f"Error initializing Secret Manager client: {e}")

    @property
    def database_url(self) -> str:
        """Get database URL for SQLAlchemy"""
        if self.cloudsql_connection_name:
            # Using Cloud SQL Proxy sidecar
            return f"postgresql+asyncpg://{self.database_user}:{self.database_password}@127.0.0.1:5432/{self.database_name}"
        else:
            # Direct connection
            return f"postgresql+asyncpg://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"

    @property
    def database_url_sync(self) -> str:
        """Get database URL for synchronous connections"""
        if self.cloudsql_connection_name:
            return f"postgresql://{self.database_user}:{self.database_password}@127.0.0.1:5432/{self.database_name}"
        else:
            return f"postgresql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"


# Global settings instance
settings = Settings()

# Load secrets on startup
settings.load_secrets_from_secret_manager()
