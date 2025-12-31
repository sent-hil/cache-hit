from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app
from review_router import get_review_storage


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def clear_review_data():
    storage = get_review_storage()
    review_data_dir = Path(storage.data_dir)
    if review_data_dir.exists():
        for file in review_data_dir.glob("test_*.json"):
            file.unlink()
    yield
    if review_data_dir.exists():
        for file in review_data_dir.glob("test_*.json"):
            file.unlink()


class TestSubmitReview:
    def test_submit_valid_review_again(self, client, clear_review_data):
        response = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 1,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "next_review_date" in data
        assert data["difficulty"] > 0
        assert data["stability"] >= 0
        assert data["state"] in ["learning", "review", "relearning"]

    def test_submit_valid_review_hard(self, client, clear_review_data):
        response = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 2,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_submit_valid_review_good(self, client, clear_review_data):
        response = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 3,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_submit_valid_review_easy(self, client, clear_review_data):
        response = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 4,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_submit_invalid_rating_zero(self, client, clear_review_data):
        response = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 0,
            },
        )

        assert response.status_code == 400
        assert "rating must be 1-4" in response.json()["detail"].lower()

    def test_submit_invalid_rating_five(self, client, clear_review_data):
        response = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 5,
            },
        )

        assert response.status_code == 400
        assert "rating must be 1-4" in response.json()["detail"].lower()

    def test_submit_review_updates_state(self, client, clear_review_data):
        response1 = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 4,
            },
        )

        response2 = client.post(
            "/api/review",
            json={
                "user_id": "test_user",
                "deck_id": "QhL3SFpO",
                "card_id": "test_card",
                "section_index": 0,
                "rating": 4,
            },
        )

        assert response1.status_code == 200
        assert response2.status_code == 200
        date1 = response1.json()["next_review_date"]
        date2 = response2.json()["next_review_date"]
        assert date2 > date1


class TestGetDueCards:
    def test_get_due_cards_first_time(self, client, clear_review_data):
        response = client.get("/api/review/due?user_id=test_user&deck_id=QhL3SFpO")

        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        assert "total_due" in data
        assert len(data["cards"]) > 0
        assert data["total_due"] > 0

    def test_get_due_cards_from_nonexistent_deck(self, client, clear_review_data):
        response = client.get("/api/review/due?user_id=test_user&deck_id=NONEXISTENT")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_due_cards_after_review(self, client, clear_review_data):
        response1 = client.get("/api/review/due?user_id=test_user2&deck_id=QhL3SFpO")
        initial_count = response1.json()["total_due"]

        first_card = response1.json()["cards"][0]
        for section in first_card["due_sections"]:
            client.post(
                "/api/review",
                json={
                    "user_id": "test_user2",
                    "deck_id": "QhL3SFpO",
                    "card_id": first_card["card"]["id"],
                    "section_index": section["section_index"],
                    "rating": 4,
                },
            )

        response2 = client.get("/api/review/due?user_id=test_user2&deck_id=QhL3SFpO")
        final_count = response2.json()["total_due"]

        assert final_count < initial_count

    def test_due_cards_have_card_data(self, client, clear_review_data):
        response = client.get("/api/review/due?user_id=test_user3&deck_id=QhL3SFpO")

        assert response.status_code == 200
        data = response.json()
        first_card = data["cards"][0]
        assert "card" in first_card
        assert "due_sections" in first_card
        assert "id" in first_card["card"]
        assert "sections" in first_card["card"]
        assert len(first_card["due_sections"]) > 0

    def test_due_sections_have_review_data(self, client, clear_review_data):
        response = client.get("/api/review/due?user_id=test_user4&deck_id=QhL3SFpO")

        assert response.status_code == 200
        data = response.json()
        first_section = data["cards"][0]["due_sections"][0]
        assert "section_index" in first_section
        assert "due_date" in first_section
        assert "difficulty" in first_section
        assert "reps" in first_section
        assert "state" in first_section
