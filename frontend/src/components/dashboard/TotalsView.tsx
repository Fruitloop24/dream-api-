/**
 * TotalsView - Aggregate view across all projects with live metrics
 */

import { MetricCard } from '@/components/shared';
import type { Project } from '@/constants';

interface LiveMetrics {
  totalRevenue: number;      // in cents
  totalCustomers: number;
  activeSubscriptions: number;
  totalSales: number;        // for stores
}

interface TotalsViewProps {
  projects: Project[];
  liveMetrics?: LiveMetrics;
  loading?: boolean;
}

export function TotalsView({ projects, liveMetrics, loading }: TotalsViewProps) {
  const saasProjects = projects.filter(p => p.type === 'saas');
  const storeProjects = projects.filter(p => p.type === 'store');
  const liveProjects = projects.filter(p => p.mode === 'live');
  const liveSaas = projects.filter(p => p.mode === 'live' && p.type === 'saas');
  const liveStores = projects.filter(p => p.mode === 'live' && p.type === 'store');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Totals Across All Projects</h3>
        {loading && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            Loading metrics...
          </span>
        )}
      </div>

      {/* Project Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Projects" value={projects.length} />
        <MetricCard label="SaaS Projects" value={saasProjects.length} />
        <MetricCard label="Store Projects" value={storeProjects.length} />
        <MetricCard label="Live Projects" value={liveProjects.length} />
      </div>

      {/* Live Revenue & Customers (LIVE mode only) */}
      {liveProjects.length > 0 && (
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h4 className="text-lg font-bold text-green-200">Live Metrics</h4>
            <span className="text-sm text-gray-500">({liveProjects.length} live project{liveProjects.length !== 1 ? 's' : ''})</span>
          </div>

          {liveMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  ${(liveMetrics.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Customers</p>
                <p className="text-2xl font-bold text-white">
                  {liveMetrics.totalCustomers.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Active Subscriptions</p>
                <p className="text-2xl font-bold text-blue-400">
                  {liveMetrics.activeSubscriptions.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Store Sales</p>
                <p className="text-2xl font-bold text-purple-400">
                  {liveMetrics.totalSales.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-900/50 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
                  <div className="h-8 bg-gray-700 rounded w-16" />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {liveSaas.length} SaaS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              {liveStores.length} Store{liveStores.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* No live projects message */}
      {liveProjects.length === 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-2">No live projects yet</p>
          <p className="text-sm text-gray-500">
            Promote a test project to live mode to see revenue metrics here.
          </p>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-lg font-bold mb-4">All Projects</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Mode</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Key</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.publishableKey} className="border-b border-gray-800">
                <td className="py-2 pr-4 font-medium">{p.name}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.type === 'saas' ? 'bg-blue-900/50 text-blue-200' : 'bg-purple-900/50 text-purple-200'
                  }`}>
                    {p.type}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.mode === 'test' ? 'bg-amber-900/50 text-amber-200' : 'bg-green-900/50 text-green-200'
                  }`}>
                    {p.mode}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.status === 'active' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-400 truncate max-w-[200px]">
                  {p.publishableKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
