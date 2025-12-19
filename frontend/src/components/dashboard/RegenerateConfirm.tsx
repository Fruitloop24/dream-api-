/**
 * RegenerateConfirm - Inline confirmation for secret key regeneration
 */

interface RegenerateConfirmProps {
  mode: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RegenerateConfirm({
  mode,
  loading,
  onConfirm,
  onCancel,
}: RegenerateConfirmProps) {
  return (
    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-200 mb-1">Rotate Secret Key</h4>
          <p className="text-sm text-blue-300/80 mb-3">
            This generates a new secret key for your <strong>{mode}</strong> environment.
            Your publishable key stays the same, so your frontend code won't break.
          </p>
          <ul className="text-xs text-blue-300/70 mb-3 space-y-1">
            <li>✓ Publishable key unchanged - frontend keeps working</li>
            <li>✓ Products & tiers unchanged - no Stripe reconfiguration</li>
            <li>✓ Customer data preserved - subscriptions continue</li>
            <li>• Only update: your backend's <code className="bg-blue-900/50 px-1 rounded">SECRET_KEY</code> env var</li>
          </ul>
          <div className="flex items-center gap-2">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium text-sm"
            >
              {loading ? 'Generating...' : 'Generate New Secret'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
