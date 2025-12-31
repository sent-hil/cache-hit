import logging
from functools import lru_cache
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from deck_parser import Deck
from deck_router import get_deck_cache
from fsrs_scheduler import FSRSScheduler
from review_storage import ReviewStorage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


class ReviewRequest(BaseModel):
    user_id: str
    deck_id: str
    card_id: str
    section_index: int
    rating: int


class ReviewResponse(BaseModel):
    success: bool
    next_review_date: str
    difficulty: float
    stability: float
    state: str


class ResetRequest(BaseModel):
    user_id: str
    deck_id: str


class ResetResponse(BaseModel):
    success: bool
    cards_reset: int


@lru_cache
def get_fsrs_scheduler() -> FSRSScheduler:
    return FSRSScheduler()


@lru_cache
def get_review_storage() -> ReviewStorage:
    return ReviewStorage()


@router.post("/review", response_model=ReviewResponse)
async def submit_review(
    req: ReviewRequest,
    scheduler: FSRSScheduler = Depends(get_fsrs_scheduler),
    storage: ReviewStorage = Depends(get_review_storage),
):
    logger.info(
        f"Review submitted: user={req.user_id}, deck={req.deck_id}, card={req.card_id}, section={req.section_index}, rating={req.rating}"
    )

    if req.rating not in [1, 2, 3, 4]:
        raise HTTPException(
            status_code=400,
            detail="Rating must be 1-4 (1=Again, 2=Hard, 3=Good, 4=Easy)",
        )

    state = storage.get_card_state(
        req.user_id, req.deck_id, req.card_id, req.section_index
    )

    if not state:
        state = storage.create_card_state(
            req.user_id, req.deck_id, req.card_id, req.section_index
        )

    updated_state, log = scheduler.review_card(state, req.rating)

    storage.update_card_state(
        req.user_id, req.deck_id, req.card_id, req.section_index, updated_state
    )
    storage.save_review_log(
        req.user_id, req.deck_id, req.card_id, req.section_index, log
    )

    logger.info(
        f"Review processed: next_review={updated_state['due_date']}, difficulty={updated_state['difficulty']:.2f}"
    )

    return ReviewResponse(
        success=True,
        next_review_date=updated_state["due_date"],
        difficulty=updated_state["difficulty"],
        stability=updated_state["stability"],
        state=updated_state["state"],
    )


@router.get("/review/due")
async def get_due_cards(
    user_id: str,
    deck_id: str,
    cache: Dict[str, Deck] = Depends(get_deck_cache),
    storage: ReviewStorage = Depends(get_review_storage),
):
    logger.info(f"Getting due cards: user={user_id}, deck={deck_id}")

    # Handle "all" deck - combine due cards from all decks
    if deck_id == "all":
        all_cards_list = []
        for actual_deck_id in cache.keys():
            try:
                # Get due cards for this deck
                deck = cache[actual_deck_id]
                all_states = storage._load_user_data(user_id, actual_deck_id)
                has_any_states = len(all_states.get("card_states", {})) > 0
                due_states = storage.get_due_cards(user_id, actual_deck_id)

                # If no states exist, initialize all cards as due
                if not has_any_states:
                    for card in deck.cards:
                        sections_list = []
                        for section_index in range(len(card.sections)):
                            state = storage.create_card_state(
                                user_id, actual_deck_id, card.id, section_index
                            )
                            sections_list.append(
                                {
                                    "section_index": section_index,
                                    "due_date": state["due_date"],
                                    "difficulty": state["difficulty"],
                                    "reps": state["reps"],
                                    "state": state["state"],
                                }
                            )
                        card_dict = card.model_dump()
                        card_dict["deck_id"] = actual_deck_id  # Add actual deck ID
                        all_cards_list.append(
                            {"card": card_dict, "due_sections": sections_list}
                        )
                else:
                    # Build map of due cards for this deck
                    cards_map = {}
                    for state in due_states:
                        card_id = state["card_id"]
                        if card_id not in cards_map:
                            card = next(
                                (c for c in deck.cards if c.id == card_id), None
                            )
                            if not card:
                                logger.warning(
                                    f"Card {card_id} not found in deck {actual_deck_id}"
                                )
                                continue
                            card_dict = card.model_dump()
                            card_dict["deck_id"] = actual_deck_id  # Add actual deck ID
                            cards_map[card_id] = {
                                "card": card_dict,
                                "due_sections": [],
                            }

                        cards_map[card_id]["due_sections"].append(
                            {
                                "section_index": state["section_index"],
                                "due_date": state["due_date"],
                                "difficulty": state["difficulty"],
                                "reps": state["reps"],
                                "state": state["state"],
                            }
                        )
                    all_cards_list.extend(list(cards_map.values()))
            except Exception as e:
                logger.error(f"Error loading due cards for deck {actual_deck_id}: {e}")
                continue

        return {
            "cards": all_cards_list,
            "total_due": sum(len(c["due_sections"]) for c in all_cards_list),
        }

    if deck_id not in cache:
        raise HTTPException(status_code=404, detail=f"Deck not found: {deck_id}")

    deck = cache[deck_id]

    all_states = storage._load_user_data(user_id, deck_id)
    has_any_states = len(all_states.get("card_states", {})) > 0

    due_states = storage.get_due_cards(user_id, deck_id)

    if not has_any_states:
        cards_list = []
        for card in deck.cards:
            sections_list = []
            for section_index in range(len(card.sections)):
                state = storage.create_card_state(
                    user_id, deck_id, card.id, section_index
                )
                sections_list.append(
                    {
                        "section_index": section_index,
                        "due_date": state["due_date"],
                        "difficulty": state["difficulty"],
                        "reps": state["reps"],
                        "state": state["state"],
                    }
                )

            cards_list.append(
                {"card": card.model_dump(), "due_sections": sections_list}
            )

        return {
            "cards": cards_list,
            "total_due": sum(len(c["due_sections"]) for c in cards_list),
        }

    cards_map = {}
    for state in due_states:
        card_id = state["card_id"]
        if card_id not in cards_map:
            card = next((c for c in deck.cards if c.id == card_id), None)
            if not card:
                logger.warning(f"Card {card_id} not found in deck {deck_id}")
                continue

            cards_map[card_id] = {"card": card.model_dump(), "due_sections": []}

        cards_map[card_id]["due_sections"].append(
            {
                "section_index": state["section_index"],
                "due_date": state["due_date"],
                "difficulty": state["difficulty"],
                "reps": state["reps"],
                "state": state["state"],
            }
        )

    cards_list = list(cards_map.values())

    logger.info(f"Found {len(cards_list)} cards with due sections")

    return {
        "cards": cards_list,
        "total_due": sum(len(c["due_sections"]) for c in cards_list),
    }


@router.post("/review/reset", response_model=ResetResponse)
async def reset_reviews(
    req: ResetRequest, storage: ReviewStorage = Depends(get_review_storage)
):
    logger.info(f"Resetting reviews: user={req.user_id}, deck={req.deck_id}")

    cards_reset = storage.reset_reviews_for_today(req.user_id, req.deck_id)

    logger.info(f"Reset {cards_reset} cards for user {req.user_id}, deck {req.deck_id}")

    return ResetResponse(success=True, cards_reset=cards_reset)
