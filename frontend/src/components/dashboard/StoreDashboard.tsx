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

/** Calculate time-based metrics from orders */
function calculateTimeMetrics(orders: any[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let revenueToday = 0;
  let revenueWeek = 0;
  let revenueMonth = 0;
  let ordersToday = 0;
  const uniqueEmails = new Set<string>();

  orders.forEach((evt: any) => {
    const session = evt.payload?.data?.object || {};
    const amount = session.amount_total || 0;
    const email = session.customer_email || session.customer_details?.email;
    const orderDate = evt.createdAt ? new Date(evt.createdAt) : null;

    if (email) uniqueEmails.add(email.toLowerCase());

    if (orderDate) {
      if (orderDate >= todayStart) {
        revenueToday += amount;
        ordersToday++;
      }
      if (orderDate >= weekStart) {
        revenueWeek += amount;
      }
      if (orderDate >= monthStart) {
        revenueMonth += amount;
      }
    }
  });

  return {
    revenueToday,
    revenueWeek,
    revenueMonth,
    ordersToday,
    uniqueCustomers: uniqueEmails.size,
  };
}

/** Get top products by order count */
function getTopProducts(orders: any[], products: any[]): { name: string; sales: number; revenue: number }[] {
  const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};

  // Initialize with product names
  products.forEach((p: any) => {
    const name = p.name || p.product_name || 'Unknown';
    productSales[name] = { name, sales: 0, revenue: 0 };
  });

  // Count sales from orders (if line_items available in metadata)
  orders.forEach((evt: any) => {
    const session = evt.payload?.data?.object || {};
    const metadata = session.metadata || {};
    // Try to extract product info from metadata or line items
    if (metadata.productName) {
      const name = metadata.productName;
      if (!productSales[name]) {
        productSales[name] = { name, sales: 0, revenue: 0 };
      }
      productSales[name].sales++;
      productSales[name].revenue += session.amount_total || 0;
    }
  });

  return Object.values(productSales)
    .filter(p => p.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
}

export function StoreDashboard({
  project,
  metrics,
  products,
  webhook,
  onCopy,
}: StoreDashboardProps) {
  const orders = (webhook.recent || []).filter(
    (e: any) => e.type === 'checkout.session.completed' && e.payload?.data?.object?.mode === 'payment'
  );

  const avgOrder = metrics.storeSalesCount && metrics.storeSalesCount > 0
    ? ((metrics.storeTotalRevenue || 0) / metrics.storeSalesCount / 100).toFixed(2)
    : '0.00';

  const timeMetrics = calculateTimeMetrics(orders);
  const topProducts = getTopProducts(orders, products);

  // Calculate inventory totals
  const totalInventory = products.reduce((sum: number, p: any) => sum + (p.inventory || 0), 0);
  const lowStockCount = products.filter((p: any) => p.inventory !== null && p.inventory !== undefined && p.inventory < 10 && p.inventory > 0).length;

  return (
    <>
      {/* Primary Metrics - Revenue Focus */}
      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-700/50 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h3 className="text-lg font-bold text-purple-200">Store Revenue</h3>
          <span className="text-sm text-gray-500">({project.mode})</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-400">
              ${((metrics.storeTotalRevenue || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-purple-400">{metrics.storeSalesCount || 0}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Avg Order Value</p>
            <p className="text-3xl font-bold text-white">${avgOrder}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Unique Customers</p>
            <p className="text-3xl font-bold text-cyan-400">{timeMetrics.uniqueCustomers}</p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <MetricCard
          label="Today's Revenue"
          value={`$${(timeMetrics.revenueToday / 100).toFixed(2)}`}
        />
        <MetricCard
          label="Orders Today"
          value={timeMetrics.ordersToday}
        />
        <MetricCard
          label="This Week"
          value={`$${(timeMetrics.revenueWeek / 100).toFixed(2)}`}
        />
        <MetricCard
          label="Products"
          value={products.length}
        />
        <MetricCard
          label={lowStockCount > 0 ? "Low Stock Items" : "Total Inventory"}
          value={lowStockCount > 0 ? lowStockCount : totalInventory}
        />
      </div>

      {/* Top Products (if any) */}
      {topProducts.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <h3 className="text-lg font-bold mb-4">Top Selling Products</h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-5">{i + 1}.</span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{p.sales} sales</span>
                  <span className="text-green-400 font-medium">${(p.revenue / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Table */}
      <ProductsTable project={project} products={products} onCopy={onCopy} />

      {/* Orders Table */}
      <OrdersTable webhook={webhook} onCopy={onCopy} />
    </>
  );
}
