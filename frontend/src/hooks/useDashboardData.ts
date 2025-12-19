/**
 * useDashboardData - Fetches dashboard metrics and products
 */

import { useState, useCallback } from 'react';
import type { Project } from '@/constants';

const API_MULTI = 'https://api-multi.k-c-sheffield012376.workers.dev';

export interface DashboardData {
  metrics: {
    activeSubs?: number;
    cancelingSubs?: number;
    mrr?: number;
    usageThisPeriod?: number;
    storeSalesCount?: number;
    storeTotalRevenue?: number;
  };
  customers: any[];
  tiers: any[];
  webhook: {
    lastEventAt?: string;
    recent?: any[];
  };
  keys?: {
    stripeAccountId?: string;
  };
}

export function useDashboardData() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /** Fetch dashboard data (metrics, customers, tiers) from api-multi */
  const loadDashboard = useCallback(async (project: Project, sk: string) => {
    if (!sk) {
      console.warn('[useDashboardData] No secret key provided');
      return null;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_MULTI}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${sk}`,
          'X-Env': project.mode,
          'X-Publishable-Key': project.publishableKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('[useDashboardData] Load error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch store products (for store-type projects only) */
  const loadProducts = useCallback(async (project: Project, sk: string) => {
    if (!sk) return [];
    try {
      const res = await fetch(`${API_MULTI}/api/products`, {
        headers: {
          'Authorization': `Bearer ${sk}`,
          'X-Env': project.mode,
          'X-Publishable-Key': project.publishableKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        return data.products || [];
      }
      return [];
    } catch (err) {
      console.error('[useDashboardData] Products error:', err);
      return [];
    }
  }, []);

  /** Clear dashboard data (for project switching) */
  const clearDashboard = useCallback(() => {
    setDashboard(null);
    setProducts([]);
  }, []);

  return {
    dashboard,
    products,
    loading,
    loadDashboard,
    loadProducts,
    clearDashboard,
  };
}
