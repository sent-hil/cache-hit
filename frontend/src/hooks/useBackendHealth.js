import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";

export const useBackendHealth = () => {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const retryIntervalRef = useRef(null);

  const checkHealth = async (showSpinner = true) => {
    if (showSpinner) {
      setChecking(true);
    }
    setError(null);

    // Set a 1-minute timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(
          new Error(
            "Connection timeout after 1 minute. Please check if the backend server is running."
          )
        );
      }, 60000); // 60 seconds
    });

    try {
      await Promise.race([api.checkHealth(), timeoutPromise]);

      // Success - clear timeout and set available
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setAvailable(true);
      setError(null);
    } catch (err) {
      console.error("Backend health check failed:", err);

      // Clear timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setAvailable(false);
      setError(err.message || "Failed to connect to backend");
    } finally {
      if (showSpinner) {
        setChecking(false);
      }
    }
  };

  useEffect(() => {
    // Check on mount
    checkHealth();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, []);

  // Auto-retry every 30 seconds when disconnected
  useEffect(() => {
    if (!available) {
      // Start auto-retry interval
      retryIntervalRef.current = setInterval(() => {
        console.log("Auto-retrying backend connection...");
        checkHealth(false); // Don't show spinner for auto-retries
      }, 30000); // 30 seconds
    } else {
      // Clear interval when connected
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    }

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [available]);

  return { available, checking, error, checkHealth };
};
