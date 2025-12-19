/**
 * TotalsView - Aggregate view across all projects
 */

import { MetricCard } from '@/components/shared';
import type { Project } from '@/constants';

interface TotalsViewProps {
  projects: Project[];
}

export function TotalsView({ projects }: TotalsViewProps) {
  const saasProjects = projects.filter(p => p.type === 'saas');
  const storeProjects = projects.filter(p => p.type === 'store');
  const liveProjects = projects.filter(p => p.mode === 'live');

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Totals Across All Projects</h3>

      {/* Summary */}
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
    </div>
  );
}
