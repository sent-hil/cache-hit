from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from main import app
from review_storage import ReviewStorage


@pytest.fixture
def storage():
    storage = ReviewStorage(data_dir="test_review_data")
    yield storage
    import shutil

    shutil.rmtree("test_review_data", ignore_errors=True)


class TestResetReviews:
    def test_reset_reviews_makes_all_cards_due_today(self, storage):
        user_id = "test_user"
        deck_id = "test_deck"

        storage.create_card_state(user_id, deck_id, "card1", 0)
        storage.create_card_state(user_id, deck_id, "card1", 1)
        storage.create_card_state(user_id, deck_id, "card2", 0)

        future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        storage.update_card_state(
            user_id, deck_id, "card1", 0, {"due_date": future_date}
        )
        storage.update_card_state(
            user_id, deck_id, "card1", 1, {"due_date": future_date}
        )
        storage.update_card_state(
            user_id, deck_id, "card2", 0, {"due_date": future_date}
        )

        cards_reset = storage.reset_reviews_for_today(user_id, deck_id)

        assert cards_reset == 3

        state1 = storage.get_card_state(user_id, deck_id, "card1", 0)
        state2 = storage.get_card_state(user_id, deck_id, "card1", 1)
        state3 = storage.get_card_state(user_id, deck_id, "card2", 0)

        now = datetime.now(timezone.utc)
        for state in [state1, state2, state3]:
            due_date = datetime.fromisoformat(state["due_date"])
            assert (now - due_date).total_seconds() < 2

    def test_reset_reviews_returns_zero_for_empty_deck(self, storage):
        user_id = "test_user"
        deck_id = "empty_deck"

        cards_reset = storage.reset_reviews_for_today(user_id, deck_id)

        assert cards_reset == 0

    def test_reset_reviews_makes_cards_appear_in_due_list(self, storage):
        user_id = "test_user"
        deck_id = "test_deck"

        storage.create_card_state(user_id, deck_id, "card1", 0)

        future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        storage.update_card_state(
            user_id, deck_id, "card1", 0, {"due_date": future_date}
        )

        due_before = storage.get_due_cards(user_id, deck_id)
        assert len(due_before) == 0

        storage.reset_reviews_for_today(user_id, deck_id)

        due_after = storage.get_due_cards(user_id, deck_id)
        assert len(due_after) == 1
        assert due_after[0]["card_id"] == "card1"


class TestResetReviewsEndpoint:
    def test_reset_endpoint_returns_success(self):
        client = TestClient(app)

        response = client.post(
            "/api/review/reset", json={"user_id": "user1", "deck_id": "QhL3SFpO"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "cards_reset" in data
        assert isinstance(data["cards_reset"], int)

    def test_reset_endpoint_with_existing_reviews(self):
        client = TestClient(app)

        client.post(
            "/api/review",
            json={
                "user_id": "user1",
                "deck_id": "test_deck",
                "card_id": "card1",
                "section_index": 0,
                "rating": 4,
            },
        )

        response = client.post(
            "/api/review/reset", json={"user_id": "user1", "deck_id": "test_deck"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["cards_reset"] > 0
