/**
 * CustomerDetail - Expanded customer information panel
 */

interface CustomerDetailProps {
  customer: {
    userId: string;
    email?: string;
    plan?: string;
    status?: string;
    canceledAt?: string;
    usageCount?: number;
    limit?: number | string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
    subscriptionId?: string;
  };
  onClose: () => void;
  onCopy: (text: string) => void;
}

function DetailItem({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (s: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm text-gray-200 truncate">{value}</p>
        {copyable && value && value !== '—' && onCopy && (
          <button onClick={() => onCopy(value)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

export function CustomerDetail({ customer, onClose, onCopy }: CustomerDetailProps) {
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Customer Details</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <DetailItem label="User ID" value={customer.userId} copyable onCopy={onCopy} />
        <DetailItem label="Email" value={customer.email || '—'} />
        <DetailItem label="Plan" value={customer.plan || 'free'} />
        <DetailItem label="Status" value={customer.canceledAt ? 'Canceling' : customer.status || 'active'} />
        <DetailItem label="Usage" value={`${customer.usageCount || 0} / ${customer.limit || 0}`} />
        <DetailItem label="Period Ends" value={customer.currentPeriodEnd ? new Date(customer.currentPeriodEnd).toLocaleDateString() : '—'} />
        <DetailItem label="Stripe Customer" value={customer.stripeCustomerId || '—'} copyable onCopy={onCopy} />
        <DetailItem label="Subscription ID" value={customer.subscriptionId || '—'} copyable onCopy={onCopy} />
      </div>
    </div>
  );
}
