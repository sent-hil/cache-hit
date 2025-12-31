import { useState, useEffect } from "react";
import { api } from "../utils/api";

const API_URL = "http://localhost:8000";

export const useDeckState = (deckId) => {
  const [deck, setDeck] = useState(null);
  const [dueCards, setDueCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialTotalCards, setInitialTotalCards] = useState(0);
  const userId = "user1"; // Hardcoded for now

  const loadDeck = async () => {
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

      // Set initial total only on first load
      if (initialTotalCards === 0) {
        setInitialTotalCards(cards.length);
      }
    } catch (err) {
      console.error("Failed to load deck:", err);
      setError(err.message || "Failed to load deck");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deckId) {
      setError("No deck ID provided");
      setLoading(false);
      return;
    }

    setInitialTotalCards(0);
    loadDeck();
  }, [deckId]);

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

  return {
    currentCard,
    currentCardIndex: cardsReviewed,
    totalCards,
    nextCard,
    previousCard,
    canGoNext,
    canGoPrevious,
    loading,
    error,
    deckName: deck?.name || "",
    reloadDeck: loadDeck,
  };
};
