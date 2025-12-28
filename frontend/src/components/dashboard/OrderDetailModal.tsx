/**
 * OrderDetailModal - Full order details in a modal overlay
 */

import { useEffect } from 'react';

interface OrderDetailModalProps {
  order: {
    payload?: {
      data?: {
        object?: {
          id?: string;
          customer_email?: string;
          customer_details?: {
            name?: string;
            email?: string;
            address?: {
              line1?: string;
              line2?: string;
              city?: string;
              state?: string;
              postal_code?: string;
              country?: string;
            };
            phone?: string;
          };
          amount_total?: number;
          currency?: string;
          payment_intent?: string;
          payment_status?: string;
          shipping_details?: {
            name?: string;
            address?: {
              line1?: string;
              line2?: string;
              city?: string;
              state?: string;
              postal_code?: string;
              country?: string;
            };
          };
          metadata?: Record<string, string>;
        };
      };
    };
    createdAt?: string;
    type?: string;
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
  monospace,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (s: string) => void;
  highlight?: boolean;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${highlight ? 'text-green-400 font-bold' : 'text-gray-200'} ${monospace ? 'font-mono' : ''}`}>
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

function AddressBlock({ title, address }: {
  title: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}) {
  if (!address || !address.line1) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-400 mb-2">{title}</h4>
      <div className="text-sm text-gray-200 space-y-1">
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}{address.city && address.state && ', '}{address.state} {address.postal_code}
        </p>
        {address.country && <p className="text-gray-400">{address.country}</p>}
      </div>
    </div>
  );
}

export function OrderDetailModal({ order, onClose, onCopy }: OrderDetailModalProps) {
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

  const session = order.payload?.data?.object || {};
  const customerDetails = session.customer_details || {};
  const shippingDetails = session.shipping_details;

  const customerName = customerDetails.name || shippingDetails?.name || '—';
  const customerEmail = session.customer_email || customerDetails.email || '—';
  const amount = (session.amount_total || 0) / 100;
  const currency = (session.currency || 'usd').toUpperCase();
  const paymentIntent = session.payment_intent || session.id || '—';
  const paymentStatus = session.payment_status || 'unknown';
  const orderDate = order.createdAt ? new Date(order.createdAt) : null;

  const statusColor = paymentStatus === 'paid' ? 'bg-green-500' : paymentStatus === 'unpaid' ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{customerName}</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-sm text-gray-400 capitalize">{paymentStatus}</span>
                {orderDate && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-400">{orderDate.toLocaleDateString()}</span>
                  </>
                )}
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

        {/* Amount Highlight */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Order Total</p>
            <p className="text-4xl font-bold text-green-400">
              ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500">{currency}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Order Details */}
          <div className="space-y-0">
            <DetailRow label="Customer" value={customerName} />
            <DetailRow label="Email" value={customerEmail} copyable onCopy={onCopy} />
            {customerDetails.phone && (
              <DetailRow label="Phone" value={customerDetails.phone} copyable onCopy={onCopy} />
            )}
            <DetailRow label="Payment ID" value={typeof paymentIntent === 'string' ? paymentIntent : '—'} copyable onCopy={onCopy} monospace />
            <DetailRow label="Session ID" value={session.id || '—'} copyable onCopy={onCopy} monospace />
            <DetailRow label="Payment Status" value={paymentStatus} />
            {orderDate && (
              <DetailRow label="Order Date" value={orderDate.toLocaleString()} />
            )}
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AddressBlock title="Billing Address" address={customerDetails.address} />
            <AddressBlock title="Shipping Address" address={shippingDetails?.address} />
          </div>

          {/* Metadata */}
          {session.metadata && Object.keys(session.metadata).length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Order Metadata</h4>
              <div className="space-y-1">
                {Object.entries(session.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-gray-200 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-xl sticky bottom-0">
          <div className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Esc</kbd> to close
          </div>
          <div className="flex items-center gap-2">
            {typeof paymentIntent === 'string' && paymentIntent.startsWith('pi_') && (
              <a
                href={`https://dashboard.stripe.com/payments/${paymentIntent}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm font-medium flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View in Stripe
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
