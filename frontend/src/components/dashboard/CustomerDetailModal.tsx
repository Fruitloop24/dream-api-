/**
 * CustomerDetailModal - Full customer details in a modal overlay
 */

import { useEffect } from 'react';

interface CustomerDetailModalProps {
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
    createdAt?: string;
  };
  onClose: () => void;
  onCopy: (text: string) => void;
}

function DetailRow({
  label,
  value,
  copyable,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (s: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${highlight ? 'text-blue-400 font-medium' : 'text-gray-200'}`}>
          {value}
        </span>
        {copyable && value && value !== '—' && onCopy && (
          <button
            onClick={() => onCopy(value)}
            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

export function CustomerDetailModal({ customer, onClose, onCopy }: CustomerDetailModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const status = customer.canceledAt ? 'Canceling' : (customer.status || 'active');
  const statusColor = status === 'active' ? 'bg-green-500' : status === 'Canceling' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold">
              {(customer.email?.[0] || customer.userId?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{customer.email || 'No email'}</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-sm text-gray-400 capitalize">{status}</span>
                <span className="text-gray-600">•</span>
                <span className="text-sm text-gray-400 capitalize">{customer.plan || 'free'} plan</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-1">
          {/* Usage Stats */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Usage This Period</span>
              <span className="text-lg font-bold">
                {customer.usageCount || 0} / {customer.limit || 0}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((customer.usageCount || 0) / (Number(customer.limit) || 1)) * 100)}%`
                }}
              />
            </div>
            {customer.currentPeriodEnd && (
              <p className="text-xs text-gray-500 mt-2">
                Resets {new Date(customer.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Details List */}
          <div className="space-y-0">
            <DetailRow label="User ID" value={customer.userId} copyable onCopy={onCopy} />
            <DetailRow label="Email" value={customer.email || '—'} copyable onCopy={onCopy} />
            <DetailRow label="Plan" value={customer.plan || 'free'} highlight />
            <DetailRow label="Status" value={status} />
            <DetailRow
              label="Stripe Customer"
              value={customer.stripeCustomerId || '—'}
              copyable
              onCopy={onCopy}
            />
            <DetailRow
              label="Subscription ID"
              value={customer.subscriptionId || '—'}
              copyable
              onCopy={onCopy}
            />
            <DetailRow
              label="Period End"
              value={customer.currentPeriodEnd ? new Date(customer.currentPeriodEnd).toLocaleDateString() : '—'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-xl">
          <div className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Esc</kbd> to close
          </div>
          <div className="flex items-center gap-2">
            {customer.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${customer.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm font-medium flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Stripe
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
