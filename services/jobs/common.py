"""Common utilities for job scripts"""

import os
import sys
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from google.cloud import secretmanager
from aiogram import Bot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class JobConfig:
    """Configuration for job scripts"""

    def __init__(self):
        self.project_id = os.getenv("GCP_PROJECT_ID", "")
        self.db_host = os.getenv("DB_HOST", "127.0.0.1")
        self.db_port = int(os.getenv("DB_PORT", "5432"))
        self.db_name = os.getenv("DB_NAME", "volleyball")
        self.db_user = os.getenv("DB_USER", "volleyball_app")
        self.db_password = None
        self.telegram_bot_token = None
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
        # RAG Engine supported regions: us-west1, europe-west1, europe-west2, asia-northeast1
        self.vertex_ai_location = os.getenv("VERTEX_AI_LOCATION", "us-west1")
        # Use gemini-1.5-pro (stable version available in all regions)
        self.vertex_ai_model = os.getenv("VERTEX_AI_MODEL", "gemini-1.5-pro")
        self.rag_corpus_name = os.getenv("RAG_CORPUS_NAME", "")

        # Load secrets
        self.load_secrets()

    def load_secrets(self):
        """Load secrets from GCP Secret Manager"""
        if not self.project_id:
            logger.warning("GCP_PROJECT_ID not set, skipping Secret Manager")
            return

        try:
            client = secretmanager.SecretManagerServiceClient()

            # Load database password
            try:
                name = f"projects/{self.project_id}/secrets/db-password/versions/latest"
                response = client.access_secret_version(request={"name": name})
                self.db_password = response.payload.data.decode("UTF-8")
            except Exception as e:
                logger.error(f"Could not load db-password: {e}")

            # Load Telegram bot token
            try:
                name = f"projects/{self.project_id}/secrets/telegram-bot-token/versions/latest"
                response = client.access_secret_version(request={"name": name})
                self.telegram_bot_token = response.payload.data.decode("UTF-8")
            except Exception as e:
                logger.error(f"Could not load telegram-bot-token: {e}")

        except Exception as e:
            logger.error(f"Error loading secrets: {e}")

    @property
    def database_url(self) -> str:
        """Get database connection URL"""
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


def get_db_session(config: JobConfig):
    """Create database session"""
    engine = create_engine(config.database_url, echo=False)
    Session = sessionmaker(bind=engine)
    return Session()


def record_job_run(
    session,
    job_name: str,
    status: str,
    error_message: Optional[str] = None,
    payload: Optional[dict] = None,
):
    """Record job run in database"""
    from datetime import datetime

    # Import here to avoid circular dependency
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../bot-api"))
    from db.models import JobDefinition, JobRun

    # Find job definition
    job = session.query(JobDefinition).filter_by(name=job_name).first()

    if not job:
        logger.warning(f"Job definition not found for: {job_name}")
        return

    # Create job run record
    job_run = JobRun(
        job_id=job.id,
        scheduled_time=datetime.utcnow(),
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow() if status in ["success", "failed"] else None,
        status=status,
        error_message=error_message,
        payload=payload,
    )

    session.add(job_run)
    session.commit()

    logger.info(f"Job run recorded: {job_name} - {status}")


async def send_telegram_poll(
    bot: Bot, chat_id: str, question: str, options: list, is_anonymous: bool = False
) -> str:
    """Send a poll to Telegram chat and return poll_id"""
    message = await bot.send_poll(
        chat_id=chat_id, question=question, options=options, is_anonymous=is_anonymous
    )
    return message.poll.id


async def send_telegram_message(bot: Bot, chat_id: str, text: str):
    """Send a message to Telegram chat"""
    await bot.send_message(chat_id=chat_id, text=text)
