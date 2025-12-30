import logging
from typing import Dict
from functools import lru_cache
from fastapi import APIRouter, HTTPException, Depends

from deck_parser import Deck, Card

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@lru_cache
def get_deck_cache() -> Dict[str, Deck]:
    return {}


@router.get("/decks/{deck_id}", response_model=Deck)
async def get_deck(
    deck_id: str,
    cache: Dict[str, Deck] = Depends(get_deck_cache)
):
    logger.info(f"Getting deck: {deck_id}")

    if deck_id not in cache:
        raise HTTPException(status_code=404, detail=f"Deck not found: {deck_id}")

    return cache[deck_id]


@router.get("/decks/{deck_id}/cards/{card_index}", response_model=Card)
async def get_card(
    deck_id: str,
    card_index: int,
    cache: Dict[str, Deck] = Depends(get_deck_cache)
):
    logger.info(f"Getting card {card_index} from deck: {deck_id}")

    if deck_id not in cache:
        raise HTTPException(status_code=404, detail=f"Deck not found: {deck_id}")

    deck = cache[deck_id]

    if card_index < 0 or card_index >= len(deck.cards):
        raise HTTPException(
            status_code=404,
            detail=f"Card index {card_index} out of range (0-{len(deck.cards) - 1})",
        )

    return deck.cards[card_index]
