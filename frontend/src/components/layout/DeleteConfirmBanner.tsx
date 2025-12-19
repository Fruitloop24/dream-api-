/**
 * DeleteConfirmBanner - Inline confirmation for project deletion
 */

interface DeleteConfirmBannerProps {
  projectName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmBanner({
  projectName,
  loading,
  onConfirm,
  onCancel,
}: DeleteConfirmBannerProps) {
  return (
    <div className="mb-4 flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-lg p-4">
      <span className="text-red-300 font-medium">
        Delete "{projectName}" permanently?
      </span>
      <span className="text-red-400/70 text-sm">
        This removes both Test + Live keys, all customer data, usage, and assets.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded font-medium text-sm"
        >
          {loading ? 'Deleting...' : 'Yes, Delete Forever'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
