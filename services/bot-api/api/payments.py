"""Payment and budget tracking endpoints"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from db import get_db, GameSchedule, EventPayment, Player, Poll, PollVote, BudgetCache, ForecastCache

payment_router = APIRouter(prefix="/api")


# Pydantic models
class PaymentCreate(BaseModel):
    player_id: int
    amount: float
    currency: str = "ILS"
    method: str = "paybox"
    status: str = "confirmed"
    external_payment_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    game_id: int
    player_id: int
    player_username: Optional[str]
    player_display_name: Optional[str]
    amount: float
    currency: str
    paid_at: datetime
    method: str
    status: str
    external_payment_id: Optional[str]

    class Config:
        from_attributes = True


class PlayerSummary(BaseModel):
    player_id: int
    telegram_user_id: Optional[int]
    username: Optional[str]
    display_name: Optional[str]
    amount_due: Optional[float]
    paid: bool
    payment_id: Optional[int] = None


class BudgetResponse(BaseModel):
    game_id: int
    game_date: datetime
    location: str
    price_per_player: float
    max_players: Optional[int]
    expected_income: float
    actual_income: float
    number_of_payers: int
    registered_players: int
    paid_players: List[PlayerSummary]
    unpaid_players: List[PlayerSummary]


class ForecastResponse(BaseModel):
    game_id: int
    game_date: datetime
    forecasted_players: int
    forecasted_income: float
    confidence_level: str
    method: str
    historical_data: dict


# Payment CRUD endpoints
@payment_router.post("/games/{game_id}/payments", response_model=PaymentResponse)
async def create_payment(
    game_id: int,
    payment: PaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new payment record for a game.
    Admin endpoint - should be protected with authentication.
    """
    # Verify game exists
    game_result = await db.execute(select(GameSchedule).where(GameSchedule.id == game_id))
    game = game_result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Verify player exists
    player_result = await db.execute(select(Player).where(Player.id == payment.player_id))
    player = player_result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if payment already exists
    existing = await db.execute(
        select(EventPayment).where(
            and_(
                EventPayment.game_id == game_id,
                EventPayment.player_id == payment.player_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Payment already exists for this player and game")

    # Create payment
    new_payment = EventPayment(
        game_id=game_id,
        player_id=payment.player_id,
        amount=Decimal(str(payment.amount)),
        currency=payment.currency,
        method=payment.method,
        status=payment.status,
        external_payment_id=payment.external_payment_id,
        notes=payment.notes,
        paid_at=datetime.utcnow()
    )

    db.add(new_payment)
    await db.commit()
    await db.refresh(new_payment)

    return PaymentResponse(
        id=new_payment.id,
        game_id=new_payment.game_id,
        player_id=new_payment.player_id,
        player_username=player.username,
        player_display_name=player.display_name,
        amount=float(new_payment.amount),
        currency=new_payment.currency,
        paid_at=new_payment.paid_at,
        method=new_payment.method,
        status=new_payment.status,
        external_payment_id=new_payment.external_payment_id
    )


@payment_router.delete("/games/{game_id}/payments/{player_id}")
async def delete_payment(
    game_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a payment record (mark player as unpaid).
    Admin endpoint - should be protected with authentication.
    """
    result = await db.execute(
        select(EventPayment).where(
            and_(
                EventPayment.game_id == game_id,
                EventPayment.player_id == player_id
            )
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.delete(payment)
    await db.commit()

    return {"message": "Payment deleted successfully"}


@payment_router.patch("/games/{game_id}/payments/{player_id}", response_model=PaymentResponse)
async def update_payment(
    game_id: int,
    player_id: int,
    payment_update: PaymentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing payment record"""
    result = await db.execute(
        select(EventPayment).where(
            and_(
                EventPayment.game_id == game_id,
                EventPayment.player_id == player_id
            )
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Update fields
    if payment_update.amount is not None:
        payment.amount = Decimal(str(payment_update.amount))
    if payment_update.status is not None:
        payment.status = payment_update.status
    if payment_update.notes is not None:
        payment.notes = payment_update.notes

    await db.commit()
    await db.refresh(payment)

    # Get player info
    player_result = await db.execute(select(Player).where(Player.id == player_id))
    player = player_result.scalar_one()

    return PaymentResponse(
        id=payment.id,
        game_id=payment.game_id,
        player_id=payment.player_id,
        player_username=player.username,
        player_display_name=player.display_name,
        amount=float(payment.amount),
        currency=payment.currency,
        paid_at=payment.paid_at,
        method=payment.method,
        status=payment.status,
        external_payment_id=payment.external_payment_id
    )


# Budget endpoint
@payment_router.get("/games/{game_id}/budget", response_model=BudgetResponse)
async def get_game_budget(
    game_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get budget information for a game including:
    - Expected income
    - Actual income (from confirmed payments)
    - List of paid players
    - List of unpaid players (who registered but haven't paid)
    """
    # Get game details
    game_result = await db.execute(select(GameSchedule).where(GameSchedule.id == game_id))
    game = game_result.scalar_one_or_none()

    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Get all confirmed payments
    payments_result = await db.execute(
        select(EventPayment, Player)
        .join(Player, EventPayment.player_id == Player.id)
        .where(
            and_(
                EventPayment.game_id == game_id,
                EventPayment.status == "confirmed"
            )
        )
    )
    payments_with_players = payments_result.all()

    # Calculate actual income
    actual_income = sum(float(payment.amount) for payment, _ in payments_with_players)
    number_of_payers = len(payments_with_players)

    # Get registered players from game poll
    poll_result = await db.execute(
        select(Poll).where(
            and_(
                Poll.game_id == game_id,
                Poll.poll_type == "game"
            )
        ).order_by(Poll.created_at.desc())
    )
    poll = poll_result.scalar_one_or_none()

    registered_players = []
    if poll:
        # Get all votes for "I'm in!" option (assuming option_id 0)
        votes_result = await db.execute(
            select(PollVote, Player)
            .outerjoin(Player, PollVote.user_id == Player.telegram_user_id)
            .where(
                and_(
                    PollVote.poll_id == poll.poll_id,
                    PollVote.option_id == 0  # "I'm in!" option
                )
            )
        )
        registered_players = votes_result.all()

    # Build paid and unpaid player lists
    paid_player_ids = {payment.player_id for payment, _ in payments_with_players}

    paid_players = []
    for payment, player in payments_with_players:
        paid_players.append(PlayerSummary(
            player_id=player.id,
            telegram_user_id=player.telegram_user_id,
            username=player.username,
            display_name=player.display_name,
            amount_due=float(game.price_per_player) if game.price_per_player else 0,
            paid=True,
            payment_id=payment.id
        ))

    unpaid_players = []
    for vote, player in registered_players:
        if player and player.id not in paid_player_ids:
            unpaid_players.append(PlayerSummary(
                player_id=player.id,
                telegram_user_id=player.telegram_user_id,
                username=player.username,
                display_name=player.display_name,
                amount_due=float(game.price_per_player) if game.price_per_player else 0,
                paid=False
            ))

    # Calculate expected income
    price = float(game.price_per_player) if game.price_per_player else 0
    if game.max_players:
        expected_income = price * game.max_players
    else:
        expected_income = price * len(registered_players) if registered_players else 0

    return BudgetResponse(
        game_id=game.id,
        game_date=game.game_date,
        location=game.location,
        price_per_player=price,
        max_players=game.max_players,
        expected_income=expected_income,
        actual_income=actual_income,
        number_of_payers=number_of_payers,
        registered_players=len(registered_players),
        paid_players=paid_players,
        unpaid_players=unpaid_players
    )


# Forecast endpoint
@payment_router.get("/games/{game_id}/forecast", response_model=ForecastResponse)
async def get_game_forecast(
    game_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get attendance and revenue forecast for a game.
    Uses historical average from similar games (same weekday/location).
    Can be extended to use Vertex AI for more sophisticated forecasting.
    """
    # Get game details
    game_result = await db.execute(select(GameSchedule).where(GameSchedule.id == game_id))
    game = game_result.scalar_one_or_none()

    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Check if we have a cached forecast
    cache_result = await db.execute(
        select(ForecastCache).where(ForecastCache.game_id == game_id)
    )
    cached_forecast = cache_result.scalar_one_or_none()

    # If cache is recent (less than 24 hours old), return it
    if cached_forecast and (datetime.utcnow() - cached_forecast.computed_at) < timedelta(hours=24):
        return ForecastResponse(
            game_id=game.id,
            game_date=game.game_date,
            forecasted_players=cached_forecast.forecasted_players,
            forecasted_income=float(cached_forecast.forecasted_income),
            confidence_level=cached_forecast.confidence_level,
            method=cached_forecast.method,
            historical_data=cached_forecast.metadata or {}
        )

    # Otherwise, compute forecast from historical data
    game_weekday = game.game_date.weekday()

    # Get historical games (past completed games, same weekday/location, last 90 days)
    historical_cutoff = datetime.utcnow() - timedelta(days=90)

    # Get historical payment data
    historical_result = await db.execute(
        select(
            GameSchedule.id,
            func.count(EventPayment.id).label("payment_count"),
            func.sum(EventPayment.amount).label("total_revenue")
        )
        .outerjoin(EventPayment, and_(
            EventPayment.game_id == GameSchedule.id,
            EventPayment.status == "confirmed"
        ))
        .where(
            and_(
                GameSchedule.game_date < datetime.utcnow(),
                GameSchedule.game_date > historical_cutoff,
                func.extract("dow", GameSchedule.game_date) == game_weekday,
                GameSchedule.location == game.location
            )
        )
        .group_by(GameSchedule.id)
    )
    historical_games = historical_result.all()

    if historical_games:
        # Calculate averages
        avg_players = sum(g.payment_count for g in historical_games) / len(historical_games)
        avg_revenue = sum(float(g.total_revenue or 0) for g in historical_games) / len(historical_games)
        confidence = "high" if len(historical_games) >= 5 else "medium" if len(historical_games) >= 2 else "low"

        forecasted_players = int(round(avg_players))
        forecasted_income = avg_revenue
    else:
        # No historical data, use game settings
        forecasted_players = game.max_players or 16
        forecasted_income = float(game.price_per_player or 0) * forecasted_players
        confidence = "low"

    # Cache the forecast
    if cached_forecast:
        cached_forecast.forecasted_players = forecasted_players
        cached_forecast.forecasted_income = Decimal(str(forecasted_income))
        cached_forecast.confidence_level = confidence
        cached_forecast.metadata = {
            "historical_games_count": len(historical_games),
            "weekday": game_weekday,
            "location": game.location
        }
        cached_forecast.computed_at = datetime.utcnow()
    else:
        cached_forecast = ForecastCache(
            game_id=game_id,
            forecasted_players=forecasted_players,
            forecasted_income=Decimal(str(forecasted_income)),
            confidence_level=confidence,
            method="historical_average",
            metadata={
                "historical_games_count": len(historical_games),
                "weekday": game_weekday,
                "location": game.location
            }
        )
        db.add(cached_forecast)

    await db.commit()

    return ForecastResponse(
        game_id=game.id,
        game_date=game.game_date,
        forecasted_players=forecasted_players,
        forecasted_income=forecasted_income,
        confidence_level=confidence,
        method="historical_average",
        historical_data={
            "historical_games_count": len(historical_games),
            "weekday": game_weekday,
            "location": game.location
        }
    )
