"""
Review API endpoints integrated with Mochi.

Endpoints:
- GET /api/due - Get all due cards from Mochi
- POST /api/review - Submit a section review
"""

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from mochi_client import Card, MochiClient
from review_storage import ReviewCache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


class ReviewRequest(BaseModel):
    card_id: str
    section_index: int
    remembered: bool
    total_sections: int


class ReviewResponse(BaseModel):
    success: bool
    card_complete: bool
    synced_to_mochi: bool
    sections_reviewed: int
    total_sections: int
    aggregate_remembered: bool | None = None


class DueCardsResponse(BaseModel):
    cards: list[dict]
    total_due: int


@lru_cache
def get_mochi_client() -> MochiClient:
    """Get singleton MochiClient instance."""
    return MochiClient()


@lru_cache
def get_review_cache() -> ReviewCache:
    """Get singleton ReviewCache instance."""
    return ReviewCache()


def card_to_dict(card: Card) -> dict:
    """Convert Card to JSON-serializable dict."""
    return {
        "id": card.id,
        "content": card.content,
        "deck_id": card.deck_id,
        "name": card.name,
        "sections": [
            {"question": s.question, "answer": s.answer} for s in card.sections
        ],
        "total_sections": len(card.sections),
    }


@router.get("/due")
async def get_due_cards(
    mochi: MochiClient = Depends(get_mochi_client),
    cache: ReviewCache = Depends(get_review_cache),
) -> DueCardsResponse:
    """Get all cards due for review from Mochi."""
    logger.info("Fetching due cards from Mochi")

    try:
        cards = mochi.get_due_cards()
        cards_data = [card_to_dict(card) for card in cards]

        # Cache for faster subsequent loads
        cache.cache_due_cards(cards_data)

        logger.info(f"Found {len(cards)} due cards")
        return DueCardsResponse(cards=cards_data, total_due=len(cards))

    except Exception as e:
        logger.error(f"Failed to fetch due cards from Mochi: {e}")

        # Try to return cached data if available
        cached = cache.get_cached_due_cards()
        if cached:
            logger.info("Returning cached due cards")
            return DueCardsResponse(cards=cached, total_due=len(cached))

        raise HTTPException(
            status_code=503, detail=f"Failed to fetch due cards from Mochi: {str(e)}"
        )


@router.post("/review", response_model=ReviewResponse)
async def submit_review(
    req: ReviewRequest,
    mochi: MochiClient = Depends(get_mochi_client),
    cache: ReviewCache = Depends(get_review_cache),
):
    """
    Submit a section review.

    Tracks section reviews locally. When all sections of a card are reviewed,
    syncs the aggregate result to Mochi (forgot if ANY section was forgot).
    """
    logger.info(
        f"Review submitted: card={req.card_id}, section={req.section_index}, "
        f"remembered={req.remembered}"
    )

    # Record this section's review
    progress = cache.record_section_review(
        card_id=req.card_id,
        section_index=req.section_index,
        remembered=req.remembered,
        total_sections=req.total_sections,
    )

    # Check if all sections are reviewed
    if progress.is_complete():
        aggregate_result = progress.get_aggregate_result()
        logger.info(
            f"Card {req.card_id} complete. Aggregate result: "
            f"{'remembered' if aggregate_result else 'forgot'}"
        )

        # Sync to Mochi
        try:
            mochi.update_card_review(req.card_id, remembered=aggregate_result)
            logger.info(f"Synced card {req.card_id} to Mochi")

            # Clear in-progress tracking
            cache.complete_card_review(req.card_id)

            # Clear due cards cache since it's now stale
            cache.clear_cache()

            return ReviewResponse(
                success=True,
                card_complete=True,
                synced_to_mochi=True,
                sections_reviewed=len(progress.section_reviews),
                total_sections=req.total_sections,
                aggregate_remembered=aggregate_result,
            )

        except Exception as e:
            logger.error(f"Failed to sync to Mochi: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Failed to sync review to Mochi: {str(e)}",
            )

    # Not complete yet, just record locally
    return ReviewResponse(
        success=True,
        card_complete=False,
        synced_to_mochi=False,
        sections_reviewed=len(progress.section_reviews),
        total_sections=req.total_sections,
        aggregate_remembered=None,
    )
