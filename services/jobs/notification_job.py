#!/usr/bin/env python3
"""
Game notification job.

This job:
1. Finds games that need notification
2. Sends notification messages to Telegram
3. Marks games as notified
4. Records the job run
"""
import asyncio
import logging
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../bot-api"))

from aiogram import Bot
from sqlalchemy import select

from db.models import GameSchedule
from common import JobConfig, get_db_session, record_job_run, send_telegram_message

logger = logging.getLogger(__name__)


async def run_notification_job(job_name: str = "notification_monday"):
    """Main notification job execution"""
    config = JobConfig()

    # Validate configuration
    if not config.telegram_bot_token:
        logger.error("Telegram bot token not configured")
        sys.exit(1)

    if not config.telegram_chat_id:
        logger.error("Telegram chat ID not configured")
        sys.exit(1)

    db_session = None
    bot = None

    try:
        # Initialize database session
        db_session = get_db_session(config)

        # Initialize Telegram bot
        bot = Bot(token=config.telegram_bot_token)

        # Find games that need notification (next 7 days, not yet notified)
        logger.info("Finding games that need notification...")
        next_week = datetime.utcnow() + timedelta(days=7)

        games = (
            db_session.query(GameSchedule)
            .filter(
                GameSchedule.game_date > datetime.utcnow(),
                GameSchedule.game_date <= next_week,
                GameSchedule.notified == False,
            )
            .order_by(GameSchedule.game_date)
            .all()
        )

        if not games:
            logger.info("No games need notification at this time")
            record_job_run(
                db_session,
                job_name=job_name,
                status="success",
                payload={"games_notified": 0},
            )
            return

        logger.info(f"Found {len(games)} game(s) to notify")

        # Send notifications for each game
        notified_count = 0
        for game in games:
            game_date_str = game.game_date.strftime("%A, %B %d at %I:%M %p")

            # Create notification message
            message = (
                f"🏐 Upcoming Game Reminder!\n\n"
                f"📅 When: {game_date_str}\n"
                f"📍 Where: {game.location}\n"
            )

            if game.description:
                message += f"\n{game.description}\n"

            message += f"\nSee you there! 🎉"

            # Send notification
            logger.info(f"Sending notification for game on {game_date_str}")
            await send_telegram_message(
                bot=bot, chat_id=config.telegram_chat_id, text=message
            )

            # Mark game as notified
            game.notified = True
            notified_count += 1

        # Commit all updates
        db_session.commit()

        # Record successful job run
        record_job_run(
            db_session,
            job_name=job_name,
            status="success",
            payload={
                "games_notified": notified_count,
                "game_ids": [g.id for g in games],
            },
        )

        logger.info(
            f"Notification job completed successfully. Notified {notified_count} game(s)"
        )

    except Exception as e:
        logger.error(f"Notification job failed: {e}", exc_info=True)

        if db_session:
            db_session.rollback()
            record_job_run(
                db_session, job_name=job_name, status="failed", error_message=str(e)
            )

        sys.exit(1)

    finally:
        if db_session:
            db_session.close()

        if bot:
            await bot.session.close()


def main():
    """Entry point"""
    # Determine job name from command line or environment
    job_name = (
        sys.argv[1]
        if len(sys.argv) > 1
        else os.getenv("JOB_NAME", "notification_monday")
    )

    logger.info(f"Starting notification job: {job_name}")
    asyncio.run(run_notification_job(job_name))


if __name__ == "__main__":
    main()
