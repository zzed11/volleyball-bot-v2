#!/usr/bin/env python3
"""
Game poll job for attendance tracking.

This job:
1. Finds the next scheduled game
2. Creates a poll asking who will attend
3. Posts the poll to Telegram
4. Records the poll in the database
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

from db.models import Poll, GameSchedule
from common import JobConfig, get_db_session, record_job_run, send_telegram_poll

logger = logging.getLogger(__name__)


async def run_game_poll_job(job_name: str = "game_poll_tuesday"):
    """Main game poll job execution"""
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

        # Find the next scheduled game (within next 7 days)
        logger.info("Finding next scheduled game...")
        next_week = datetime.utcnow() + timedelta(days=7)

        game = (
            db_session.query(GameSchedule)
            .filter(
                GameSchedule.game_date > datetime.utcnow(),
                GameSchedule.game_date <= next_week,
            )
            .order_by(GameSchedule.game_date)
            .first()
        )

        if not game:
            logger.warning("No upcoming games found in the next 7 days")
            # Create a generic poll anyway
            game_date_str = "this week"
            game_location = "TBD"
            game_id = None
        else:
            game_date_str = game.game_date.strftime("%A, %B %d at %I:%M %p")
            game_location = game.location
            game_id = game.id
            logger.info(f"Found game: {game_date_str} at {game_location}")

        # Create poll question
        question = f"Who's coming to the game on {game_date_str}?"

        # Poll options
        options = ["I'm in!", "Maybe", "Can't make it"]

        # Send poll to Telegram
        logger.info(f"Sending game poll to Telegram chat: {config.telegram_chat_id}")

        # First send a message with game details
        if game:
            game_details = (
                f"🏐 Game Alert!\n\n"
                f"📅 When: {game_date_str}\n"
                f"📍 Where: {game_location}\n"
                f"{game.description or ''}\n\n"
                f"Please vote in the poll below!"
            )
            await bot.send_message(chat_id=config.telegram_chat_id, text=game_details)

        # Send the poll
        poll_id = await send_telegram_poll(
            bot=bot,
            chat_id=config.telegram_chat_id,
            question=question,
            options=options,
            is_anonymous=False,
        )

        # Record poll in database
        logger.info(f"Recording poll in database: {poll_id}")
        poll = Poll(
            poll_id=poll_id,
            poll_type="game",
            day_of_week=datetime.utcnow().strftime("%A"),
            title=question,
            game_id=game_id,
            created_at=datetime.utcnow(),
        )
        db_session.add(poll)
        db_session.commit()

        # Record successful job run
        record_job_run(
            db_session,
            job_name=job_name,
            status="success",
            payload={
                "poll_id": poll_id,
                "game_id": game_id,
                "game_date": game_date_str if game else None,
            },
        )

        logger.info(f"Game poll job completed successfully. Poll ID: {poll_id}")

    except Exception as e:
        logger.error(f"Game poll job failed: {e}", exc_info=True)

        if db_session:
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
        sys.argv[1] if len(sys.argv) > 1 else os.getenv("JOB_NAME", "game_poll_tuesday")
    )

    logger.info(f"Starting game poll job: {job_name}")
    asyncio.run(run_game_poll_job(job_name))


if __name__ == "__main__":
    main()
