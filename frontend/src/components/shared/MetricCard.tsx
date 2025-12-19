/**
 * MetricCard - Display a single metric (label + value)
 *
 * Used in dashboard for stats like Active Subs, MRR, Usage, etc.
 */

interface MetricCardProps {
  label: string;
  value: string | number;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
