import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";

export const useReviewState = () => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialTotalCards, setInitialTotalCards] = useState(0);
  const initialTotalCardsRef = useRef(0);

  const loadDueCards = useCallback(async (isInitialLoad = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getDueCards();
      const dueCards = response.cards || [];

      setCards(dueCards);
      setCurrentCardIndex(0);
      setCurrentSectionIndex(0);

      if (isInitialLoad) {
        initialTotalCardsRef.current = dueCards.length;
        setInitialTotalCards(dueCards.length);
      }
    } catch (err) {
      console.error("Failed to load due cards:", err);
      setError(err.message || "Failed to load due cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialTotalCardsRef.current = 0;
    loadDueCards(true);
  }, [loadDueCards]);

  const currentCard = cards[currentCardIndex] || null;
  const currentSection = currentCard?.sections?.[currentSectionIndex] || null;
  const totalSections = currentCard?.total_sections || currentCard?.sections?.length || 1;

  const nextSection = useCallback(() => {
    if (!currentCard) return false;

    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [currentCard, currentSectionIndex, totalSections]);

  const nextCard = useCallback(() => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setCurrentSectionIndex(0);
      return true;
    }
    return false;
  }, [currentCardIndex, cards.length]);

  const removeCurrentCard = useCallback(() => {
    setCards((prev) => {
      const newCards = [...prev];
      newCards.splice(currentCardIndex, 1);
      return newCards;
    });
    setCurrentSectionIndex(0);
    // If we removed the last card, index will naturally point to the new last card
    if (currentCardIndex >= cards.length - 1 && currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  }, [currentCardIndex, cards.length]);

  const totalCards = initialTotalCards || cards.length;
  const cardsReviewed = Math.max(0, initialTotalCards - cards.length);
  const displayCardIndex =
    cards.length === 0 ? totalCards : cardsReviewed + currentCardIndex + 1;

  const isEmpty = !loading && cards.length === 0;

  return {
    // Card state
    currentCard,
    currentSection,
    currentCardIndex: displayCardIndex,
    currentSectionIndex,
    totalCards,
    totalSections,
    remainingCards: cards.length,

    // Navigation
    nextSection,
    nextCard,
    removeCurrentCard,

    // Loading state
    loading,
    error,
    isEmpty,

    // Actions
    reload: loadDueCards,
  };
};
