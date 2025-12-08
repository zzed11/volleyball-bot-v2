"""FastAPI routes"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from db import get_db, Poll, PollVote, Player, Match, GameSchedule

# Create API router
api_router = APIRouter(prefix="/api")


# Pydantic models for API responses
class PlayerResponse(BaseModel):
    id: int
    telegram_user_id: Optional[int]
    username: Optional[str]
    display_name: Optional[str]
    skill_rating: Optional[float]
    preferred_position: Optional[str]

    class Config:
        from_attributes = True


class PollStatsResponse(BaseModel):
    poll_id: str
    poll_type: str
    title: str
    total_votes: int
    unique_voters: int
    created_at: datetime
    closed_at: Optional[datetime]
    votes_by_time: dict


class GameResponse(BaseModel):
    id: int
    game_date: datetime
    location: str
    description: Optional[str]

    class Config:
        from_attributes = True


class NextGamePlayersResponse(BaseModel):
    game: Optional[GameResponse]
    players: List[PlayerResponse]
    total_count: int


@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@api_router.get("/games/next/players", response_model=NextGamePlayersResponse)
async def get_next_game_players(
    limit: int = Query(18, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the first N players for the next game based on poll responses.
    Returns players ordered by their response time (first come, first served).
    """
    # Find the next scheduled game
    result = await db.execute(
        select(GameSchedule)
        .where(GameSchedule.game_date > datetime.utcnow())
        .order_by(GameSchedule.game_date)
        .limit(1)
    )
    next_game = result.scalar_one_or_none()

    if not next_game:
        return NextGamePlayersResponse(
            game=None,
            players=[],
            total_count=0
        )

    # Find the poll associated with this game (if any)
    # For simplicity, we'll get the most recent game poll
    poll_result = await db.execute(
        select(Poll)
        .where(Poll.poll_type == "game")
        .order_by(Poll.created_at.desc())
        .limit(1)
    )
    poll = poll_result.scalar_one_or_none()

    if not poll:
        return NextGamePlayersResponse(
            game=GameResponse.model_validate(next_game),
            players=[],
            total_count=0
        )

    # Get votes for this poll ordered by voted_at (first come, first served)
    votes_result = await db.execute(
        select(PollVote)
        .where(PollVote.poll_id == poll.poll_id)
        .order_by(PollVote.voted_at)
        .limit(limit)
    )
    votes = votes_result.scalars().all()

    # Get player details for these votes
    user_ids = [vote.user_id for vote in votes]
    players_result = await db.execute(
        select(Player)
        .where(Player.telegram_user_id.in_(user_ids))
    )
    players = players_result.scalars().all()

    # Create a mapping for ordered results
    player_map = {p.telegram_user_id: p for p in players}
    ordered_players = []
    for vote in votes:
        if vote.user_id in player_map:
            ordered_players.append(player_map[vote.user_id])

    return NextGamePlayersResponse(
        game=GameResponse.model_validate(next_game),
        players=[PlayerResponse.model_validate(p) for p in ordered_players],
        total_count=len(ordered_players)
    )


@api_router.get("/polls/{poll_id}/stats", response_model=PollStatsResponse)
async def get_poll_stats(
    poll_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics for a specific poll including:
    - Total votes
    - Unique voters
    - Vote distribution over time
    """
    # Get poll details
    result = await db.execute(
        select(Poll).where(Poll.poll_id == poll_id)
    )
    poll = result.scalar_one_or_none()

    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Get all votes for this poll
    votes_result = await db.execute(
        select(PollVote).where(PollVote.poll_id == poll_id)
    )
    votes = votes_result.scalars().all()

    # Calculate statistics
    total_votes = len(votes)
    unique_voters = len(set(vote.user_id for vote in votes))

    # Group votes by time intervals (e.g., first 10 minutes, first hour, etc.)
    if votes and poll.created_at:
        votes_by_time = {
            "first_minute": 0,
            "first_5_minutes": 0,
            "first_10_minutes": 0,
            "first_30_minutes": 0,
            "first_hour": 0,
            "after_hour": 0,
        }

        for vote in votes:
            time_diff = (vote.voted_at - poll.created_at).total_seconds() / 60

            if time_diff <= 1:
                votes_by_time["first_minute"] += 1
            if time_diff <= 5:
                votes_by_time["first_5_minutes"] += 1
            if time_diff <= 10:
                votes_by_time["first_10_minutes"] += 1
            if time_diff <= 30:
                votes_by_time["first_30_minutes"] += 1
            if time_diff <= 60:
                votes_by_time["first_hour"] += 1
            else:
                votes_by_time["after_hour"] += 1
    else:
        votes_by_time = {}

    return PollStatsResponse(
        poll_id=poll.poll_id,
        poll_type=poll.poll_type,
        title=poll.title,
        total_votes=total_votes,
        unique_voters=unique_voters,
        created_at=poll.created_at,
        closed_at=poll.closed_at,
        votes_by_time=votes_by_time
    )


@api_router.get("/players", response_model=List[PlayerResponse])
async def get_players(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get list of players"""
    result = await db.execute(
        select(Player)
        .offset(skip)
        .limit(limit)
    )
    players = result.scalars().all()
    return [PlayerResponse.model_validate(p) for p in players]


@api_router.get("/polls", response_model=List[dict])
async def get_polls(
    poll_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get list of polls"""
    query = select(Poll)

    if poll_type:
        query = query.where(Poll.poll_type == poll_type)

    query = query.order_by(Poll.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    polls = result.scalars().all()

    return [
        {
            "id": p.id,
            "poll_id": p.poll_id,
            "poll_type": p.poll_type,
            "title": p.title,
            "created_at": p.created_at,
            "closed_at": p.closed_at,
        }
        for p in polls
    ]
