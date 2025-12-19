/**
 * usePayment - Handles platform payment flow
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export function usePayment() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  /** Redirect to Stripe checkout for $15/mo platform fee */
  const handlePayment = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/create-checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.checkoutUrl;
        return true;
      }
      return false;
    } catch (err) {
      console.error('[usePayment] Payment error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  return { handlePayment, loading };
}
