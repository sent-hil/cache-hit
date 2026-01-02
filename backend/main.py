import logging
import os
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import execution_router
import review_router
from container_manager import LANGUAGE_CONFIG

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def check_mochi_api_key():
    """Check that MOCHI_API_KEY is set."""
    if not os.environ.get("MOCHI_API_KEY"):
        logger.error("MOCHI_API_KEY environment variable is not set")
        logger.error("Get your API key from: https://app.mochi.cards/settings/api")
        sys.exit(1)
    logger.info("MOCHI_API_KEY is configured")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up FastAPI application")

    # Verify Mochi API key is set
    check_mochi_api_key()

    container_manager = execution_router.get_container_manager()

    if not container_manager.check_docker_available():
        logger.error("Docker daemon is not available. Exiting.")
        raise RuntimeError("Docker daemon is not available")

    logger.info("Pulling Docker images")
    container_manager.pull_images()

    logger.info("Pre-starting containers for all languages")
    for language in LANGUAGE_CONFIG.keys():
        container_manager.create_container(language)

    logger.info("FastAPI application startup complete")

    yield

    logger.info("Shutting down FastAPI application")
    container_manager.cleanup_all()
    logger.info("FastAPI application shutdown complete")


app = FastAPI(
    title="CacheHit - Mochi Review Client",
    description="Review flashcards synced with Mochi",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,  # type: ignore
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("FastAPI app created with CORS middleware")

app.include_router(execution_router.router)
app.include_router(review_router.router)

logger.info("Routers included")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
