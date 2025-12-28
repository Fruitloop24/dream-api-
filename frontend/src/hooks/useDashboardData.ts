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

export interface LiveTotals {
  totalRevenue: number;
  totalCustomers: number;
  activeSubscriptions: number;
  totalSales: number;
}

export function useDashboardData() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveTotals, setLiveTotals] = useState<LiveTotals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(false);

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

  /** Fetch aggregated live metrics across all live projects */
  const loadLiveTotals = useCallback(async (
    liveProjects: Project[],
    getSecretKey: (mode: string) => string | null
  ) => {
    if (liveProjects.length === 0) {
      setLiveTotals({ totalRevenue: 0, totalCustomers: 0, activeSubscriptions: 0, totalSales: 0 });
      return;
    }

    setLoadingTotals(true);
    try {
      // Fetch dashboard data for each live project in parallel
      const results = await Promise.all(
        liveProjects.map(async (project) => {
          const sk = project.secretKey || getSecretKey(project.mode);
          if (!sk) return null;

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
              return { type: project.type, data };
            }
          } catch (err) {
            console.error(`[useDashboardData] Error fetching ${project.name}:`, err);
          }
          return null;
        })
      );

      // Aggregate the results
      const totals: LiveTotals = {
        totalRevenue: 0,
        totalCustomers: 0,
        activeSubscriptions: 0,
        totalSales: 0,
      };

      results.forEach((result) => {
        if (!result?.data?.metrics) return;
        const { metrics, customers } = result.data;

        if (result.type === 'saas') {
          totals.totalRevenue += metrics.mrr || 0;
          totals.activeSubscriptions += metrics.activeSubs || 0;
          totals.totalCustomers += customers?.length || 0;
        } else if (result.type === 'store') {
          totals.totalRevenue += metrics.storeTotalRevenue || 0;
          totals.totalSales += metrics.storeSalesCount || 0;
        }
      });

      setLiveTotals(totals);
    } catch (err) {
      console.error('[useDashboardData] Live totals error:', err);
    } finally {
      setLoadingTotals(false);
    }
  }, []);

  return {
    dashboard,
    products,
    loading,
    liveTotals,
    loadingTotals,
    loadDashboard,
    loadProducts,
    loadLiveTotals,
    clearDashboard,
  };
}
