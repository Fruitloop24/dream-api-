/**
 * TotalsView - Aggregate view across all projects with tabbed live metrics
 */

import { useState } from 'react';
import { MetricCard } from '@/components/shared';
import type { Project } from '@/constants';

interface LiveMetrics {
  totalRevenue: number;      // in cents
  totalCustomers: number;
  activeSubscriptions: number;
  totalSales: number;        // for stores
  // Separated metrics
  saasRevenue?: number;
  storeRevenue?: number;
}

interface TotalsViewProps {
  projects: Project[];
  liveMetrics?: LiveMetrics;
  loading?: boolean;
}

type TabType = 'all' | 'stores' | 'saas';

export function TotalsView({ projects, liveMetrics, loading }: TotalsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const saasProjects = projects.filter(p => p.type === 'saas');
  const storeProjects = projects.filter(p => p.type === 'store');
  const liveProjects = projects.filter(p => p.mode === 'live');
  const liveSaas = projects.filter(p => p.mode === 'live' && p.type === 'saas');
  const liveStores = projects.filter(p => p.mode === 'live' && p.type === 'store');

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'all', label: 'All Projects', count: projects.length },
    { id: 'stores', label: 'Live Stores', count: liveStores.length },
    { id: 'saas', label: 'Live SaaS', count: liveSaas.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header with loading */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Totals Dashboard</h3>
        {loading && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            Loading metrics...
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === tab.id ? 'bg-blue-600' : 'bg-gray-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <AllProjectsTab
          projects={projects}
          saasProjects={saasProjects}
          storeProjects={storeProjects}
          liveProjects={liveProjects}
        />
      )}

      {activeTab === 'stores' && (
        <LiveStoresTab
          liveStores={liveStores}
          liveMetrics={liveMetrics}
          loading={loading}
        />
      )}

      {activeTab === 'saas' && (
        <LiveSaasTab
          liveSaas={liveSaas}
          liveMetrics={liveMetrics}
          loading={loading}
        />
      )}
    </div>
  );
}

// ============================================================================
// ALL PROJECTS TAB
// ============================================================================

function AllProjectsTab({
  projects,
  saasProjects,
  storeProjects,
  liveProjects,
}: {
  projects: Project[];
  saasProjects: Project[];
  storeProjects: Project[];
  liveProjects: Project[];
}) {
  return (
    <>
      {/* Project Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Projects" value={projects.length} />
        <MetricCard label="SaaS Projects" value={saasProjects.length} />
        <MetricCard label="Store Projects" value={storeProjects.length} />
        <MetricCard label="Live Projects" value={liveProjects.length} />
      </div>

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
    </>
  );
}

// ============================================================================
// LIVE STORES TAB
// ============================================================================

function LiveStoresTab({
  liveStores,
  liveMetrics,
  loading,
}: {
  liveStores: Project[];
  liveMetrics?: LiveMetrics;
  loading?: boolean;
}) {
  if (liveStores.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">🏪</div>
        <p className="text-gray-400 mb-2">No live stores yet</p>
        <p className="text-sm text-gray-500">
          Promote a store project to live mode to see revenue here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Store Metrics */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <h4 className="text-lg font-bold text-purple-200">Live Store Revenue</h4>
          <span className="text-sm text-gray-500">({liveStores.length} store{liveStores.length !== 1 ? 's' : ''})</span>
        </div>

        {liveMetrics && !loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Total Store Revenue</p>
              <p className="text-3xl font-bold text-green-400">
                ${((liveMetrics.storeRevenue || liveMetrics.totalRevenue) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Total Sales</p>
              <p className="text-3xl font-bold text-purple-400">
                {liveMetrics.totalSales.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold text-white">
                ${liveMetrics.totalSales > 0
                  ? ((liveMetrics.storeRevenue || liveMetrics.totalRevenue) / liveMetrics.totalSales / 100).toFixed(2)
                  : '0.00'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-900/50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-700 rounded w-24" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Stores List */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-lg font-bold mb-4">Live Stores</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="py-2 pr-4">Store Name</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Publishable Key</th>
            </tr>
          </thead>
          <tbody>
            {liveStores.map((p) => (
              <tr key={p.publishableKey} className="border-b border-gray-800">
                <td className="py-2 pr-4 font-medium">{p.name}</td>
                <td className="py-2 pr-4">
                  <span className="px-2 py-0.5 text-xs rounded bg-green-900/50 text-green-200">
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-400 truncate max-w-[250px]">
                  {p.publishableKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ============================================================================
// LIVE SAAS TAB
// ============================================================================

function LiveSaasTab({
  liveSaas,
  liveMetrics,
  loading,
}: {
  liveSaas: Project[];
  liveMetrics?: LiveMetrics;
  loading?: boolean;
}) {
  if (liveSaas.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-400 mb-2">No live SaaS projects yet</p>
        <p className="text-sm text-gray-500">
          Promote a SaaS project to live mode to see subscription metrics here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* SaaS Metrics */}
      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="text-lg font-bold text-blue-200">Live SaaS Metrics</h4>
          <span className="text-sm text-gray-500">({liveSaas.length} project{liveSaas.length !== 1 ? 's' : ''})</span>
        </div>

        {liveMetrics && !loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold text-green-400">
                ${((liveMetrics.saasRevenue || liveMetrics.totalRevenue) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Active Subscriptions</p>
              <p className="text-3xl font-bold text-blue-400">
                {liveMetrics.activeSubscriptions.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-white">
                {liveMetrics.totalCustomers.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Avg Revenue/Customer</p>
              <p className="text-3xl font-bold text-cyan-400">
                ${liveMetrics.totalCustomers > 0
                  ? ((liveMetrics.saasRevenue || liveMetrics.totalRevenue) / liveMetrics.totalCustomers / 100).toFixed(2)
                  : '0.00'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900/50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-700 rounded w-24" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live SaaS List */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-lg font-bold mb-4">Live SaaS Projects</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="py-2 pr-4">Project Name</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Publishable Key</th>
            </tr>
          </thead>
          <tbody>
            {liveSaas.map((p) => (
              <tr key={p.publishableKey} className="border-b border-gray-800">
                <td className="py-2 pr-4 font-medium">{p.name}</td>
                <td className="py-2 pr-4">
                  <span className="px-2 py-0.5 text-xs rounded bg-green-900/50 text-green-200">
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-400 truncate max-w-[250px]">
                  {p.publishableKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
