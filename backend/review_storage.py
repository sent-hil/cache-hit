"""
Cache storage for Mochi card reviews.

Stores:
- Cached due cards from Mochi (for faster initial loads)
- In-progress section reviews for the current card
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


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

    def _get_cache_file(self) -> Path:
        """Get the cache file path."""
        return self.cache_dir / "due_cards_cache.json"

    def cache_due_cards(self, cards: list[dict]) -> None:
        """Cache due cards from Mochi."""
        cache_file = self._get_cache_file()
        with open(cache_file, "w") as f:
            json.dump({"cards": cards}, f, indent=2, default=str)

    def get_cached_due_cards(self) -> Optional[list[dict]]:
        """Get cached due cards, if available."""
        cache_file = self._get_cache_file()
        if cache_file.exists():
            with open(cache_file, "r") as f:
                data = json.load(f)
                return data.get("cards")
        return None

    def clear_cache(self) -> None:
        """Clear the due cards cache."""
        cache_file = self._get_cache_file()
        if cache_file.exists():
            cache_file.unlink()

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
        if not progress:
            progress = self.start_card_review(card_id, total_sections)

        progress.add_section_review(section_index, remembered)
        return progress

    def complete_card_review(self, card_id: str) -> Optional[CardReviewProgress]:
        """Mark card review as complete and return final progress."""
        return self._in_progress.pop(card_id, None)
