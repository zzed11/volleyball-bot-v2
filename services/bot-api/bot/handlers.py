"""Telegram bot handlers"""
import logging
from datetime import datetime
from aiogram import Router, F
from aiogram.types import (
    Update, ChatMemberUpdated, PollAnswer, Message
)
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db import GroupMember, PollVote, AsyncSessionLocal

logger = logging.getLogger(__name__)

# Create router for handlers
router = Router()


async def extract_user_info(user):
    """Extract user information from Telegram user object"""
    return {
        "user_id": user.id,
        "username": user.username,
        "display_name": f"{user.first_name} {user.last_name or ''}".strip(),
    }


@router.chat_member()
async def on_chat_member_updated(event: ChatMemberUpdated):
    """Handle user joining or leaving the group"""
    user_info = await extract_user_info(event.new_chat_member.user)

    async with AsyncSessionLocal() as db:
        try:
            if event.new_chat_member.status in ["member", "administrator", "creator"]:
                # User joined or became active
                logger.info(f"User {user_info['user_id']} joined the group")

                # Insert new member record
                new_member = GroupMember(
                    user_id=user_info["user_id"],
                    username=user_info["username"],
                    display_name=user_info["display_name"],
                    joined_at=datetime.utcnow(),
                    status="active"
                )
                db.add(new_member)
                await db.commit()

                # Send welcome message
                await event.answer(
                    f"Welcome {user_info['display_name']}! "
                    f"Great to have you in our volleyball community!"
                )

            elif event.new_chat_member.status in ["left", "kicked"]:
                # User left or was removed
                logger.info(f"User {user_info['user_id']} left the group")

                # Update existing member records to mark as left
                stmt = (
                    update(GroupMember)
                    .where(GroupMember.user_id == user_info["user_id"])
                    .where(GroupMember.status == "active")
                    .values(status="left", left_at=datetime.utcnow())
                )
                await db.execute(stmt)
                await db.commit()

                # Send farewell message
                await event.answer(
                    f"Goodbye {user_info['display_name']}! "
                    f"Hope to see you on the court again soon!"
                )
        except Exception as e:
            logger.error(f"Error handling chat member update: {e}", exc_info=True)
            await db.rollback()


@router.poll_answer()
async def on_poll_answer(poll_answer: PollAnswer):
    """Handle poll answers and store them with server-side timestamp"""
    logger.info(f"Poll answer received: poll_id={poll_answer.poll_id}, user_id={poll_answer.user.id}")

    async with AsyncSessionLocal() as db:
        try:
            # Get the option IDs that were selected
            for option_id in poll_answer.option_ids:
                # Check if vote already exists
                existing_vote = await db.execute(
                    select(PollVote).where(
                        PollVote.poll_id == poll_answer.poll_id,
                        PollVote.user_id == poll_answer.user.id
                    )
                )
                vote = existing_vote.scalar_one_or_none()

                if vote:
                    # Update existing vote
                    vote.option_id = option_id
                    vote.voted_at = datetime.utcnow()
                else:
                    # Create new vote with server-side timestamp
                    new_vote = PollVote(
                        poll_id=poll_answer.poll_id,
                        user_id=poll_answer.user.id,
                        option_id=option_id,
                        voted_at=datetime.utcnow()  # Server-side timestamp
                    )
                    db.add(new_vote)

            await db.commit()
            logger.info(f"Poll vote saved for user {poll_answer.user.id}")

        except Exception as e:
            logger.error(f"Error saving poll answer: {e}", exc_info=True)
            await db.rollback()


@router.message(F.text.startswith("/"))
async def on_command(message: Message):
    """Handle bot commands"""
    command = message.text.split()[0].lower()

    if command == "/start":
        await message.answer(
            "Welcome to the Volleyball Community Bot!\n\n"
            "I help manage our volleyball community with:\n"
            "- Weekly trivia polls\n"
            "- Game attendance tracking\n"
            "- Game notifications\n\n"
            "Stay active and have fun!"
        )
    elif command == "/help":
        await message.answer(
            "Available commands:\n"
            "/start - Start the bot\n"
            "/help - Show this help message\n"
            "/next - Show next game details\n"
            "/stats - Show your stats\n"
        )
    elif command == "/next":
        # This would fetch from database
        await message.answer(
            "Next game information will be posted here!\n"
            "Check back soon for details."
        )
    elif command == "/stats":
        async with AsyncSessionLocal() as db:
            # Count user's poll votes
            result = await db.execute(
                select(PollVote).where(PollVote.user_id == message.from_user.id)
            )
            vote_count = len(result.scalars().all())

            await message.answer(
                f"Your stats:\n"
                f"Total poll votes: {vote_count}"
            )


@router.message()
async def on_message(message: Message):
    """Handle regular messages"""
    # You can add message handlers here
    # For now, we'll just log them
    logger.debug(f"Message received: {message.text}")
