import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export const useDeckState = (deckId) => {
  const [deck, setDeck] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deckId) {
      setError('No deck ID provided');
      setLoading(false);
      return;
    }

    const loadDeck = async () => {
      setLoading(true);
      setError(null);
      try {
        const deckData = await api.getDeck(deckId);
        setDeck(deckData);
        setCurrentCardIndex(0);
      } catch (err) {
        console.error('Failed to load deck:', err);
        setError(err.message || 'Failed to load deck');
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, [deckId]);

  const nextCard = () => {
    if (deck && currentCardIndex < deck.total_cards - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const currentCard = deck?.cards[currentCardIndex] || null;
  const totalCards = deck?.total_cards || 0;
  const canGoNext = currentCardIndex < totalCards - 1;
  const canGoPrevious = currentCardIndex > 0;

  return {
    currentCard,
    currentCardIndex,
    totalCards,
    nextCard,
    previousCard,
    canGoNext,
    canGoPrevious,
    loading,
    error,
    deckName: deck?.name || '',
  };
};
