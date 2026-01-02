"""Tests for sync functionality and deduplication."""

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from mochi_client import Card, Section
from review_storage import SYNC_INTERVAL_MINUTES, ReviewCache
from sync_manager import SyncManager


@pytest.fixture
def review_cache():
    """Create a fresh ReviewCache for each test."""
    cache = ReviewCache(cache_dir="test_sync_cache")
    yield cache
    # Cleanup
    cache_dir = Path("test_sync_cache")
    if cache_dir.exists():
        for file in cache_dir.glob("*"):
            file.unlink()
        cache_dir.rmdir()


@pytest.fixture
def mock_mochi_client():
    """Create a mock MochiClient."""
    mock = MagicMock()
    mock.get_due_cards.return_value = [
        Card(
            id="card1",
            content="Q1\n---\nA1",
            deck_id="deck1",
            sections=[Section(question="Q1", answer="A1")],
            name="Card 1",
        ),
    ]
    return mock


@pytest.fixture
def card_to_dict():
    """Card to dict converter."""

    def convert(card):
        return {
            "id": card.id,
            "content": card.content,
            "deck_id": card.deck_id,
            "name": card.name,
            "sections": [
                {"question": s.question, "answer": s.answer} for s in card.sections
            ],
        }

    return convert


class TestDeduplication:
    def test_deduplicate_removes_duplicate_cards(self, review_cache):
        cards = [
            {"id": "card1", "name": "Card 1"},
            {"id": "card2", "name": "Card 2"},
            {"id": "card1", "name": "Card 1 Duplicate"},  # Duplicate
            {"id": "card3", "name": "Card 3"},
        ]

        review_cache.cache_due_cards(cards)
        cached = review_cache.get_cached_due_cards()

        assert len(cached) == 3
        card_ids = [c["id"] for c in cached]
        assert card_ids == ["card1", "card2", "card3"]

    def test_deduplicate_keeps_first_occurrence(self, review_cache):
        cards = [
            {"id": "card1", "name": "First"},
            {"id": "card1", "name": "Second"},
        ]

        review_cache.cache_due_cards(cards)
        cached = review_cache.get_cached_due_cards()

        assert len(cached) == 1
        assert cached[0]["name"] == "First"

    def test_deduplicate_handles_no_duplicates(self, review_cache):
        cards = [
            {"id": "card1", "name": "Card 1"},
            {"id": "card2", "name": "Card 2"},
        ]

        review_cache.cache_due_cards(cards)
        cached = review_cache.get_cached_due_cards()

        assert len(cached) == 2

    def test_deduplicate_handles_empty_list(self, review_cache):
        review_cache.cache_due_cards([])
        cached = review_cache.get_cached_due_cards()

        assert cached == []

    def test_deduplicate_skips_cards_without_id(self, review_cache):
        cards = [
            {"id": "card1", "name": "Card 1"},
            {"name": "No ID Card"},  # No id field - will be skipped
            {"id": "card2", "name": "Card 2"},
        ]

        review_cache.cache_due_cards(cards)
        cached = review_cache.get_cached_due_cards()

        # Cards without ID are skipped (invalid cards)
        assert len(cached) == 2
        card_ids = [c["id"] for c in cached]
        assert "card1" in card_ids
        assert "card2" in card_ids


class TestSyncTiming:
    def test_needs_sync_true_when_never_synced(self, review_cache):
        assert review_cache.needs_sync() is True

    def test_needs_sync_false_after_recent_sync(self, review_cache):
        review_cache.cache_due_cards([{"id": "card1"}])

        assert review_cache.needs_sync() is False

    def test_needs_sync_true_after_interval(self, review_cache):
        review_cache.cache_due_cards([{"id": "card1"}])

        # Mock time to be past the sync interval
        past_time = datetime.now(timezone.utc) - timedelta(
            minutes=SYNC_INTERVAL_MINUTES + 1
        )
        review_cache._last_sync = past_time

        assert review_cache.needs_sync() is True

    def test_last_sync_time_persisted_to_file(self, review_cache):
        review_cache.cache_due_cards([{"id": "card1"}])

        # Create new cache instance pointing to same dir
        new_cache = ReviewCache(cache_dir="test_sync_cache")

        assert new_cache.get_last_sync_time() is not None

    def test_clear_cache_resets_sync_time(self, review_cache):
        review_cache.cache_due_cards([{"id": "card1"}])
        assert review_cache.get_last_sync_time() is not None

        review_cache.clear_cache()

        assert review_cache._last_sync is None
        assert review_cache.needs_sync() is True


class TestSyncManager:
    @pytest.mark.asyncio
    async def test_sync_manager_starts_and_stops(
        self, mock_mochi_client, review_cache, card_to_dict
    ):
        manager = SyncManager(mock_mochi_client, review_cache, card_to_dict)

        assert manager.is_running() is False

        manager.start()
        assert manager.is_running() is True

        # Allow task to start
        await asyncio.sleep(0.1)

        await manager.stop()
        assert manager.is_running() is False

    @pytest.mark.asyncio
    async def test_sync_due_cards_fetches_and_caches(
        self, mock_mochi_client, review_cache, card_to_dict
    ):
        manager = SyncManager(mock_mochi_client, review_cache, card_to_dict)

        count = await manager.sync_due_cards()

        assert count == 1
        mock_mochi_client.get_due_cards.assert_called_once()

        cached = review_cache.get_cached_due_cards()
        assert len(cached) == 1
        assert cached[0]["id"] == "card1"

    @pytest.mark.asyncio
    async def test_sync_due_cards_handles_error(
        self, mock_mochi_client, review_cache, card_to_dict
    ):
        mock_mochi_client.get_due_cards.side_effect = Exception("API Error")
        manager = SyncManager(mock_mochi_client, review_cache, card_to_dict)

        with pytest.raises(Exception, match="API Error"):
            await manager.sync_due_cards()

    @pytest.mark.asyncio
    async def test_sync_manager_does_not_start_twice(
        self, mock_mochi_client, review_cache, card_to_dict
    ):
        manager = SyncManager(mock_mochi_client, review_cache, card_to_dict)
        manager.start()
        manager.start()  # Should not error, just warn

        assert manager.is_running() is True

        await manager.stop()


class TestSyncInterval:
    def test_sync_interval_is_30_minutes(self):
        assert SYNC_INTERVAL_MINUTES == 30
