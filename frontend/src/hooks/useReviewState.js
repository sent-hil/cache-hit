import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";

const CARD_INDEX_KEY = "cacheHit.currentCardIndex";
const SECTION_INDEX_KEY = "cacheHit.currentSectionIndex";

export const useReviewState = () => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialTotalCards, setInitialTotalCards] = useState(0);
  const initialTotalCardsRef = useRef(0);
  const isRestoringFromStorage = useRef(false);

  const loadDueCards = useCallback(async (isInitialLoad = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getDueCards();
      const dueCards = response.cards || [];

      setCards(dueCards);

      if (isInitialLoad) {
        isRestoringFromStorage.current = true;
        const savedCardIndex = localStorage.getItem(CARD_INDEX_KEY);
        const savedSectionIndex = localStorage.getItem(SECTION_INDEX_KEY);

        const restoredCardIndex = savedCardIndex !== null ? parseInt(savedCardIndex, 10) : 0;
        const restoredSectionIndex = savedSectionIndex !== null ? parseInt(savedSectionIndex, 10) : 0;

        const validCardIndex = Math.min(restoredCardIndex, Math.max(0, dueCards.length - 1));
        const validSectionIndex = Math.max(0, restoredSectionIndex);

        setCurrentCardIndex(validCardIndex);
        setCurrentSectionIndex(validSectionIndex);
        isRestoringFromStorage.current = false;

        initialTotalCardsRef.current = dueCards.length;
        setInitialTotalCards(dueCards.length);
      } else {
        setCurrentCardIndex(0);
        setCurrentSectionIndex(0);
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

  useEffect(() => {
    if (!isRestoringFromStorage.current && cards.length > 0) {
      localStorage.setItem(CARD_INDEX_KEY, currentCardIndex.toString());
    }
  }, [currentCardIndex, cards.length]);

  useEffect(() => {
    if (!isRestoringFromStorage.current && cards.length > 0) {
      localStorage.setItem(SECTION_INDEX_KEY, currentSectionIndex.toString());
    }
  }, [currentSectionIndex, cards.length]);

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

  const prevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setCurrentSectionIndex(0);
      return true;
    }
    return false;
  }, [currentCardIndex]);

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
    canGoPrevious: currentCardIndex > 0,
    canGoNext: currentCardIndex < cards.length - 1,

    // Navigation
    nextSection,
    nextCard,
    prevCard,
    removeCurrentCard,

    // Loading state
    loading,
    error,
    isEmpty,

    // Actions
    reload: loadDueCards,
  };
};
