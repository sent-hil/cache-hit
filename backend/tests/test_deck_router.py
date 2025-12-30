import pytest
from fastapi.testclient import TestClient
from main import app
from deck_router import get_deck_cache


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def clear_deck_cache():
    cache = get_deck_cache()
    cache.clear()
    yield
    cache.clear()


class TestGetDeck:
    def test_get_existing_deck(self, client):
        response = client.get("/api/decks/QhL3SFpO")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "QhL3SFpO"
        assert data["name"] == "Python"
        assert data["total_cards"] > 0

    def test_get_nonexistent_deck(self, client):
        response = client.get("/api/decks/NONEXISTENT")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestGetCard:
    def test_get_existing_card(self, client):
        response = client.get("/api/decks/QhL3SFpO/cards/0")

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "sections" in data
        assert len(data["sections"]) > 0

    def test_get_card_from_nonexistent_deck(self, client):
        response = client.get("/api/decks/NONEXISTENT/cards/0")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_card_with_invalid_index(self, client):
        response = client.get("/api/decks/QhL3SFpO/cards/99999")

        assert response.status_code == 404
        assert "out of range" in response.json()["detail"].lower()

    def test_get_card_with_negative_index(self, client):
        response = client.get("/api/decks/QhL3SFpO/cards/-1")

        assert response.status_code == 404
        assert "out of range" in response.json()["detail"].lower()
