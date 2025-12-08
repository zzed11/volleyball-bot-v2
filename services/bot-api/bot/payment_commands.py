"""Payment-related bot commands"""
import logging
import re
from datetime import datetime, timedelta
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from db import AsyncSessionLocal, GameSchedule, Player, EventPayment
from api.payments import get_game_budget, get_game_forecast

logger = logging.getLogger(__name__)

# Create router for payment commands
payment_command_router = Router()


async def get_today_game(db: AsyncSession):
    """Helper to find today's game"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    result = await db.execute(
        select(GameSchedule).where(
            and_(
                GameSchedule.game_date >= today_start,
                GameSchedule.game_date < today_end
            )
        ).order_by(GameSchedule.game_date)
    )
    return result.scalar_one_or_none()


async def find_player_by_username(db: AsyncSession, username: str):
    """Helper to find player by username (with or without @)"""
    username = username.lstrip("@")
    result = await db.execute(
        select(Player).where(Player.username == username)
    )
    return result.scalar_one_or_none()


@payment_command_router.message(Command("who_paid"))
async def cmd_who_paid(message: Message):
    """Show list of players who paid for today's game"""
    async with AsyncSessionLocal() as db:
        game = await get_today_game(db)

        if not game:
            await message.answer("No game scheduled for today.")
            return

        # Get all confirmed payments
        result = await db.execute(
            select(EventPayment, Player)
            .join(Player, EventPayment.player_id == Player.id)
            .where(
                and_(
                    EventPayment.game_id == game.id,
                    EventPayment.status == "confirmed"
                )
            )
            .order_by(EventPayment.paid_at)
        )
        payments = result.all()

        if not payments:
            await message.answer("No payments recorded yet for today's game.")
            return

        # Format response
        response = f"💰 Paid Players ({len(payments)}):\n\n"
        total = 0
        for idx, (payment, player) in enumerate(payments, 1):
            name = player.display_name or player.username or f"Player {player.id}"
            response += f"{idx}. {name} - {float(payment.amount):.2f} {payment.currency}\n"
            total += float(payment.amount)

        response += f"\n💵 Total collected: {total:.2f} {payments[0][0].currency if payments else 'ILS'}"

        await message.answer(response)


@payment_command_router.message(Command("who_not_paid"))
async def cmd_who_not_paid(message: Message):
    """Show list of players who registered but haven't paid"""
    async with AsyncSessionLocal() as db:
        game = await get_today_game(db)

        if not game:
            await message.answer("No game scheduled for today.")
            return

        # Use the budget endpoint logic
        try:
            budget = await get_game_budget(game.id, db)

            if not budget.unpaid_players:
                await message.answer("All registered players have paid! 🎉")
                return

            # Format response
            response = f"⚠️ Unpaid Players ({len(budget.unpaid_players)}):\n\n"
            for idx, player in enumerate(budget.unpaid_players, 1):
                name = player.display_name or player.username or f"Player {player.player_id}"
                amount = player.amount_due if player.amount_due else 0
                response += f"{idx}. {name} - {amount:.2f} ILS due\n"

            response += f"\n💰 Expected: {len(budget.unpaid_players) * budget.price_per_player:.2f} ILS"

            await message.answer(response)

        except Exception as e:
            logger.error(f"Error getting unpaid players: {e}", exc_info=True)
            await message.answer("Error retrieving unpaid player list.")


@payment_command_router.message(Command("budget_today"))
async def cmd_budget_today(message: Message):
    """Show budget summary for today's game"""
    async with AsyncSessionLocal() as db:
        game = await get_today_game(db)

        if not game:
            await message.answer("No game scheduled for today.")
            return

        try:
            budget = await get_game_budget(game.id, db)

            response = f"📊 Budget for {game.location}\n"
            response += f"📅 {game.game_date.strftime('%A, %B %d at %I:%M %p')}\n\n"
            response += f"💵 Price per player: {budget.price_per_player:.2f} ILS\n"
            response += f"👥 Registered: {budget.registered_players}\n"
            response += f"✅ Paid: {budget.number_of_payers}\n"
            response += f"❌ Unpaid: {len(budget.unpaid_players)}\n\n"
            response += f"💰 Expected income: {budget.expected_income:.2f} ILS\n"
            response += f"✅ Actual income: {budget.actual_income:.2f} ILS\n"

            collection_rate = (budget.actual_income / budget.expected_income * 100) if budget.expected_income > 0 else 0
            response += f"📈 Collection rate: {collection_rate:.1f}%"

            await message.answer(response)

        except Exception as e:
            logger.error(f"Error getting budget: {e}", exc_info=True)
            await message.answer("Error retrieving budget information.")


