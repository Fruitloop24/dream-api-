/**
 * SaasDashboard - Metrics, tiers, and customers for SaaS projects
 */

import { useNavigate } from 'react-router-dom';
import { MetricCard } from '@/components/shared';
import { TierCard } from './TierCard';
import { CustomerTable } from './CustomerTable';
import type { Project } from '@/constants';

interface SaasDashboardProps {
  project: Project;
  metrics: {
    activeSubs?: number;
    cancelingSubs?: number;
    mrr?: number;
    usageThisPeriod?: number;
  };
  tiers: any[];
  customers: any[];
  onCopy: (text: string) => void;
  onDeleteCustomer?: (customerId: string) => Promise<void>;
  deletingCustomer?: boolean;
}

export function SaasDashboard({
  project,
  metrics,
  tiers,
  customers,
  onCopy,
  onDeleteCustomer,
  deletingCustomer,
}: SaasDashboardProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Subs" value={metrics.activeSubs || 0} />
        <MetricCard label="Canceling" value={metrics.cancelingSubs || 0} />
        <MetricCard label="MRR" value={`$${((metrics.mrr || 0) / 100).toFixed(2)}`} />
        <MetricCard label="Usage (Period)" value={metrics.usageThisPeriod || 0} />
      </div>

      {/* Subscription Tiers */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Subscription Tiers</h3>
          <button
            onClick={() => navigate(`/api-tier-config?edit=true&mode=${project.mode}&projectType=${project.type}&pk=${project.publishableKey}`)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
          >
            Edit Tiers
          </button>
        </div>
        {tiers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier: any) => (
              <TierCard key={tier.name} tier={tier} onCopy={onCopy} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No tiers configured yet.</p>
        )}
      </div>

      {/* Customers Table */}
      <CustomerTable
        customers={customers}
        onCopy={onCopy}
        onDelete={onDeleteCustomer}
        deleting={deletingCustomer}
      />
    </>
  );
}
