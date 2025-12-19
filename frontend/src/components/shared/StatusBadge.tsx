/**
 * StatusBadge - Colored badge for subscription status
 */

import { STATUS_STYLES } from '@/constants';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.none;
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${style}`}>
      {status}
    </span>
  );
}
