/**
 * useCredentials - Manages test/live secret keys
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { Credentials } from '@/constants';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export function useCredentials() {
  const { getToken } = useAuth();
  const [credentials, setCredentials] = useState<Credentials>({
    testSecretKey: null,
    liveSecretKey: null,
  });
  const [showSecret, setShowSecret] = useState(false);

  /** Load test + live secret keys from KV */
  const loadCredentials = useCallback(async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/get-credentials`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials({
          testSecretKey: data.testSecretKey || null,
          liveSecretKey: data.liveSecretKey || data.secretKey || null,
        });
      }
    } catch (err) {
      console.error('[useCredentials] Credentials error:', err);
    }
  }, [getToken]);

  const toggleSecret = useCallback(() => {
    setShowSecret(prev => !prev);
  }, []);

  /** Get secret key for a specific mode */
  const getSecretKey = useCallback((mode: 'test' | 'live') => {
    return mode === 'test' ? credentials.testSecretKey : credentials.liveSecretKey;
  }, [credentials]);

  return {
    credentials,
    showSecret,
    loadCredentials,
    toggleSecret,
    getSecretKey,
  };
}
