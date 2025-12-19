/**
 * CustomerTable - Paginated customer list with search and filter
 */

import { useState, useMemo } from 'react';
import { UsageBar, StatusBadge } from '@/components/shared';
import { CustomerDetail } from './CustomerDetail';
import { CUSTOMERS_PER_PAGE } from '@/constants';

interface CustomerTableProps {
  customers: any[];
  onCopy: (text: string) => void;
}

export function CustomerTable({ customers, onCopy }: CustomerTableProps) {
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
        <CustomerDetail
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onCopy={onCopy}
        />
      )}
    </div>
  );
}
