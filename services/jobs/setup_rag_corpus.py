#!/usr/bin/env python3
"""
Setup script to create Vertex AI RAG corpus and import volleyball rules PDF.

This script should be run once after infrastructure is deployed to:
1. Create a RAG corpus in Vertex AI
2. Import the volleyball-rules.pdf from Cloud Storage
3. Index the document for semantic search

Run this manually or as part of deployment:
    python setup_rag_corpus.py
"""
import os
import sys
import logging
from typing import Optional

from google.cloud import aiplatform
from vertexai.preview import rag
import vertexai

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class RAGCorpusSetup:
    """Setup and manage Vertex AI RAG corpus"""

    def __init__(
        self,
        project_id: str,
        location: str = "us-central1",
        corpus_display_name: str = "volleyball-rules-corpus",
    ):
        self.project_id = project_id
        self.location = location
        self.corpus_display_name = corpus_display_name

        # Initialize Vertex AI
        vertexai.init(project=project_id, location=location)
        logger.info(f"Initialized Vertex AI for project: {project_id}")

    def create_corpus(self) -> str:
        """
        Create a new RAG corpus.

        Returns:
            Corpus resource name
        """
        try:
            # Check if corpus already exists
            existing_corpus = self.get_corpus_by_name(self.corpus_display_name)
            if existing_corpus:
                logger.info(
                    f"Corpus already exists: {existing_corpus.name} "
                    f"(display_name: {self.corpus_display_name})"
                )
                return existing_corpus.name

            # Create new corpus
            logger.info(f"Creating RAG corpus: {self.corpus_display_name}")
            corpus = rag.create_corpus(
                display_name=self.corpus_display_name,
                description="Official FIVB Volleyball Rules 2025-2028 for trivia generation",
            )

            logger.info(f"Successfully created corpus: {corpus.name}")
            return corpus.name

        except Exception as e:
            logger.error(f"Error creating corpus: {e}", exc_info=True)
            raise

    def get_corpus_by_name(self, display_name: str) -> Optional[rag.RagCorpus]:
        """
        Find corpus by display name.

        Args:
            display_name: Display name of the corpus

        Returns:
            RagCorpus object or None
        """
        try:
            # List all corpora
            corpora = rag.list_corpora()

            for corpus in corpora:
                if corpus.display_name == display_name:
                    return corpus

            return None

        except Exception as e:
            logger.warning(f"Error listing corpora: {e}")
            return None

    def import_file(
        self,
        corpus_name: str,
        gcs_uri: str,
        chunk_size: int = 1024,
        chunk_overlap: int = 200,
    ) -> str:
        """
        Import a file from Cloud Storage into the RAG corpus.

        Args:
            corpus_name: RAG corpus resource name
            gcs_uri: GCS URI of the file (e.g., gs://bucket/path/file.pdf)
            chunk_size: Size of text chunks for embedding (in tokens)
            chunk_overlap: Overlap between chunks (in tokens)

        Returns:
            RagFile resource name
        """
        try:
            logger.info(f"Importing file: {gcs_uri}")
            logger.info(f"Chunk size: {chunk_size}, overlap: {chunk_overlap}")

            # Import file with chunking configuration
            response = rag.import_files(
                corpus_name=corpus_name,
                paths=[gcs_uri],
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )

            logger.info(f"Import operation completed: {response}")

            # Get the imported file
            files = list(rag.list_files(corpus_name=corpus_name))
            if files:
                logger.info(f"Successfully imported file: {files[0].name}")
                return files[0].name
            else:
                raise Exception("File import completed but no files found in corpus")

        except Exception as e:
            logger.error(f"Error importing file: {e}", exc_info=True)
            raise

    def get_corpus_info(self, corpus_name: str) -> dict:
        """
        Get information about the RAG corpus.

        Args:
            corpus_name: RAG corpus resource name

        Returns:
            Dictionary with corpus information
        """
        try:
            corpus = rag.get_corpus(name=corpus_name)
            files = rag.list_files(corpus_name=corpus_name)

            info = {
                "name": corpus.name,
                "display_name": corpus.display_name,
                "description": corpus.description,
                "file_count": len(list(files)),
            }

            logger.info(f"Corpus info: {info}")
            return info

        except Exception as e:
            logger.error(f"Error getting corpus info: {e}", exc_info=True)
            raise


def main():
    """Main entry point"""
    # Get configuration from environment
    project_id = os.getenv("GCP_PROJECT_ID")
    # RAG Engine supported regions: us-west1, europe-west1, europe-west2, asia-northeast1
    # us-central1 and us-east4 are restricted for new projects
    location = os.getenv("VERTEX_AI_LOCATION", "us-west1")
    bucket_name = os.getenv("STORAGE_BUCKET_NAME")

    if not project_id:
        logger.error("GCP_PROJECT_ID environment variable is required")
        sys.exit(1)

    if not bucket_name:
        logger.error("STORAGE_BUCKET_NAME environment variable is required")
        logger.info("Run: terraform output storage_bucket_name")
        sys.exit(1)

    # GCS URI for volleyball rules PDF
    gcs_uri = f"gs://{bucket_name}/volleyball-rules/volleyball-rules.pdf"

    logger.info("=== Vertex AI RAG Corpus Setup ===")
    logger.info(f"Project: {project_id}")
    logger.info(f"Location: {location}")
    logger.info(f"GCS URI: {gcs_uri}")

    try:
        # Initialize setup
        setup = RAGCorpusSetup(
            project_id=project_id,
            location=location,
            corpus_display_name="volleyball-rules-corpus",
        )

        # Create corpus
        corpus_name = setup.create_corpus()
        logger.info(f"Corpus ready: {corpus_name}")

        # Import volleyball rules PDF
        file_name = setup.import_file(
            corpus_name=corpus_name,
            gcs_uri=gcs_uri,
            chunk_size=1024,  # ~1024 tokens per chunk
            chunk_overlap=200,  # 200 token overlap for context
        )
        logger.info(f"File imported: {file_name}")

        # Show corpus info
        info = setup.get_corpus_info(corpus_name)
        logger.info("\n=== RAG Corpus Setup Complete ===")
        logger.info(f"Corpus Name: {info['name']}")
        logger.info(f"Display Name: {info['display_name']}")
        logger.info(f"Files Imported: {info['file_count']}")
        logger.info("\nYou can now use this corpus in trivia_job.py")
        logger.info(f"Set environment variable: RAG_CORPUS_NAME={corpus_name}")

    except Exception as e:
        logger.error(f"Setup failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
