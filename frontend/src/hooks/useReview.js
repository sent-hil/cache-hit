import { useState, useCallback } from 'react';

const API_URL = 'http://localhost:8000';

export const useReview = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submitReview = useCallback(async (userId, deckId, cardId, sectionIndex, rating) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          deck_id: deckId,
          card_id: cardId,
          section_index: sectionIndex,
          rating: rating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to submit review' }));
        throw new Error(errorData.detail || 'Failed to submit review');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitReview,
    submitting,
    error,
  };
};
