import { useState, useCallback } from "react";
import { api } from "../utils/api";

export const useReview = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const submitReview = useCallback(
    async (cardId, sectionIndex, remembered, totalSections) => {
      setSubmitting(true);
      setError(null);
      setSyncError(null);

      try {
        const data = await api.submitReview(
          cardId,
          sectionIndex,
          remembered,
          totalSections
        );
        return data;
      } catch (err) {
        // Check if it's a Mochi sync error (503)
        if (err.message.includes("sync") || err.message.includes("Mochi")) {
          setSyncError(err.message);
        } else {
          setError(err.message);
        }
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  return {
    submitReview,
    submitting,
    error,
    syncError,
    clearSyncError,
  };
};
