/**
 * OrdersTable - Store orders from webhook checkout events
 */

interface OrdersTableProps {
  webhook: {
    recent?: any[];
  };
  onCopy: (text: string) => void;
}

export function OrdersTable({ webhook, onCopy }: OrdersTableProps) {
  const orders = (webhook.recent || []).filter(
    (e: any) => e.type === 'checkout.session.completed' && e.payload?.data?.object?.mode === 'payment'
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">Orders</h3>
          <span className="text-sm text-gray-500">({orders.length})</span>
        </div>
      </div>

      {orders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Payment ID</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 15).map((evt: any, i: number) => {
                const session = evt.payload?.data?.object || {};
                const customerDetails = session.customer_details || {};
                const name = customerDetails.name || '—';
                const email = session.customer_email || customerDetails.email || 'Guest';
                const paymentIntent = session.payment_intent || session.id || '—';
                return (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-900/50">
                    <td className="py-3 pr-4 font-medium">{name}</td>
                    <td className="py-3 pr-4">
                      <span className="text-blue-400">{email}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-green-400 font-bold">${((session.amount_total || 0) / 100).toFixed(2)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <code className="text-xs text-gray-400 font-mono truncate max-w-[100px]">
                          {typeof paymentIntent === 'string' ? paymentIntent.slice(-8) : '—'}
                        </code>
                        {typeof paymentIntent === 'string' && (
                          <button
                            onClick={() => onCopy(paymentIntent)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500">No orders yet</p>
          <p className="text-gray-600 text-sm mt-1">Orders will appear here after customers complete checkout</p>
        </div>
      )}
    </div>
  );
}
