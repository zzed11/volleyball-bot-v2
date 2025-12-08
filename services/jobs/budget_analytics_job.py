#!/usr/bin/env python3
"""
Budget analytics job - precomputes budget and forecast metrics.

This job:
1. Finds upcoming games (next 7 days)
2. Computes budget metrics (expected vs actual income, paid/unpaid players)
3. Computes forecast metrics (expected attendance/revenue)
4. Caches results in budget_cache and forecast_cache tables
5. Records job execution in job_runs
"""
import asyncio
import logging
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../bot-api"))

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    GameSchedule,
    EventPayment,
    Player,
    Poll,
    PollVote,
    BudgetCache,
    ForecastCache,
)
from db.database import AsyncSessionLocal
from common import JobConfig, record_job_run, get_db_session

logger = logging.getLogger(__name__)


async def compute_budget_for_game(db: AsyncSession, game: GameSchedule) -> dict:
    """Compute budget metrics for a single game"""

    # Get all confirmed payments
    payments_result = await db.execute(
        select(EventPayment, Player)
        .join(Player, EventPayment.player_id == Player.id)
        .where(
            and_(EventPayment.game_id == game.id, EventPayment.status == "confirmed")
        )
    )
    payments_with_players = payments_result.all()

    # Calculate actual income
    actual_income = sum(float(payment.amount) for payment, _ in payments_with_players)
    number_of_payers = len(payments_with_players)

    # Get registered players from game poll
    poll_result = await db.execute(
        select(Poll)
        .where(and_(Poll.game_id == game.id, Poll.poll_type == "game"))
        .order_by(Poll.created_at.desc())
    )
    poll = poll_result.scalar_one_or_none()

    registered_count = 0
    unpaid_players = []
    paid_players = []

    if poll:
        # Get all votes for "I'm in!" option (assuming option_id 0)
        votes_result = await db.execute(
            select(PollVote, Player)
            .outerjoin(Player, PollVote.user_id == Player.telegram_user_id)
            .where(
                and_(
                    PollVote.poll_id == poll.poll_id,
                    PollVote.option_id == 0,  # "I'm in!" option
                )
            )
        )
        registered_players = votes_result.all()
        registered_count = len(registered_players)

        # Separate paid and unpaid
        paid_player_ids = {payment.player_id for payment, _ in payments_with_players}

        for vote, player in registered_players:
            if player:
                player_info = {
                    "player_id": player.id,
                    "telegram_user_id": player.telegram_user_id,
                    "username": player.username,
                    "display_name": player.display_name,
                }
                if player.id in paid_player_ids:
                    paid_players.append(player_info)
                else:
                    unpaid_players.append(player_info)

    # Calculate expected income
    price = float(game.price_per_player) if game.price_per_player else 0
    if game.max_players:
        expected_income = price * game.max_players
    else:
        expected_income = price * registered_count if registered_count else 0

    return {
        "expected_income": expected_income,
        "actual_income": actual_income,
        "number_of_payers": number_of_payers,
        "expected_players": game.max_players or registered_count,
        "registered_players": registered_count,
        "paid_players_list": paid_players,
        "unpaid_players_list": unpaid_players,
    }


async def compute_forecast_for_game(db: AsyncSession, game: GameSchedule) -> dict:
    """Compute forecast metrics for a single game"""

    game_weekday = game.game_date.weekday()

    # Get historical games (past completed games, same weekday/location, last 90 days)
    historical_cutoff = datetime.utcnow() - timedelta(days=90)

    # Get historical payment data
    historical_result = await db.execute(
        select(
            GameSchedule.id,
            func.count(EventPayment.id).label("payment_count"),
            func.sum(EventPayment.amount).label("total_revenue"),
        )
        .outerjoin(
            EventPayment,
            and_(
                EventPayment.game_id == GameSchedule.id,
                EventPayment.status == "confirmed",
            ),
        )
        .where(
            and_(
                GameSchedule.game_date < datetime.utcnow(),
                GameSchedule.game_date > historical_cutoff,
                func.extract("dow", GameSchedule.game_date) == game_weekday,
                GameSchedule.location == game.location,
            )
        )
        .group_by(GameSchedule.id)
    )
    historical_games = historical_result.all()

    if historical_games:
        # Calculate averages
        avg_players = sum(g.payment_count for g in historical_games) / len(
            historical_games
        )
        avg_revenue = sum(float(g.total_revenue or 0) for g in historical_games) / len(
            historical_games
        )
        confidence = (
            "high"
            if len(historical_games) >= 5
            else "medium" if len(historical_games) >= 2 else "low"
        )

        forecasted_players = int(round(avg_players))
        forecasted_income = avg_revenue
    else:
        # No historical data, use game settings
        forecasted_players = game.max_players or 16
        forecasted_income = float(game.price_per_player or 0) * forecasted_players
        confidence = "low"

    return {
        "forecasted_players": forecasted_players,
        "forecasted_income": forecasted_income,
        "confidence_level": confidence,
        "method": "historical_average",
        "metadata": {
            "historical_games_count": len(historical_games),
            "weekday": game_weekday,
            "location": game.location,
        },
    }


