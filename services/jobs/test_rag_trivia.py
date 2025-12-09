#!/usr/bin/env python3
"""
Test script to verify RAG-based trivia generation works locally.
This script tests the TriviaGenerator without requiring database or Telegram.
"""
import os
import sys
import logging

# Set up environment
os.environ["GCP_PROJECT_ID"] = "atikot-org-share-project"
os.environ["VERTEX_AI_LOCATION"] = "us-west1"
os.environ["VERTEX_AI_MODEL"] = "gemini-1.5-pro"
os.environ["RAG_CORPUS_NAME"] = "projects/atikot-org-share-project/locations/us-west1/ragCorpora/4611686018427387904"

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../bot-api"))

from trivia_job import TriviaGenerator
from common import JobConfig

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    """Test RAG-based trivia generation"""
    logger.info("=== Testing RAG-Based Trivia Generation ===")

    # Initialize config
    config = JobConfig()
    logger.info(f"Project: {config.project_id}")
    logger.info(f"Vertex AI Location: {config.vertex_ai_location}")
    logger.info(f"Model: {config.vertex_ai_model}")
    logger.info(f"RAG Corpus: {config.rag_corpus_name}")

    if not config.rag_corpus_name:
        logger.error("RAG_CORPUS_NAME not set!")
        sys.exit(1)

    # Create trivia generator
    generator = TriviaGenerator(config)

    # Test 1: Retrieve context
    logger.info("\n--- Test 1: Retrieve Context ---")
    context = generator.retrieve_volleyball_rules_context(
        query="volleyball net height and court dimensions",
        top_k=3
    )

    if context:
        logger.info(f"✓ Successfully retrieved context ({len(context)} characters)")
        logger.info(f"Preview: {context[:200]}...")
    else:
        logger.warning("✗ No context retrieved")

    # Test 2: Generate trivia question
    logger.info("\n--- Test 2: Generate Trivia Question ---")
    questions = generator.generate_trivia_questions(
        topic="volleyball court dimensions and net height",
        count=1
    )

    if questions:
        logger.info(f"✓ Successfully generated {len(questions)} question(s)")
        for i, q in enumerate(questions, 1):
            logger.info(f"\nQuestion {i}:")
            logger.info(f"  Q: {q['question']}")
            logger.info(f"  Options:")
            for j, option in enumerate(q['options']):
                marker = "✓" if j == q['correct_answer'] else " "
                logger.info(f"    {marker} {j}. {option}")
    else:
        logger.error("✗ Failed to generate questions")
        sys.exit(1)

    logger.info("\n=== Test Complete ===")
    logger.info("RAG integration is working correctly!")


if __name__ == "__main__":
    main()
