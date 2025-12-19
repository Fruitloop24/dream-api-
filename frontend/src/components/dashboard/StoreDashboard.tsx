/**
 * StoreDashboard - Products, orders, and metrics for Store projects
 */

import { MetricCard } from '@/components/shared';
import { ProductsTable } from './ProductsTable';
import { OrdersTable } from './OrdersTable';
import type { Project } from '@/constants';

interface StoreDashboardProps {
  project: Project;
  metrics: {
    storeSalesCount?: number;
    storeTotalRevenue?: number;
  };
  products: any[];
  webhook: {
    recent?: any[];
  };
  onCopy: (text: string) => void;
}

export function StoreDashboard({
  project,
  metrics,
  products,
  webhook,
  onCopy,
}: StoreDashboardProps) {
  const avgOrder = metrics.storeSalesCount && metrics.storeSalesCount > 0
    ? ((metrics.storeTotalRevenue || 0) / metrics.storeSalesCount / 100).toFixed(2)
    : '0.00';

  return (
    <>
      {/* Sales Metrics Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="Total Sales" value={metrics.storeSalesCount || 0} />
        <MetricCard label="Revenue" value={`$${((metrics.storeTotalRevenue || 0) / 100).toFixed(2)}`} />
        <MetricCard label="Avg Order" value={`$${avgOrder}`} />
      </div>

      {/* Products Table */}
      <ProductsTable project={project} products={products} onCopy={onCopy} />

      {/* Orders Table */}
      <OrdersTable webhook={webhook} onCopy={onCopy} />
    </>
  );
}