async def run_budget_analytics_job(job_name: str = "budget_analytics"):
    """Main budget analytics job execution"""
    config = JobConfig()

    # Use sync session for job recording
    sync_session = get_db_session(config)

    try:
        # Create async session for main work
        async with AsyncSessionLocal() as db:
            logger.info("Starting budget analytics job...")

            # Find upcoming games (next 7 days)
            today = datetime.utcnow()
            next_week = today + timedelta(days=7)

            games_result = await db.execute(
                select(GameSchedule)
                .where(
                    and_(
                        GameSchedule.game_date >= today,
                        GameSchedule.game_date <= next_week,
                    )
                )
                .order_by(GameSchedule.game_date)
            )
            games = games_result.scalars().all()

            if not games:
                logger.info("No upcoming games found in the next 7 days")
                record_job_run(
                    sync_session,
                    job_name=job_name,
                    status="success",
                    payload={"games_processed": 0},
                )
                return

            logger.info(f"Found {len(games)} upcoming games to process")

            games_processed = 0

            for game in games:
                logger.info(f"Processing game {game.id} on {game.game_date}")

                # Compute budget metrics
                budget_data = await compute_budget_for_game(db, game)

                # Update or create budget cache
                budget_cache_result = await db.execute(
                    select(BudgetCache).where(BudgetCache.game_id == game.id)
                )
                budget_cache = budget_cache_result.scalar_one_or_none()

                if budget_cache:
                    # Update existing
                    budget_cache.expected_income = Decimal(
                        str(budget_data["expected_income"])
                    )
                    budget_cache.actual_income = Decimal(
                        str(budget_data["actual_income"])
                    )
                    budget_cache.number_of_payers = budget_data["number_of_payers"]
                    budget_cache.expected_players = budget_data["expected_players"]
                    budget_cache.registered_players = budget_data["registered_players"]
                    budget_cache.paid_players_list = budget_data["paid_players_list"]
                    budget_cache.unpaid_players_list = budget_data[
                        "unpaid_players_list"
                    ]
                    budget_cache.computed_at = datetime.utcnow()
                else:
                    # Create new
                    budget_cache = BudgetCache(
                        game_id=game.id,
                        expected_income=Decimal(str(budget_data["expected_income"])),
                        actual_income=Decimal(str(budget_data["actual_income"])),
                        number_of_payers=budget_data["number_of_payers"],
                        expected_players=budget_data["expected_players"],
                        registered_players=budget_data["registered_players"],
                        paid_players_list=budget_data["paid_players_list"],
                        unpaid_players_list=budget_data["unpaid_players_list"],
                    )
                    db.add(budget_cache)

                # Compute forecast metrics
                forecast_data = await compute_forecast_for_game(db, game)

                # Update or create forecast cache
                forecast_cache_result = await db.execute(
                    select(ForecastCache).where(ForecastCache.game_id == game.id)
                )
                forecast_cache = forecast_cache_result.scalar_one_or_none()

                if forecast_cache:
                    # Update existing
                    forecast_cache.forecasted_players = forecast_data[
                        "forecasted_players"
                    ]
                    forecast_cache.forecasted_income = Decimal(
                        str(forecast_data["forecasted_income"])
                    )
                    forecast_cache.confidence_level = forecast_data["confidence_level"]
                    forecast_cache.method = forecast_data["method"]
                    forecast_cache.metadata = forecast_data["metadata"]
                    forecast_cache.computed_at = datetime.utcnow()
                else:
                    # Create new
                    forecast_cache = ForecastCache(
                        game_id=game.id,
                        forecasted_players=forecast_data["forecasted_players"],
                        forecasted_income=Decimal(
                            str(forecast_data["forecasted_income"])
                        ),
                        confidence_level=forecast_data["confidence_level"],
                        method=forecast_data["method"],
                        metadata=forecast_data["metadata"],
                    )
                    db.add(forecast_cache)

                games_processed += 1

            # Commit all changes
            await db.commit()

            logger.info(
                f"Budget analytics completed. Processed {games_processed} games."
            )

            # Record successful job run
            record_job_run(
                sync_session,
                job_name=job_name,
                status="success",
                payload={"games_processed": games_processed},
            )

    except Exception as e:
        logger.error(f"Budget analytics job failed: {e}", exc_info=True)

        record_job_run(
            sync_session, job_name=job_name, status="failed", error_message=str(e)
        )

        sys.exit(1)

    finally:
        if sync_session:
            sync_session.close()


def main():
    """Entry point"""
    job_name = (
        sys.argv[1] if len(sys.argv) > 1 else os.getenv("JOB_NAME", "budget_analytics")
    )

    logger.info(f"Starting budget analytics job: {job_name}")
    asyncio.run(run_budget_analytics_job(job_name))


if __name__ == "__main__":
    main()
