import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import execution_router
import review_router
from container_manager import LANGUAGE_CONFIG

# Path to frontend build output
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

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

    # Start background sync manager
    from review_router import card_to_dict, get_mochi_client, get_review_cache
    from sync import SyncManager

    sync_manager = SyncManager(
        mochi_client=get_mochi_client(),
        review_cache=get_review_cache(),
        card_to_dict=card_to_dict,
    )
    sync_manager.start()

    logger.info("FastAPI application startup complete")

    yield

    logger.info("Shutting down FastAPI application")
    await sync_manager.stop()
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

# Serve static files from frontend build if dist exists
if FRONTEND_DIST.exists():
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    logger.info(f"Frontend dist found at {FRONTEND_DIST}, enabling static file serving")

    # Mount static assets (JS, CSS, fonts)
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        logger.info("Mounted /assets for static files")

    @app.get("/")
    async def serve_index():
        """Serve the main index.html."""
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve index.html for SPA routing, except API routes."""
        # Don't intercept API routes
        if full_path.startswith(("api/", "execute/", "health", "docs", "openapi.json")):
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")

        # Try to serve the file directly if it exists
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html for client-side routing
        return FileResponse(FRONTEND_DIST / "index.html")

    logger.info("SPA routes configured")
else:
    logger.info(
        f"Frontend dist not found at {FRONTEND_DIST}, skipping static file serving"
    )
    logger.info("Run 'cd frontend && npm run build' to enable static serving")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
