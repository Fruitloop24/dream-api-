/**
 * ApiKeysSection - Shows publishable/secret keys with rotate functionality
 */

import { useNavigate } from 'react-router-dom';
import type { Project, Credentials } from '@/constants';

interface ApiKeysSectionProps {
  project: Project;
  projects: Project[];
  credentials: Credentials;
  showSecret: boolean;
  onToggleSecret: () => void;
  onCopy: (text: string) => void;
  onRegenerateClick: () => void;
}

export function ApiKeysSection({
  project,
  projects,
  credentials,
  showSecret,
  onToggleSecret,
  onCopy,
  onRegenerateClick,
}: ApiKeysSectionProps) {
  const navigate = useNavigate();
  const sk = project.mode === 'test' ? credentials.testSecretKey : credentials.liveSecretKey;
  const hasLiveVersion = projects.some(p => p.name === project.name && p.mode === 'live');

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">API Keys</h3>
        {/* Only show "Edit & Go Live" if test mode AND no live version exists */}
        {project.mode === 'test' && !hasLiveVersion && (
          <button
            onClick={() => navigate(`/api-tier-config?promote=true&mode=test&projectType=${project.type}&pk=${project.publishableKey}&projectName=${encodeURIComponent(project.name)}`)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold"
          >
            Edit & Go Live
          </button>
        )}
        {/* Show badge if already live */}
        {project.mode === 'test' && hasLiveVersion && (
          <span className="px-3 py-1.5 bg-green-900/30 border border-green-700 rounded text-sm text-green-300">
            ✓ Live version exists
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Publishable Key */}
        <div>
          <p className="text-xs text-gray-400 mb-1">Publishable Key</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
              {project.publishableKey}
            </code>
            <button
              onClick={() => onCopy(project.publishableKey)}
              className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Secret Key */}
        <div>
          <p className="text-xs text-gray-400 mb-1">Secret Key</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
              {showSecret ? (sk || 'Not available') : '••••••••••••••••'}
            </code>
            <button
              onClick={onToggleSecret}
              className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
            >
              {showSecret ? 'Hide' : 'Show'}
            </button>
            {sk && (
              <button
                onClick={() => onCopy(sk)}
                className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Rotation */}
      <div className="pt-3 border-t border-gray-700">
        <button
          onClick={onRegenerateClick}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rotate {project.mode === 'test' ? 'Test' : 'Live'} Secret
        </button>
      </div>
    </div>
  );
}
