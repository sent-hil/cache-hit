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


class TestListDecks:
    def test_list_all_decks(self, client):
        response = client.get("/api/decks")

        assert response.status_code == 200
        data = response.json()
        assert "decks" in data
        assert isinstance(data["decks"], list)
        assert len(data["decks"]) >= 3  # All + Python + Ruby

        deck_names = [d["name"] for d in data["decks"]]
        assert "All" in deck_names
        assert "Python" in deck_names
        assert "Ruby" in deck_names

    def test_list_decks_structure(self, client):
        response = client.get("/api/decks")

        assert response.status_code == 200
        data = response.json()

        for deck in data["decks"]:
            assert "id" in deck
            assert "name" in deck
            assert "total_cards" in deck
            assert isinstance(deck["total_cards"], int)

    def test_all_deck_is_first(self, client):
        response = client.get("/api/decks")

        assert response.status_code == 200
        data = response.json()
        assert data["decks"][0]["id"] == "all"
        assert data["decks"][0]["name"] == "All"

    def test_all_deck_total_cards(self, client):
        response = client.get("/api/decks")

        assert response.status_code == 200
        data = response.json()

        # Get "All" deck total
        all_deck = next(d for d in data["decks"] if d["id"] == "all")
        all_total = all_deck["total_cards"]

        # Calculate sum of individual decks
        individual_total = sum(
            d["total_cards"] for d in data["decks"] if d["id"] != "all"
        )

        assert all_total == individual_total


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

    def test_get_all_deck(self, client):
        response = client.get("/api/decks/all")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "all"
        assert data["name"] == "All"
        assert data["total_cards"] > 0
        assert len(data["cards"]) == data["total_cards"]

    def test_all_deck_combines_all_cards(self, client):
        # Get individual decks
        python_response = client.get("/api/decks/QhL3SFpO")
        ruby_response = client.get("/api/decks/wvsBwDcA")
        python_data = python_response.json()
        ruby_data = ruby_response.json()

        # Get "all" deck
        all_response = client.get("/api/decks/all")
        all_data = all_response.json()

        # Verify total cards match
        expected_total = python_data["total_cards"] + ruby_data["total_cards"]
        assert all_data["total_cards"] == expected_total


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

    def test_get_card_from_all_deck(self, client):
        response = client.get("/api/decks/all/cards/0")

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "sections" in data
        assert len(data["sections"]) > 0

    def test_get_card_from_all_deck_invalid_index(self, client):
        response = client.get("/api/decks/all/cards/99999")

        assert response.status_code == 404
        assert "out of range" in response.json()["detail"].lower()
