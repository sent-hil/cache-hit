import logging
from functools import lru_cache
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from deck_parser import Card, Deck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@lru_cache
def get_deck_cache() -> Dict[str, Deck]:
    return {}


@router.get("/decks")
async def list_decks(cache: Dict[str, Deck] = Depends(get_deck_cache)):
    logger.info("Listing all decks")
    decks = []

    # Add "All" option first
    total_cards_all = sum(deck.total_cards for deck in cache.values())
    decks.append({"id": "all", "name": "All", "total_cards": total_cards_all})

    # Add individual decks
    for deck_id, deck in cache.items():
        decks.append(
            {"id": deck.id, "name": deck.name, "total_cards": deck.total_cards}
        )
    return {"decks": decks}


@router.get("/decks/{deck_id}", response_model=Deck)
async def get_deck(deck_id: str, cache: Dict[str, Deck] = Depends(get_deck_cache)):
    logger.info(f"Getting deck: {deck_id}")

    # Handle "all" deck - combine all decks
    if deck_id == "all":
        all_cards = []
        for deck in cache.values():
            all_cards.extend(deck.cards)

        combined_deck = Deck(
            id="all", name="All", total_cards=len(all_cards), cards=all_cards
        )
        return combined_deck

    if deck_id not in cache:
        raise HTTPException(status_code=404, detail=f"Deck not found: {deck_id}")

    return cache[deck_id]


@router.get("/decks/{deck_id}/cards/{card_index}", response_model=Card)
async def get_card(
    deck_id: str, card_index: int, cache: Dict[str, Deck] = Depends(get_deck_cache)
):
    logger.info(f"Getting card {card_index} from deck: {deck_id}")

    # Handle "all" deck - combine all cards
    if deck_id == "all":
        all_cards = []
        for deck in cache.values():
            all_cards.extend(deck.cards)

        if card_index < 0 or card_index >= len(all_cards):
            raise HTTPException(
                status_code=404,
                detail=f"Card index {card_index} out of range (0-{len(all_cards) - 1})",
            )

        return all_cards[card_index]

    if deck_id not in cache:
        raise HTTPException(status_code=404, detail=f"Deck not found: {deck_id}")

    deck = cache[deck_id]

    if card_index < 0 or card_index >= len(deck.cards):
        raise HTTPException(
            status_code=404,
            detail=f"Card index {card_index} out of range (0-{len(deck.cards) - 1})",
        )

    return deck.cards[card_index]
