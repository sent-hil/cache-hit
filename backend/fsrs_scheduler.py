from fsrs import Scheduler, Card, Rating, ReviewLog
from datetime import datetime, timezone
from typing import Tuple, Dict


class FSRSScheduler:
    """Wrapper around py-fsrs with our database integration."""

    def __init__(self, desired_retention: float = 0.9):
        self.fsrs = Scheduler()
        self.desired_retention = desired_retention

    def review_card(self, card_state: Dict, rating: int) -> Tuple[Dict, Dict]:
        """
        Process a review and return updated state.

        Args:
            card_state: Dict with difficulty, stability, due_date, state, reps, lapses, last_review
            rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

        Returns:
            (updated_card_state, review_log)
        """
        # Convert our state to py-fsrs Card object
        card = self._to_fsrs_card(card_state)

        # Convert rating
        fsrs_rating = Rating(rating)

        # Get current time
        now = datetime.now(timezone.utc)

        # Review the card using the Scheduler API
        # review_card returns (updated_card, review_log)
        updated_card, review_log = self.fsrs.review_card(card, fsrs_rating, now)

        # Convert back to our format
        new_state = self._from_fsrs_card(updated_card)
        log = self._from_review_log(review_log)

        return new_state, log

    def _to_fsrs_card(self, state: Dict) -> Card:
        """Convert our database state to py-fsrs Card."""
        card = Card()

        # Set FSRS parameters
        # For new cards, keep stability and difficulty as None (FSRS will initialize them)
        if state.get("state") != "new":
            card.difficulty = state.get("difficulty")
            card.stability = state.get("stability")

        card.reps = state.get("reps", 0)
        card.lapses = state.get("lapses", 0)

        # Parse dates
        if state.get("due_date"):
            card.due = datetime.fromisoformat(state["due_date"])
        else:
            card.due = datetime.now(timezone.utc)

        if state.get("last_review"):
            card.last_review = datetime.fromisoformat(state["last_review"])

        # Map our state to FSRS State enum
        # Import State enum
        from fsrs import State
        state_map = {
            "new": State.Learning,  # New cards start in Learning state
            "learning": State.Learning,
            "review": State.Review,
            "relearning": State.Relearning,
        }
        card.state = state_map.get(state.get("state", "new"), State.Learning)

        return card

    def _from_fsrs_card(self, card: Card) -> Dict:
        """Convert py-fsrs Card back to our format."""
        # Map FSRS State enum back to our state strings
        from fsrs import State
        state_map = {
            State.Learning: "learning",
            State.Review: "review",
            State.Relearning: "relearning",
        }

        return {
            "difficulty": card.difficulty if card.difficulty is not None else 5.0,
            "stability": card.stability if card.stability is not None else 0.0,
            "due_date": card.due.isoformat(),
            "reps": card.reps,
            "lapses": card.lapses,
            "state": state_map.get(card.state, "learning"),
            "last_review": card.last_review.isoformat() if card.last_review else None,
        }

    def _from_review_log(self, log: ReviewLog) -> Dict:
        """Convert ReviewLog to our format."""
        return {
            "rating": log.rating.value,
            "review_time": log.review_datetime.isoformat(),
            "scheduled_days": None,  # Not available in py-fsrs 6.x
            "elapsed_days": None,  # Not available in py-fsrs 6.x
            "review_state": None,  # Not available in py-fsrs 6.x
        }
