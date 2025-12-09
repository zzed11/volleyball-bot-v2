#!/usr/bin/env python3
"""
Trivia generation job using Vertex AI Gemini.

This job:
1. Connects to Vertex AI
2. Generates trivia questions from volleyball datasets
3. Creates a poll in Telegram
4. Records the poll in the database
"""
import asyncio
import logging
import sys
import os
from datetime import datetime
from typing import List, Dict

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../bot-api"))

from google.cloud import aiplatform
import vertexai
from vertexai.generative_models import GenerativeModel
from vertexai.preview import rag
from aiogram import Bot

from db.models import Poll
from common import JobConfig, get_db_session, record_job_run, send_telegram_poll

logger = logging.getLogger(__name__)


class TriviaGenerator:
    """Generate trivia questions using Vertex AI with RAG"""

    def __init__(self, config: JobConfig):
        self.config = config
        self.model_name = config.vertex_ai_model
        self.rag_corpus_name = config.rag_corpus_name

        # Initialize Vertex AI
        vertexai.init(project=config.project_id, location=config.vertex_ai_location)

    def retrieve_volleyball_rules_context(self, query: str, top_k: int = 5) -> str:
        """
        Retrieve relevant context from volleyball rules using RAG.

        Args:
            query: Query to search for relevant rules
            top_k: Number of top results to retrieve

        Returns:
            Combined text from retrieved chunks
        """
        if not self.rag_corpus_name:
            logger.warning("RAG corpus not configured, skipping context retrieval")
            return ""

        try:
            logger.info(f"Retrieving context for query: {query}")

            # Retrieve relevant chunks from RAG corpus
            response = rag.retrieval_query(
                rag_resources=[
                    rag.RagResource(
                        rag_corpus=self.rag_corpus_name,
                    )
                ],
                text=query,
                similarity_top_k=top_k,
            )

            # Combine retrieved contexts
            contexts = []
            for i, context in enumerate(response.contexts.contexts, 1):
                contexts.append(f"[Context {i}]\n{context.text}")
                logger.debug(f"Retrieved chunk {i}: {context.text[:100]}...")

            combined_context = "\n\n".join(contexts)
            logger.info(f"Retrieved {len(contexts)} relevant context chunks")

            return combined_context

        except Exception as e:
            logger.error(f"Error retrieving RAG context: {e}", exc_info=True)
            return ""

    def generate_trivia_questions(
        self, topic: str = "volleyball", count: int = 1
    ) -> List[Dict]:
        """
        Generate trivia questions using Gemini with RAG context.

        Args:
            topic: Topic for trivia questions
            count: Number of questions to generate

        Returns:
            List of question dictionaries
        """
        model = GenerativeModel(self.model_name)

        # Retrieve relevant context from volleyball rules
        context_query = f"volleyball rules about {topic}"
        retrieved_context = self.retrieve_volleyball_rules_context(
            query=context_query, top_k=5
        )

        # Build prompt with retrieved context
        if retrieved_context:
            prompt = f"""You are creating trivia questions based on the official FIVB volleyball rules.

RELEVANT RULES CONTEXT:
{retrieved_context}

TASK:
Generate {count} multiple-choice trivia question(s) about {topic} using the rules context above.

Requirements:
- Base questions on the actual rules provided in the context
- Each question should be interesting and challenging
- Questions should test knowledge of specific volleyball rules
- Provide 4 answer options
- Indicate which option is correct (0-3)
- Questions should be appropriate for a volleyball community

Format your response as JSON:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0
  }}
]

Only return the JSON array, no additional text.
"""
        else:
            # Fallback to generic prompt if RAG is not configured
            logger.warning("No RAG context retrieved, using generic prompt")
            prompt = f"""Generate {count} multiple-choice trivia question(s) about {topic}.

Requirements:
- Each question should be interesting and challenging
- Provide 4 answer options
- Indicate which option is correct (0-3)
- Questions should be appropriate for a volleyball community

Format your response as JSON:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0
  }}
]

Only return the JSON array, no additional text.
"""

        try:
            response = model.generate_content(prompt)
            text = response.text.strip()

            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            # Parse JSON response
            import json

            questions = json.loads(text)

            logger.info(f"Generated {len(questions)} trivia questions")
            return questions

        except Exception as e:
            logger.error(f"Error generating trivia: {e}", exc_info=True)
            # Return a fallback question
            return [
                {
                    "question": "What is the standard height of a volleyball net for men's competition?",
                    "options": ["2.24m", "2.43m", "2.50m", "2.35m"],
                    "correct_answer": 1,
                }
            ]


async def run_trivia_job(job_name: str = "trivia_tuesday"):
    """Main trivia job execution"""
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

        # Generate trivia questions
        logger.info("Generating trivia questions...")
        generator = TriviaGenerator(config)
        questions = generator.generate_trivia_questions(topic="volleyball", count=1)

        if not questions:
            raise Exception("No questions generated")

        # Use the first question
        question_data = questions[0]

        # Send poll to Telegram
        logger.info(f"Sending poll to Telegram chat: {config.telegram_chat_id}")
        poll_id = await send_telegram_poll(
            bot=bot,
            chat_id=config.telegram_chat_id,
            question=question_data["question"],
            options=question_data["options"],
            is_anonymous=False,
        )

        # Record poll in database
        logger.info(f"Recording poll in database: {poll_id}")
        poll = Poll(
            poll_id=poll_id,
            poll_type="trivia",
            day_of_week=datetime.utcnow().strftime("%A"),
            title=question_data["question"],
            questions={"questions": questions},
            created_at=datetime.utcnow(),
        )
        db_session.add(poll)
        db_session.commit()

        # Record successful job run
        record_job_run(
            db_session,
            job_name=job_name,
            status="success",
            payload={"poll_id": poll_id, "question": question_data["question"]},
        )

        logger.info(f"Trivia job completed successfully. Poll ID: {poll_id}")

    except Exception as e:
        logger.error(f"Trivia job failed: {e}", exc_info=True)

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
        sys.argv[1] if len(sys.argv) > 1 else os.getenv("JOB_NAME", "trivia_tuesday")
    )

    logger.info(f"Starting trivia job: {job_name}")
    asyncio.run(run_trivia_job(job_name))


if __name__ == "__main__":
    main()
