/**
 * ProjectSelector - Project dropdown with type/mode badges and action buttons
 */

import { useNavigate } from 'react-router-dom';
import type { Project } from '@/constants';
import { TYPE_STYLES, MODE_STYLES } from '@/constants';

interface ProjectSelectorProps {
  projects: Project[];
  selectedPk: string | null;
  selectedProject: Project | null;
  showTotals: boolean;
  loadingDashboard: boolean;
  onSelectProject: (pk: string) => void;
  onToggleTotals: () => void;
  onRefresh: () => void;
  onDeleteClick: () => void;
}

export function ProjectSelector({
  projects,
  selectedPk,
  selectedProject,
  showTotals,
  loadingDashboard,
  onSelectProject,
  onToggleTotals,
  onRefresh,
  onDeleteClick,
}: ProjectSelectorProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
      {/* Project Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Project:</span>
        <select
          value={selectedPk || ''}
          onChange={(e) => onSelectProject(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm min-w-[200px]"
        >
          {projects.map((p) => (
            <option key={p.publishableKey} value={p.publishableKey}>
              {p.name} ({p.type}) - {p.mode}
            </option>
          ))}
        </select>
      </div>

      {/* Type Badge */}
      {selectedProject && (
        <span className={`px-3 py-1 rounded text-sm font-medium ${TYPE_STYLES[selectedProject.type]}`}>
          {selectedProject.type === 'saas' ? 'SaaS' : 'Store'}
        </span>
      )}

      {/* Mode Badge */}
      {selectedProject && (
        <span className={`px-3 py-1 rounded text-sm font-medium ${MODE_STYLES[selectedProject.mode]}`}>
          {selectedProject.mode === 'test' ? 'Test' : 'Live'}
        </span>
      )}

      {/* Totals Toggle */}
      <button
        onClick={onToggleTotals}
        className={`ml-auto px-3 py-1.5 rounded text-sm font-medium ${
          showTotals
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
        }`}
      >
        Totals
      </button>

      {/* New Project */}
      <button
        onClick={() => navigate('/api-tier-config')}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
      >
        + New Project
      </button>

      {/* Refresh Button */}
      {selectedProject && (
        <button
          onClick={onRefresh}
          disabled={loadingDashboard}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 border border-gray-700 hover:border-gray-600 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          title="Refresh dashboard data"
        >
          <svg className={`w-4 h-4 ${loadingDashboard ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loadingDashboard ? 'Refreshing...' : 'Refresh'}
        </button>
      )}

      {/* Delete Project */}
      {selectedProject && (
        <button
          onClick={onDeleteClick}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 border border-gray-700 hover:border-red-800 rounded transition-colors"
        >
          Delete Project
        </button>
      )}
    </div>
  );
}