@payment_command_router.message(Command("forecast_today"))
async def cmd_forecast_today(message: Message):
    """Show forecast for today's game"""
    async with AsyncSessionLocal() as db:
        game = await get_today_game(db)

        if not game:
            await message.answer("No game scheduled for today.")
            return

        try:
            forecast = await get_game_forecast(game.id, db)

            response = f"🔮 Forecast for {game.location}\n"
            response += f"📅 {game.game_date.strftime('%A, %B %d at %I:%M %p')}\n\n"
            response += f"👥 Expected players: {forecast.forecasted_players}\n"
            response += f"💰 Expected income: {forecast.forecasted_income:.2f} ILS\n"
            response += f"📊 Confidence: {forecast.confidence_level}\n"
            response += f"🔧 Method: {forecast.method}\n\n"

            if forecast.historical_data:
                hist = forecast.historical_data
                response += f"📚 Based on {hist.get('historical_games_count', 0)} similar games"

            await message.answer(response)

        except Exception as e:
            logger.error(f"Error getting forecast: {e}", exc_info=True)
            await message.answer("Error retrieving forecast.")


# Admin commands for marking payments
@payment_command_router.message(Command("mark_paid"))
async def cmd_mark_paid(message: Message):
    """
    Mark a player as paid for a game.
    Usage: /mark_paid <game_id> <@username> <amount>
    Or: /mark_paid <@username> <amount> (for today's game)
    """
    # Parse command
    parts = message.text.split()

    if len(parts) < 3:
        await message.answer(
            "Usage: /mark_paid <game_id> <@username> <amount>\n"
            "Or: /mark_paid <@username> <amount> (for today's game)"
        )
        return

    async with AsyncSessionLocal() as db:
        try:
            # Determine if game_id is provided
            if parts[1].isdigit() and not parts[1].startswith("@"):
                game_id = int(parts[1])
                username = parts[2]
                amount = float(parts[3]) if len(parts) > 3 else 0

                game_result = await db.execute(select(GameSchedule).where(GameSchedule.id == game_id))
                game = game_result.scalar_one_or_none()
            else:
                # Use today's game
                game = await get_today_game(db)
                username = parts[1]
                amount = float(parts[2]) if len(parts) > 2 else 0

            if not game:
                await message.answer("Game not found.")
                return

            # Use default price if amount not specified
            if amount == 0:
                amount = float(game.price_per_player) if game.price_per_player else 0

            # Find player
            player = await find_player_by_username(db, username)

            if not player:
                await message.answer(f"Player {username} not found in database.")
                return

            # Check if payment already exists
            existing = await db.execute(
                select(EventPayment).where(
                    and_(
                        EventPayment.game_id == game.id,
                        EventPayment.player_id == player.id
                    )
                )
            )

            if existing.scalar_one_or_none():
                await message.answer(f"Payment already recorded for {username}.")
                return

            # Create payment
            payment = EventPayment(
                game_id=game.id,
                player_id=player.id,
                amount=Decimal(str(amount)),
                currency="ILS",
                method="paybox",
                status="confirmed",
                paid_at=datetime.utcnow()
            )

            db.add(payment)
            await db.commit()

            await message.answer(
                f"✅ Payment recorded:\n"
                f"Player: {player.display_name or player.username}\n"
                f"Amount: {amount:.2f} ILS\n"
                f"Game: {game.game_date.strftime('%Y-%m-%d')}"
            )

        except ValueError:
            await message.answer("Invalid amount. Please provide a valid number.")
        except Exception as e:
            logger.error(f"Error marking payment: {e}", exc_info=True)
            await message.answer("Error recording payment.")
            await db.rollback()


@payment_command_router.message(Command("mark_unpaid"))
async def cmd_mark_unpaid(message: Message):
    """
    Remove payment record (mark as unpaid).
    Usage: /mark_unpaid <game_id> <@username>
    Or: /mark_unpaid <@username> (for today's game)
    """
    parts = message.text.split()

    if len(parts) < 2:
        await message.answer(
            "Usage: /mark_unpaid <game_id> <@username>\n"
            "Or: /mark_unpaid <@username> (for today's game)"
        )
        return

    async with AsyncSessionLocal() as db:
        try:
            # Determine if game_id is provided
            if parts[1].isdigit() and not parts[1].startswith("@"):
                game_id = int(parts[1])
                username = parts[2] if len(parts) > 2 else None

                game_result = await db.execute(select(GameSchedule).where(GameSchedule.id == game_id))
                game = game_result.scalar_one_or_none()
            else:
                game = await get_today_game(db)
                username = parts[1]

            if not game:
                await message.answer("Game not found.")
                return

            if not username:
                await message.answer("Please provide a username.")
                return

            # Find player
            player = await find_player_by_username(db, username)

            if not player:
                await message.answer(f"Player {username} not found.")
                return

            # Find and delete payment
            result = await db.execute(
                select(EventPayment).where(
                    and_(
                        EventPayment.game_id == game.id,
                        EventPayment.player_id == player.id
                    )
                )
            )
            payment = result.scalar_one_or_none()

            if not payment:
                await message.answer(f"No payment found for {username}.")
                return

            await db.delete(payment)
            await db.commit()

            await message.answer(
                f"❌ Payment removed:\n"
                f"Player: {player.display_name or player.username}\n"
                f"Game: {game.game_date.strftime('%Y-%m-%d')}"
            )

        except Exception as e:
            logger.error(f"Error removing payment: {e}", exc_info=True)
            await message.answer("Error removing payment.")
            await db.rollback()
