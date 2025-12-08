"""SQLAlchemy models"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, CheckConstraint, Index, Numeric
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)
    telegram_user_id = Column(BigInteger, unique=True, nullable=True)
    username = Column(String(64), nullable=True)
    display_name = Column(String(100), nullable=True)
    skill_rating = Column(Float, nullable=True)
    preferred_position = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team_memberships = relationship("TeamMember", back_populates="player")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("TeamMember", back_populates="team")
    home_matches = relationship("Match", foreign_keys="Match.team_home_id", back_populates="team_home")
    away_matches = relationship("Match", foreign_keys="Match.team_away_id", back_populates="team_away")


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(20), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    player = relationship("Player", back_populates="team_memberships")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    team_home_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    team_away_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    match_date = Column(DateTime, nullable=False)
    court = Column(String(50), nullable=True)
    status = Column(String(20), default="scheduled")
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team_home = relationship("Team", foreign_keys=[team_home_id], back_populates="home_matches")
    team_away = relationship("Team", foreign_keys=[team_away_id], back_populates="away_matches")
    polls = relationship("Poll", back_populates="game")

    __table_args__ = (
        CheckConstraint("status IN ('scheduled', 'in_progress', 'completed', 'cancelled')"),
    )


class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True)
    poll_id = Column(String(100), unique=True, nullable=False)
    poll_type = Column(String(20), nullable=False)
    day_of_week = Column(String(10), nullable=True)
    title = Column(Text, nullable=False)
    questions = Column(JSON, nullable=True)
    game_id = Column(Integer, ForeignKey("matches.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    results = Column(JSON, nullable=True)

    game = relationship("Match", back_populates="polls")
    votes = relationship("PollVote", back_populates="poll")

    __table_args__ = (
        CheckConstraint("poll_type IN ('trivia', 'game')"),
    )


class GameSchedule(Base):
    __tablename__ = "game_schedule"

    id = Column(Integer, primary_key=True)
    game_date = Column(DateTime, nullable=False)
    location = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    notified = Column(Boolean, default=False)
    price_per_player = Column(Numeric(8, 2), default=0)
    max_players = Column(Integer, nullable=True)
    expected_budget = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payments = relationship("EventPayment", back_populates="game")


class GroupMember(Base):
    __tablename__ = "group_members"

    user_id = Column(BigInteger, primary_key=True)
    username = Column(String(64), nullable=True)
    display_name = Column(String(100), nullable=True)
    joined_at = Column(DateTime, primary_key=True)
    left_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="active", nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('active', 'left')"),
    )


class PollVote(Base):
    __tablename__ = "poll_votes"

    id = Column(Integer, primary_key=True)
    poll_id = Column(String(100), ForeignKey("polls.poll_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, nullable=False)
    option_id = Column(Integer, nullable=False)
    voted_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    poll = relationship("Poll", back_populates="votes")

    __table_args__ = (
        Index("idx_poll_votes_unique", "poll_id", "user_id", unique=True),
    )


class JobDefinition(Base):
    __tablename__ = "job_definitions"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    job_type = Column(String(30), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    schedules = relationship("JobSchedule", back_populates="job")
    runs = relationship("JobRun", back_populates="job")

    __table_args__ = (
        CheckConstraint("job_type IN ('trivia', 'game_poll', 'notification')"),
    )


class JobSchedule(Base):
    __tablename__ = "job_schedules"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("job_definitions.id", ondelete="CASCADE"), nullable=False)
    cron_expression = Column(String(20), nullable=False)
    timezone = Column(String(50), default="UTC")
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("JobDefinition", back_populates="schedules")


class JobRun(Base):
    __tablename__ = "job_runs"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("job_definitions.id", ondelete="CASCADE"), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False)
    error_message = Column(Text, nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobDefinition", back_populates="runs")

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'running', 'success', 'failed')"),
    )


class EventPayment(Base):
    __tablename__ = "event_payments"

    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("game_schedule.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(8, 2), nullable=False)
    currency = Column(String(10), default="ILS")
    paid_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    method = Column(String(20), default="paybox")
    status = Column(String(20), nullable=False, default="confirmed")
    external_payment_id = Column(String(100), nullable=True)
    external_provider = Column(String(20), default="paybox")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    game = relationship("GameSchedule", back_populates="payments")
    player = relationship("Player")

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'confirmed', 'refunded')"),
        CheckConstraint("amount >= 0"),
        Index("idx_event_payments_unique", "game_id", "player_id", unique=True),
    )


class BudgetCache(Base):
    __tablename__ = "budget_cache"

    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("game_schedule.id", ondelete="CASCADE"), nullable=False, unique=True)
    expected_income = Column(Numeric(10, 2), nullable=True)
    actual_income = Column(Numeric(10, 2), nullable=True)
    number_of_payers = Column(Integer, nullable=True)
    expected_players = Column(Integer, nullable=True)
    registered_players = Column(Integer, nullable=True)
    paid_players_list = Column(JSON, nullable=True)
    unpaid_players_list = Column(JSON, nullable=True)
    computed_at = Column(DateTime, default=datetime.utcnow)

    game = relationship("GameSchedule")


class ForecastCache(Base):
    __tablename__ = "forecast_cache"

    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("game_schedule.id", ondelete="CASCADE"), nullable=False, unique=True)
    forecasted_players = Column(Integer, nullable=True)
    forecasted_income = Column(Numeric(10, 2), nullable=True)
    confidence_level = Column(String(20), default="medium")
    method = Column(String(50), default="historical_average")
    forecast_metadata = Column(JSON, nullable=True)
    computed_at = Column(DateTime, default=datetime.utcnow)

    game = relationship("GameSchedule")
