/**
 * KeyModal - Shows newly generated secret key after rotation
 */

interface KeyModalProps {
  secretKey: string;
  mode: string;
  onClose: () => void;
}

export function KeyModal({ secretKey, mode, onClose }: KeyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-lg w-full shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">New {mode.toUpperCase()} Secret Key</h3>
              <p className="text-sm text-gray-400">Copied to clipboard</p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">Your new secret key:</p>
            <code className="text-sm text-green-400 font-mono break-all select-all">{secretKey}</code>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-200 font-medium mb-2">What to update:</p>
            <ul className="text-sm text-blue-300/80 space-y-1">
              <li>• Your server's <code className="bg-blue-900/50 px-1 rounded">SECRET_KEY</code> environment variable</li>
              <li>• Any backend code that calls the dream-api</li>
            </ul>
            <p className="text-xs text-blue-400 mt-3">
              Your publishable key and frontend code remain unchanged.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
