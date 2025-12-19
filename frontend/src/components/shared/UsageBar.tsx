/**
 * UsageBar - Progress bar showing usage count vs limit
 *
 * Color coding:
 * - Blue: < 70% usage
 * - Yellow: 70-90% usage
 * - Red: >= 90% usage
 */

interface UsageBarProps {
  count: number;
  limit: number | string;
}

export function UsageBar({ count, limit }: UsageBarProps) {
  const numericLimit = limit === 'unlimited' ? 100 : Number(limit || 1);
  const pct = Math.min(100, Math.round((count / numericLimit) * 100));

  return (
    <div className="space-y-1">
      <div className="h-2 w-24 bg-gray-800 rounded">
        <div
          className={`h-2 rounded ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">
        {count} / {limit === 'unlimited' ? '∞' : limit}
      </span>
    </div>
  );
}
