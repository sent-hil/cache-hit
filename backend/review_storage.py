import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional


class ReviewStorage:
    """JSON file-based storage for review states."""

    def __init__(self, data_dir: str = "review_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def _get_user_file(self, user_id: str, deck_id: str) -> Path:
        """Get the JSON file path for a user's deck."""
        return self.data_dir / f"{user_id}_{deck_id}.json"

    def _load_user_data(self, user_id: str, deck_id: str) -> Dict:
        """Load all card states for a user's deck."""
        file_path = self._get_user_file(user_id, deck_id)
        if file_path.exists():
            with open(file_path, 'r') as f:
                return json.load(f)
        return {"card_states": {}, "review_logs": []}

    def _save_user_data(self, user_id: str, deck_id: str, data: Dict):
        """Save all card states for a user's deck."""
        file_path = self._get_user_file(user_id, deck_id)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def _make_key(self, card_id: str, section_index: int) -> str:
        """Create a unique key for a card section."""
        return f"{card_id}_{section_index}"

    def get_card_state(
        self,
        user_id: str,
        deck_id: str,
        card_id: str,
        section_index: int
    ) -> Optional[Dict]:
        """Get current state for a card section."""
        data = self._load_user_data(user_id, deck_id)
        key = self._make_key(card_id, section_index)
        return data["card_states"].get(key)

    def create_card_state(
        self,
        user_id: str,
        deck_id: str,
        card_id: str,
        section_index: int
    ) -> Dict:
        """Initialize a new card state."""
        now = datetime.now(timezone.utc)

        state = {
            "user_id": user_id,
            "deck_id": deck_id,
            "card_id": card_id,
            "section_index": section_index,
            "difficulty": 5.0,
            "stability": 0.0,
            "retrievability": 0.0,
            "state": "new",
            "due_date": now.isoformat(),
            "last_review": None,
            "reps": 0,
            "lapses": 0,
            "created_at": now.isoformat(),
        }

        data = self._load_user_data(user_id, deck_id)
        key = self._make_key(card_id, section_index)
        data["card_states"][key] = state
        self._save_user_data(user_id, deck_id, data)

        return state

    def update_card_state(
        self,
        user_id: str,
        deck_id: str,
        card_id: str,
        section_index: int,
        new_state: Dict
    ):
        """Update card state after review."""
        data = self._load_user_data(user_id, deck_id)
        key = self._make_key(card_id, section_index)

        # Update the state
        data["card_states"][key].update(new_state)
        data["card_states"][key]["updated_at"] = datetime.now(timezone.utc).isoformat()

        self._save_user_data(user_id, deck_id, data)

    def save_review_log(
        self,
        user_id: str,
        deck_id: str,
        card_id: str,
        section_index: int,
        log: Dict
    ):
        """Record a review event."""
        data = self._load_user_data(user_id, deck_id)

        log_entry = {
            "user_id": user_id,
            "deck_id": deck_id,
            "card_id": card_id,
            "section_index": section_index,
            "rating": log["rating"],
            "review_time": log["review_time"],
            "scheduled_days": log.get("scheduled_days"),
            "elapsed_days": log.get("elapsed_days"),
            "review_state": log.get("review_state"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        data["review_logs"].append(log_entry)
        self._save_user_data(user_id, deck_id, data)

    def get_due_cards(
        self,
        user_id: str,
        deck_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Get all cards due for review."""
        now = datetime.now(timezone.utc)
        data = self._load_user_data(user_id, deck_id)

        due_cards = []
        for key, state in data["card_states"].items():
            due_date = datetime.fromisoformat(state["due_date"])
            if due_date <= now:
                due_cards.append(state)

        # Sort by due date (oldest first)
        due_cards.sort(key=lambda x: datetime.fromisoformat(x["due_date"]))

        return due_cards[:limit]

    def reset_reviews_for_today(
        self,
        user_id: str,
        deck_id: str
    ) -> int:
        """Reset all card states to be due today. Returns number of cards reset."""
        now = datetime.now(timezone.utc)
        data = self._load_user_data(user_id, deck_id)

        count = 0
        for key, state in data["card_states"].items():
            state["due_date"] = now.isoformat()
            state["updated_at"] = now.isoformat()
            count += 1

        if count > 0:
            self._save_user_data(user_id, deck_id, data)

        return count
