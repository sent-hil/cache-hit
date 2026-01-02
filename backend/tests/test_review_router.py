"""Tests for the Mochi-integrated review router."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from mochi_client import Card, Section
from review_router import get_mochi_client, get_review_cache
from review_storage import ReviewCache

# Mock cards for testing
MOCK_CARDS = [
    Card(
        id="card1",
        content="Question 1\n---\nAnswer 1",
        deck_id="deck1",
        sections=[Section(question="Question 1", answer="Answer 1")],
        name="Card 1",
    ),
    Card(
        id="card2",
        content="Q2 Part A\n---\nA2 Part A\n---\nQ2 Part B\n---\nA2 Part B",
        deck_id="deck1",
        sections=[
            Section(question="Q2 Part A", answer="A2 Part A"),
            Section(question="Q2 Part B", answer="A2 Part B"),
        ],
        name="Card 2",
    ),
]


@pytest.fixture
def mock_mochi_client():
    """Create a mock MochiClient."""
    mock = MagicMock()
    mock.get_due_cards.return_value = MOCK_CARDS
    mock.update_card_review.return_value = {"success": True}
    return mock


@pytest.fixture
def mock_review_cache():
    """Create a fresh ReviewCache for each test."""
    cache = ReviewCache(cache_dir="test_review_cache")
    yield cache
    # Cleanup
    cache_dir = Path("test_review_cache")
    if cache_dir.exists():
        for file in cache_dir.glob("*"):
            file.unlink()
        cache_dir.rmdir()


@pytest.fixture
def client(mock_mochi_client, mock_review_cache):
    """Create a test client with mocked dependencies."""
    # Import app here to avoid loading before mocks are set up
    from main import app

    # Override dependencies
    app.dependency_overrides[get_mochi_client] = lambda: mock_mochi_client
    app.dependency_overrides[get_review_cache] = lambda: mock_review_cache

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client

    # Clear overrides
    app.dependency_overrides.clear()


class TestGetDueCards:
    def test_get_due_cards_returns_cards(self, client, mock_mochi_client):
        response = client.get("/api/due")

        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        assert "total_due" in data
        assert len(data["cards"]) == 2
        assert data["total_due"] == 2
        mock_mochi_client.get_due_cards.assert_called_once()

    def test_get_due_cards_includes_sections(self, client):
        response = client.get("/api/due")

        assert response.status_code == 200
        data = response.json()
        first_card = data["cards"][0]
        assert "sections" in first_card
        assert "total_sections" in first_card
        assert first_card["total_sections"] == 1

        second_card = data["cards"][1]
        assert second_card["total_sections"] == 2

    def test_get_due_cards_mochi_error_returns_cached(
        self, client, mock_mochi_client, mock_review_cache
    ):
        # Pre-populate cache
        mock_review_cache.cache_due_cards([{"id": "cached_card", "content": "cached"}])

        # Make Mochi fail
        mock_mochi_client.get_due_cards.side_effect = Exception("Mochi unavailable")

        response = client.get("/api/due")

        assert response.status_code == 200
        data = response.json()
        assert len(data["cards"]) == 1
        assert data["cards"][0]["id"] == "cached_card"


class TestSubmitReview:
    def test_submit_single_section_review(self, client, mock_mochi_client):
        response = client.post(
            "/api/review",
            json={
                "card_id": "card1",
                "section_index": 0,
                "remembered": True,
                "total_sections": 1,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["card_complete"] is True
        assert data["synced_to_mochi"] is True
        assert data["aggregate_remembered"] is True
        mock_mochi_client.update_card_review.assert_called_once_with(
            "card1", remembered=True
        )

    def test_submit_multi_section_first_section(self, client, mock_mochi_client):
        response = client.post(
            "/api/review",
            json={
                "card_id": "card2",
                "section_index": 0,
                "remembered": True,
                "total_sections": 2,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["card_complete"] is False
        assert data["synced_to_mochi"] is False
        assert data["sections_reviewed"] == 1
        mock_mochi_client.update_card_review.assert_not_called()

    def test_submit_multi_section_completes_card(self, client, mock_mochi_client):
        # First section
        client.post(
            "/api/review",
            json={
                "card_id": "card2",
                "section_index": 0,
                "remembered": True,
                "total_sections": 2,
            },
        )

        # Second section - should complete
        response = client.post(
            "/api/review",
            json={
                "card_id": "card2",
                "section_index": 1,
                "remembered": True,
                "total_sections": 2,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["card_complete"] is True
        assert data["synced_to_mochi"] is True
        assert data["aggregate_remembered"] is True
        mock_mochi_client.update_card_review.assert_called_once_with(
            "card2", remembered=True
        )

    def test_aggregate_forgot_if_any_forgot(self, client, mock_mochi_client):
        # First section - remembered
        client.post(
            "/api/review",
            json={
                "card_id": "card2",
                "section_index": 0,
                "remembered": True,
                "total_sections": 2,
            },
        )

        # Second section - forgot
        response = client.post(
            "/api/review",
            json={
                "card_id": "card2",
                "section_index": 1,
                "remembered": False,
                "total_sections": 2,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["aggregate_remembered"] is False
        mock_mochi_client.update_card_review.assert_called_once_with(
            "card2", remembered=False
        )

    def test_mochi_sync_error_returns_503(self, client, mock_mochi_client):
        mock_mochi_client.update_card_review.side_effect = Exception("Mochi error")

        response = client.post(
            "/api/review",
            json={
                "card_id": "card1",
                "section_index": 0,
                "remembered": True,
                "total_sections": 1,
            },
        )

        assert response.status_code == 503
        assert "sync" in response.json()["detail"].lower()


class TestReviewCache:
    def test_cache_stores_due_cards(self, mock_review_cache):
        cards = [{"id": "test1"}, {"id": "test2"}]
        mock_review_cache.cache_due_cards(cards)

        cached = mock_review_cache.get_cached_due_cards()
        assert cached == cards

    def test_section_review_tracking(self, mock_review_cache):
        progress = mock_review_cache.record_section_review(
            card_id="card1", section_index=0, remembered=True, total_sections=2
        )

        assert progress.card_id == "card1"
        assert len(progress.section_reviews) == 1
        assert progress.is_complete() is False

    def test_section_review_completes(self, mock_review_cache):
        mock_review_cache.record_section_review(
            card_id="card1", section_index=0, remembered=True, total_sections=2
        )
        progress = mock_review_cache.record_section_review(
            card_id="card1", section_index=1, remembered=True, total_sections=2
        )

        assert progress.is_complete() is True
        assert progress.get_aggregate_result() is True

    def test_aggregate_false_if_any_forgot(self, mock_review_cache):
        mock_review_cache.record_section_review(
            card_id="card1", section_index=0, remembered=True, total_sections=2
        )
        progress = mock_review_cache.record_section_review(
            card_id="card1", section_index=1, remembered=False, total_sections=2
        )

        assert progress.get_aggregate_result() is False
