/**
 * PlatformIdBadge - Shows the platform ID with copy button
 */

interface PlatformIdBadgeProps {
  platformId: string;
  onCopy: (text: string) => void;
}

export function PlatformIdBadge({ platformId, onCopy }: PlatformIdBadgeProps) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded px-3 py-1">
      <span className="text-xs uppercase text-gray-500">Platform ID</span>
      <span className="font-mono">{platformId}</span>
      <button
        onClick={() => onCopy(platformId)}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        Copy
      </button>
    </div>
  );
}
