"""
Background sync manager for periodic Mochi API synchronization.

Syncs due cards from Mochi every 30 minutes.
"""

import asyncio
import logging
from typing import Callable, Optional

from mochi_client import MochiClient
from review_storage import SYNC_INTERVAL_MINUTES, ReviewCache

logger = logging.getLogger(__name__)


class SyncManager:
    """Manages background sync with Mochi API."""

    def __init__(
        self,
        mochi_client: MochiClient,
        review_cache: ReviewCache,
        card_to_dict: Callable,
    ):
        self.mochi = mochi_client
        self.cache = review_cache
        self.card_to_dict = card_to_dict
        self._sync_task: Optional[asyncio.Task] = None
        self._running = False

    async def sync_due_cards(self) -> int:
        """
        Sync due cards from Mochi API.

        Returns the number of cards synced.
        """
        logger.info("Starting sync with Mochi API")
        try:
            cards = self.mochi.get_due_cards()
            cards_data = [self.card_to_dict(card) for card in cards]
            self.cache.cache_due_cards(cards_data)
            logger.info(f"Synced {len(cards_data)} due cards from Mochi")
            return len(cards_data)
        except Exception as e:
            logger.error(f"Failed to sync with Mochi: {e}")
            raise

    async def _background_sync_loop(self) -> None:
        """Background loop that syncs every SYNC_INTERVAL_MINUTES."""
        logger.info(
            f"Background sync started (interval: {SYNC_INTERVAL_MINUTES} minutes)"
        )
        while self._running:
            try:
                # Wait for the sync interval
                await asyncio.sleep(SYNC_INTERVAL_MINUTES * 60)

                if not self._running:
                    break

                # Check if sync is actually needed (might have been triggered manually)
                if self.cache.needs_sync():
                    await self.sync_due_cards()
                else:
                    logger.debug("Sync not needed, skipping background sync")

            except asyncio.CancelledError:
                logger.info("Background sync cancelled")
                break
            except Exception as e:
                logger.error(f"Error in background sync: {e}")
                # Continue running even if one sync fails

        logger.info("Background sync stopped")

    def start(self) -> None:
        """Start the background sync task."""
        if self._running:
            logger.warning("Sync manager already running")
            return

        self._running = True
        self._sync_task = asyncio.create_task(self._background_sync_loop())
        logger.info("Sync manager started")

    async def stop(self) -> None:
        """Stop the background sync task."""
        if not self._running:
            return

        self._running = False
        if self._sync_task:
            self._sync_task.cancel()
            try:
                await self._sync_task
            except asyncio.CancelledError:
                pass
            self._sync_task = None
        logger.info("Sync manager stopped")

    def is_running(self) -> bool:
        """Check if the sync manager is running."""
        return self._running
