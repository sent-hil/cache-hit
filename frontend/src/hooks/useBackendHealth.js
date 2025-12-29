import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export const useBackendHealth = () => {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkHealth = async () => {
    setChecking(true);
    try {
      await api.checkHealth();
      setAvailable(true);
    } catch (error) {
      console.error('Backend health check failed:', error);
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check on mount
    checkHealth();
  }, []);

  return { available, checking, checkHealth };
};
