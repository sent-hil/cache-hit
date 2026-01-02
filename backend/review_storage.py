"""
Cache storage for Mochi card reviews.

Stores:
- Cached due cards from Mochi (for faster initial loads)
- In-progress section reviews for the current card
- Last sync timestamp for periodic sync
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SYNC_INTERVAL_MINUTES = 30


@dataclass
class SectionReview:
    """Tracks a single section's review result."""

    section_index: int
    remembered: bool


@dataclass
class CardReviewProgress:
    """Tracks in-progress review for a card with multiple sections."""

    card_id: str
    total_sections: int
    section_reviews: list[SectionReview]

    def is_complete(self) -> bool:
        """Check if all sections have been reviewed."""
        return len(self.section_reviews) >= self.total_sections

    def add_section_review(self, section_index: int, remembered: bool) -> None:
        """Record a section review result."""
        # Don't add duplicate reviews for same section
        if any(r.section_index == section_index for r in self.section_reviews):
            return
        self.section_reviews.append(
            SectionReview(section_index=section_index, remembered=remembered)
        )

    def get_aggregate_result(self) -> bool:
        """Get final result: False if ANY section was forgot, else True."""
        if not self.section_reviews:
            return True
        return all(r.remembered for r in self.section_reviews)


class ReviewCache:
    """Simple cache for Mochi review data."""

    def __init__(self, cache_dir: str = "review_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self._in_progress: dict[str, CardReviewProgress] = {}
        self._last_sync: Optional[datetime] = None

    def _get_cache_file(self) -> Path:
        """Get the cache file path."""
        return self.cache_dir / "due_cards_cache.json"

    def _deduplicate_cards(self, cards: list[dict]) -> list[dict]:
        """Remove duplicate cards by ID, keeping the first occurrence."""
        seen_ids: set[str] = set()
        unique_cards: list[dict] = []
        duplicates_found = 0

        for card in cards:
            card_id = card.get("id")
            if card_id and card_id not in seen_ids:
                seen_ids.add(card_id)
                unique_cards.append(card)
            elif card_id:
                duplicates_found += 1

        if duplicates_found > 0:
            logger.info(f"Removed {duplicates_found} duplicate cards during sync")

        return unique_cards

    def cache_due_cards(self, cards: list[dict]) -> None:
        """Cache due cards from Mochi with deduplication."""
        # Deduplicate cards before caching
        unique_cards = self._deduplicate_cards(cards)

        cache_file = self._get_cache_file()
        with open(cache_file, "w") as f:
            json.dump(
                {
                    "cards": unique_cards,
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                },
                f,
                indent=2,
                default=str,
            )
        self._last_sync = datetime.now(timezone.utc)
        logger.info(f"Cached {len(unique_cards)} due cards")

    def get_cached_due_cards(self) -> Optional[list[dict]]:
        """Get cached due cards, if available."""
        cache_file = self._get_cache_file()
        if cache_file.exists():
            with open(cache_file, "r") as f:
                data = json.load(f)
                return data.get("cards")
        return None

    def get_last_sync_time(self) -> Optional[datetime]:
        """Get the last sync timestamp."""
        # Check in-memory first
        if self._last_sync:
            return self._last_sync

        # Try to read from cache file
        cache_file = self._get_cache_file()
        if cache_file.exists():
            with open(cache_file, "r") as f:
                data = json.load(f)
                last_sync_str = data.get("last_sync")
                if last_sync_str:
                    self._last_sync = datetime.fromisoformat(last_sync_str)
                    return self._last_sync
        return None

    def needs_sync(self) -> bool:
        """Check if sync is needed based on time elapsed."""
        last_sync = self.get_last_sync_time()
        if last_sync is None:
            return True

        elapsed = datetime.now(timezone.utc) - last_sync
        elapsed_minutes = elapsed.total_seconds() / 60
        return elapsed_minutes >= SYNC_INTERVAL_MINUTES

    def clear_cache(self) -> None:
        """Clear the due cards cache."""
        cache_file = self._get_cache_file()
        if cache_file.exists():
            cache_file.unlink()
        self._last_sync = None

    def start_card_review(
        self, card_id: str, total_sections: int
    ) -> CardReviewProgress:
        """Start tracking a new card review."""
        progress = CardReviewProgress(
            card_id=card_id, total_sections=total_sections, section_reviews=[]
        )
        self._in_progress[card_id] = progress
        return progress

    def get_card_progress(self, card_id: str) -> Optional[CardReviewProgress]:
        """Get in-progress review for a card."""
        return self._in_progress.get(card_id)

    def record_section_review(
        self, card_id: str, section_index: int, remembered: bool, total_sections: int
    ) -> CardReviewProgress:
        """Record a section review and return updated progress."""
        progress = self._in_progress.get(card_id)

        # Reset progress if total_sections changed (e.g., switching to card-level review)
        if progress and progress.total_sections != total_sections:
            progress = None

        if not progress:
            progress = self.start_card_review(card_id, total_sections)

        progress.add_section_review(section_index, remembered)
        return progress

    def complete_card_review(self, card_id: str) -> Optional[CardReviewProgress]:
        """Mark card review as complete and return final progress."""
        return self._in_progress.pop(card_id, None)
