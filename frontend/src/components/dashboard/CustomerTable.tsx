/**
 * CustomerTable - Paginated customer list with search, filter, and CSV export
 */

import { useState, useMemo } from 'react';
import { UsageBar, StatusBadge } from '@/components/shared';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CUSTOMERS_PER_PAGE } from '@/constants';

interface CustomerTableProps {
  customers: any[];
  onCopy: (text: string) => void;
  onDelete?: (customerId: string) => Promise<void>;
  deleting?: boolean;
}

/** Generate CSV content from customer array */
function generateCSV(customers: any[]): string {
  const headers = ['Email', 'User ID', 'Plan', 'Status', 'Usage', 'Limit', 'Stripe Customer ID', 'Subscription ID', 'Period End'];
  const rows = customers.map((c: any) => [
    c.email || '',
    c.userId || '',
    c.plan || 'free',
    c.canceledAt ? 'canceling' : (c.status || 'active'),
    String(c.usageCount || 0),
    String(c.limit || 0),
    c.stripeCustomerId || '',
    c.subscriptionId || '',
    c.currentPeriodEnd ? new Date(c.currentPeriodEnd).toISOString() : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}

/** Download CSV file */
function downloadCSV(customers: any[], filename: string) {
  const csv = generateCSV(customers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CustomerTable({ customers, onCopy, onDelete, deleting }: CustomerTableProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceling'>('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [page, setPage] = useState(0);

  // Filter + sort customers by usage
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c: any) => {
        if (statusFilter === 'active' && c.canceledAt) return false;
        if (statusFilter === 'canceling' && !c.canceledAt) return false;
        if (search) {
          const hay = `${c.email || ''} ${c.userId || ''}`.toLowerCase();
          return hay.includes(search.toLowerCase());
        }
        return true;
      })
      .sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0));
  }, [customers, statusFilter, search]);

  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    page * CUSTOMERS_PER_PAGE,
    (page + 1) * CUSTOMERS_PER_PAGE
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">Customers</h3>
          <span className="text-sm text-gray-500">({filteredCustomers.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search email or ID"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="canceling">Canceling</option>
          </select>
          <button
            onClick={() => downloadCSV(filteredCustomers, `customers-${new Date().toISOString().split('T')[0]}.csv`)}
            disabled={filteredCustomers.length === 0}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-1.5"
            title="Export to CSV"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Plan</th>
            <th className="py-2 pr-4">Usage</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Renews</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCustomers.map((c: any) => (
            <tr
              key={c.userId}
              className="border-b border-gray-800 hover:bg-gray-900/50 cursor-pointer"
              onClick={() => setSelectedCustomer(c)}
            >
              <td className="py-2 pr-4">{c.email || c.userId}</td>
              <td className="py-2 pr-4">
                <span className="px-2 py-0.5 text-xs rounded bg-blue-900/50 border border-blue-700">
                  {c.plan || 'free'}
                </span>
              </td>
              <td className="py-2 pr-4">
                <UsageBar count={c.usageCount || 0} limit={c.limit} />
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={c.canceledAt ? 'canceling' : c.status || 'active'} />
              </td>
              <td className="py-2 pr-4 text-gray-400">
                {c.currentPeriodEnd ? new Date(c.currentPeriodEnd).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
          {filteredCustomers.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">
                No customers yet
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {filteredCustomers.length > CUSTOMERS_PER_PAGE && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-4">
          <span className="text-sm text-gray-500">
            Showing {page * CUSTOMERS_PER_PAGE + 1}-{Math.min((page + 1) * CUSTOMERS_PER_PAGE, filteredCustomers.length)} of {filteredCustomers.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * CUSTOMERS_PER_PAGE >= filteredCustomers.length}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onCopy={onCopy}
          onDelete={onDelete ? async (customerId) => {
            await onDelete(customerId);
            setSelectedCustomer(null);
          } : undefined}
          deleting={deleting}
        />
      )}
    </div>
  );
}
