/**
 * usePlatformSubscription - Fetch platform subscription status and manage billing
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

export interface PlatformSubscription {
  status: SubscriptionStatus;
  trialEndsAt?: number;
  currentPeriodEnd?: number;
  liveEndUserCount: number;
  includedUsers: number;
  overageRate: number;
  estimatedOverage: number;
}

export function usePlatformSubscription() {
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch subscription status from front-auth-api */
  const loadSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken({ template: 'dream-api' });
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      const res = await fetch(`${FRONT_AUTH_API}/subscription`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        return data;
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to load subscription');
        return null;
      }
    } catch (err) {
      console.error('[usePlatformSubscription] Load error:', err);
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /** Open Stripe billing portal */
  const openBillingPortal = useCallback(async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      if (!token) return;

      const res = await fetch(`${FRONT_AUTH_API}/billing-portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('[usePlatformSubscription] Portal error:', err);
    }
  }, [getToken]);

  /** Get days remaining in trial */
  const getTrialDaysRemaining = useCallback(() => {
    if (!subscription?.trialEndsAt) return null;
    const now = Date.now();
    const diff = subscription.trialEndsAt - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [subscription]);

  /** Get human-readable status */
  const getStatusDisplay = useCallback(() => {
    if (!subscription) return { label: 'Loading', color: 'gray' };

    switch (subscription.status) {
      case 'trialing': {
        const days = getTrialDaysRemaining();
        return {
          label: days !== null ? `Trial (${days}d left)` : 'Trial',
          color: 'amber'
        };
      }
      case 'active':
        return { label: 'Active', color: 'green' };
      case 'past_due':
        return { label: 'Past Due', color: 'red' };
      case 'canceled':
        return { label: 'Canceled', color: 'gray' };
      case 'none':
        return { label: 'No Plan', color: 'gray' };
      default:
        return { label: 'Unknown', color: 'gray' };
    }
  }, [subscription, getTrialDaysRemaining]);

  return {
    subscription,
    loading,
    error,
    loadSubscription,
    openBillingPortal,
    getTrialDaysRemaining,
    getStatusDisplay,
  };
}
