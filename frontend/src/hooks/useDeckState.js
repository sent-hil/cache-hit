import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";

const API_URL = "http://localhost:8000";

export const useDeckState = (deckId) => {
  const [deck, setDeck] = useState(null);
  const [dueCards, setDueCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialTotalCards, setInitialTotalCards] = useState(0);
  const initialTotalCardsRef = useRef(0); // Use ref to avoid stale closures
  const userId = "user1"; // Hardcoded for now

  const loadDeck = useCallback(async (isInitialLoad = false) => {
    setLoading(true);
    setError(null);
    try {
      // Load deck metadata
      const deckData = await api.getDeck(deckId);
      setDeck(deckData);

      // Load cards due for review
      const response = await fetch(
        `${API_URL}/api/review/due?user_id=${userId}&deck_id=${deckId}`
      );
      if (!response.ok) {
        throw new Error("Failed to load due cards");
      }
      const dueData = await response.json();

      // Extract cards from the due cards response
      const cards = dueData.cards.map((item) => item.card);
      setDueCards(cards);
      setCurrentCardIndex(0);

      // Set initial total on first load of a deck
      if (isInitialLoad) {
        initialTotalCardsRef.current = cards.length; // Update ref
        setInitialTotalCards(cards.length);
      }
    } catch (err) {
      console.error("Failed to load deck:", err);
      setError(err.message || "Failed to load deck");
    } finally {
      setLoading(false);
    }
  }, [deckId]); // Dependencies: deckId (api and setters are stable)

  useEffect(() => {
    if (!deckId) {
      setError("No deck ID provided");
      setLoading(false);
      return;
    }

    // Reset ref when deck changes
    initialTotalCardsRef.current = 0;
    loadDeck(true); // true = initial load, will set initialTotalCards
  }, [deckId, loadDeck]); // Include loadDeck in dependencies

  const nextCard = () => {
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  const currentCard = dueCards[currentCardIndex] || null;
  const totalCards = initialTotalCards || dueCards.length;
  const cardsReviewed = Math.max(0, initialTotalCards - dueCards.length);
  const canGoNext = currentCardIndex < dueCards.length - 1;
  const canGoPrevious = currentCardIndex > 0;

  // Calculate display index (1-indexed), clamping to totalCards when all done
  const displayIndex = dueCards.length === 0
    ? totalCards  // Show total when all complete
    : cardsReviewed + currentCardIndex + 1;  // Add 1 for 1-indexed display

  return {
    currentCard,
    currentCardIndex: displayIndex,
    totalCards,
    remainingCards: dueCards.length,  // Add remaining count for modal check
    nextCard,
    previousCard,
    canGoNext,
    canGoPrevious,
    loading,
    error,
    deckName: deck?.name || "",
    language: deck?.language || "python",  // Add language
    reloadDeck: loadDeck,
  };
};
