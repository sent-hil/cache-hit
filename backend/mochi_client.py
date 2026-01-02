"""
Mochi Cards API Client

A minimal Python client for interacting with the Mochi Cards API.
Implements fetching due cards and updating card reviews.

API Reference: https://mochi.cards/docs/api/
"""

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import requests


@dataclass
class Section:
    """Represents a Q&A section within a card."""

    question: str
    answer: str


@dataclass
class Card:
    """Represents a Mochi card."""

    id: str
    content: str
    deck_id: str
    sections: list[Section]
    name: Optional[str] = None
    reviews: Optional[list] = None

    @classmethod
    def from_api_response(cls, data: dict) -> "Card":
        """Create a Card from API response data."""
        content = data.get("content", "")
        sections = cls._parse_sections(content)

        return cls(
            id=data.get("id", ""),
            content=content,
            deck_id=data.get("deck-id", ""),
            sections=sections,
            name=data.get("name"),
            reviews=data.get("reviews"),
        )

    @staticmethod
    def _parse_sections(content: str) -> list[Section]:
        """Parse card content into Q&A sections.

        Content format: question1\n---\nanswer1\n---\nquestion2\n---\nanswer2...
        """
        if not content:
            return []

        parts = [p.strip() for p in content.split("---")]
        sections = []

        # Pair up parts as question/answer
        for i in range(0, len(parts) - 1, 2):
            question = parts[i]
            answer = parts[i + 1] if i + 1 < len(parts) else ""
            if question:  # Only add if there's a question
                sections.append(Section(question=question, answer=answer))

        # Handle case where there's an odd number of parts (last question has no answer)
        if len(parts) % 2 == 1 and parts[-1]:
            sections.append(Section(question=parts[-1], answer=""))

        return sections if sections else [Section(question=content, answer="")]


class MochiClient:
    """Client for the Mochi Cards API."""

    BASE_URL = "https://app.mochi.cards/api"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("MOCHI_API_KEY", "")
        if not self.api_key:
            raise ValueError(
                "API key required. Pass api_key or set MOCHI_API_KEY environment variable."
            )

    def _auth(self) -> tuple[str, str]:
        """Return auth tuple for requests."""
        return (self.api_key, "")

    def _json_headers(self) -> dict[str, str]:
        """Headers for standard JSON requests."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _transit_headers(self) -> dict[str, str]:
        """Headers for transit+json requests (used for review updates)."""
        return {
            "Content-Type": "application/transit+json",
            "Accept": "application/transit+json",
        }

    def get_due_cards(
        self, deck_id: Optional[str] = None, date: Optional[datetime] = None
    ) -> list[Card]:
        """
        Fetch cards that are due for review.

        Args:
            deck_id: Optional deck ID to filter by. If None, returns due cards from all decks.
            date: Optional date to check due cards for. Defaults to today.

        Returns:
            List of Card objects that are due for review.
        """
        if deck_id:
            url = f"{self.BASE_URL}/due/{deck_id}"
        else:
            url = f"{self.BASE_URL}/due"

        params = {}
        if date:
            params["date"] = date.isoformat()

        response = requests.get(
            url, auth=self._auth(), headers=self._json_headers(), params=params
        )
        response.raise_for_status()

        data = response.json()
        cards_data = data.get("cards", [])

        return [Card.from_api_response(card) for card in cards_data]

    def update_card_review(self, card_id: str, remembered: bool) -> dict:
        """
        Update a card's review status.

        This uses an unpublished API endpoint that accepts transit+json format
        to record a review for a card.

        Args:
            card_id: The ID of the card to update.
            remembered: True if the card was remembered, False otherwise.

        Returns:
            The API response as a dictionary.
        """
        url = f"{self.BASE_URL}/cards/{card_id}"

        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        # Transit+JSON format for review data
        body = f"""{{
    "~:reviews": [
        {{
          "~:date": {{ "~#dt": {now_ms} }},
          "~:due": {{ "~#dt": {now_ms} }},
          "~:remembered?": {str(remembered).lower()}
        }}
    ]
}}"""

        response = requests.post(
            url,
            auth=self._auth(),
            headers=self._transit_headers(),
            data=body,
        )
        response.raise_for_status()

        return response.json()

    def get_card(self, card_id: str) -> Card:
        """
        Fetch a single card by ID.

        Args:
            card_id: The ID of the card to fetch.

        Returns:
            Card object.
        """
        url = f"{self.BASE_URL}/cards/{card_id}"
        response = requests.get(url, auth=self._auth(), headers=self._json_headers())
        response.raise_for_status()

        return Card.from_api_response(response.json())
