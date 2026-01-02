# Mochi Integration Spec

This document specifies the changes to integrate Mochi as the source of truth for due cards and reviews, replacing the local FSRS-based system.

## Overview

Replace local storage and FSRS scheduling with Mochi API integration. The app becomes a review client for Mochi cards.

## Key Decisions

### Data Model
- **Card sections**: Keep as-is. Local cards with multiple sections came from Mochi exports. Model is already aligned.
- **Decks**: Remove deck concept entirely. App shows all due cards regardless of deck.
- **User ID**: Remove entirely. Mochi API key implicitly identifies the user.

### Scheduling
- **Remove FSRS**: Delete `FSRSScheduler` and all local scheduling logic. Mochi handles scheduling.
- **Binary reviews**: Replace 1-4 rating with binary "Forgot" / "Remembered".

### Review Flow
- **Section tracking**: Track section-level reviews locally during a card review.
- **Sync on last section**: Only call Mochi API after ALL sections of a card are reviewed.
- **Aggregate result**: Send "forgot" to Mochi if ANY section was marked forgot, otherwise "remembered".
- **Silent tracking**: User reviews sections normally. No indication during review that a "forgot" affects the whole card.

### Sync Strategy
- **Immediate, blocking**: Wait for Mochi API response after last section before moving to next card.
- **Retry on failure**: Show error modal with "Retry" button if API call fails. Block until resolved or dismissed.

### Local Storage
- **Cache only**: Cache Mochi responses locally for faster initial loads. Mochi is authoritative.
- **No user_id**: Remove user_id from all storage keys and API requests.

## UI Changes

### Review Buttons
- **Labels**: "Forgot" and "Remembered" (replacing Again/Hard/Good/Easy)
- **Keyboard shortcuts**: `F` for Forgot, `R` for Remembered
- **Layout**: Two buttons instead of four

### Review Summary Component
- **Remove**: FSRS v4.5 badge and interval predictions
- **Add**: Simple "MOCHI SYNC" badge to indicate reviews sync to Mochi

### Progress Display
- **Minimal**: Show "Section 1/3" style progress
- **No per-section results**: Don't show checkmarks/X during review

### App Startup
- **Direct to review**: Load directly into review mode with due cards (no deck selector)
- **Empty state**: Show "No cards due. Check back later." when no cards due

## Backend Changes

### Files to Remove
- `fsrs_scheduler.py` - FSRS scheduling logic
- `deck_router.py` - Deck listing/fetching endpoints
- `deck_parser.py` - Markdown deck parsing

### Files to Keep (as backup)
- `decks/*.md` - Markdown deck files (keep for backup, not served)

### Files to Modify

#### `review_router.py`
- Remove deck_id parameter from all endpoints
- Change `/review/due` to fetch from Mochi API instead of local storage
- Change `/review` POST to:
  - Accept `card_id`, `section_index`, `remembered` (boolean)
  - Track section results in local cache
  - On last section, call Mochi API with aggregated result
- Remove `/review/reset` endpoint (Mochi handles scheduling)
- Remove FSRS scheduler dependency

#### `review_storage.py`
- Simplify to cache-only storage
- Remove user_id from all methods
- Store:
  - Cached due cards from Mochi
  - In-progress section reviews for current card

#### `mochi_client.py`
- Already created with:
  - `get_due_cards()` - Fetch due cards from Mochi
  - `update_card_review(card_id, remembered)` - Submit review to Mochi

#### `main.py`
- Remove deck_router import and inclusion
- Require `MOCHI_API_KEY` environment variable on startup
- Initialize MochiClient singleton

### New Endpoint Structure

```
GET  /api/due              - Get all due cards (from Mochi)
POST /api/review           - Submit section review
     Body: { card_id, section_index, remembered }
     Response: {
       card_complete: bool,      # true if this was last section
       synced_to_mochi: bool,    # true if Mochi API was called
       mochi_result: object      # Mochi API response (if synced)
     }
```

## Frontend Changes

### Files to Remove
- `DeckSelector.jsx` - Deck selection UI
- References to deck selection in routing/state

### Files to Modify

#### `RatingButtons.jsx` / `RatingButtonsEnhanced.jsx`
- Replace with binary buttons component
- Two buttons: "Forgot" (red) and "Remembered" (green)
- Keyboard handlers for F and R keys

#### `useReview.js`
- Change `submitReview` to send `remembered: boolean` instead of `rating: number`
- Remove deck_id and user_id parameters

#### `useDeckState.js`
- Rename to `useReviewState.js` or similar
- Remove deck selection logic
- Fetch due cards on mount (no deck_id needed)

#### `api.js`
- Remove deck-related API calls (`listDecks`, `getDeck`, `getCard`)
- Update `submitReview` to use new API shape
- Add error handling for Mochi sync failures

#### `App.jsx` (or main component)
- Remove deck selector routing
- Load directly into review flow
- Handle empty state (no due cards)

## API Configuration

- **Environment variable**: `MOCHI_API_KEY` (required)
- **Validation**: Backend fails to start if not set
- **No settings UI**: Keep it simple, env var only

## Error Handling

### Mochi API Failure
1. Show modal: "Failed to sync review to Mochi"
2. Options: "Retry" button
3. Block progress until resolved or user dismisses
4. If dismissed, review is lost (not queued)

### No Due Cards
- Show simple message: "No cards due. Check back later."
- No auto-refresh or next-due-time display

## Test Updates

### Backend Tests
- Remove FSRS scheduler tests
- Remove deck router tests
- Update review router tests:
  - Mock MochiClient instead of FSRSScheduler
  - Test section aggregation logic
  - Test Mochi API error handling

### Frontend Tests
- Update RatingButtons tests for binary buttons
- Remove deck selector tests
- Update review hook tests for new API shape

## Migration Notes

1. No data migration needed - Mochi is source of truth
2. Local review_data folder can be deleted (or kept, will be ignored)
3. Users must set MOCHI_API_KEY environment variable
4. First load will fetch due cards from Mochi (may be slow)
