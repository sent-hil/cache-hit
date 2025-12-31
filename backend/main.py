import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import deck_router
import execution_router
import review_router
from container_manager import LANGUAGE_CONFIG
from deck_parser import parse_deck_folder

logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up FastAPI application")

    container_manager = execution_router.get_container_manager()

    if not container_manager.check_docker_available():
        logger.error("Docker daemon is not available. Exiting.")
        raise RuntimeError("Docker daemon is not available")

    logger.info("Pulling Docker images")
    container_manager.pull_images()

    logger.info("Pre-starting containers for all languages")
    for language in LANGUAGE_CONFIG.keys():
        container_manager.create_container(language)

    logger.info("Loading flashcard decks")
    data_folder = Path(__file__).parent.parent / "data"
    deck_cache = deck_router.get_deck_cache()
    if data_folder.exists():
        for folder in data_folder.iterdir():
            if folder.is_dir():
                try:
                    deck = parse_deck_folder(str(folder))
                    deck_cache[deck.id] = deck
                    logger.info(f"Loaded deck: {deck.name} ({deck.total_cards} cards)")
                except Exception as e:
                    logger.error(f"Failed to load deck from {folder.name}: {e}")
    else:
        logger.warning(f"Data folder not found: {data_folder}")

    logger.info("FastAPI application startup complete")

    yield

    logger.info("Shutting down FastAPI application")
    container_manager.cleanup_all()
    logger.info("FastAPI application shutdown complete")


app = FastAPI(
    title="Code Runner API",
    description="Execute code in isolated Docker containers",
    version="0.1.0",
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
app.include_router(deck_router.router)
app.include_router(review_router.router)

logger.info("Routers included")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
