/**
 * ProductsTable - Store products display with images and stock status
 */

import { useNavigate } from 'react-router-dom';
import type { Project } from '@/constants';

interface ProductsTableProps {
  project: Project;
  products: any[];
  onCopy: (text: string) => void;
}

export function ProductsTable({ project, products, onCopy }: ProductsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">Products</h3>
          <span className="text-sm text-gray-500">({products.length})</span>
        </div>
        <button
          onClick={() => navigate(`/api-tier-config?edit=true&mode=${project.mode}&projectType=store&pk=${project.publishableKey}`)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
        >
          Edit Products
        </button>
      </div>

      {products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-4 w-16">Image</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Price ID</th>
                <th className="py-2 pr-4">Product ID</th>
                <th className="py-2 pr-4 text-right">Stock</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.priceId} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="py-3 pr-4">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.displayName} className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-medium">{p.displayName || p.name}</td>
                  <td className="py-3 pr-4">
                    <span className="text-green-400 font-bold">${(p.price || 0).toFixed(2)}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{p.priceId}</code>
                      <button
                        onClick={() => onCopy(p.priceId)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{p.productId}</code>
                      <button
                        onClick={() => onCopy(p.productId)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {p.inventory !== null ? (
                      <span className={`font-mono ${p.inventory <= 5 ? 'text-amber-400' : 'text-gray-300'}`}>
                        {p.inventory}
                      </span>
                    ) : (
                      <span className="text-gray-500">∞</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {p.soldOut ? (
                      <span className="px-2 py-1 text-xs bg-red-900/50 border border-red-700 rounded text-red-200">
                        Sold Out
                      </span>
                    ) : p.inventory !== null && p.inventory <= 5 ? (
                      <span className="px-2 py-1 text-xs bg-amber-900/50 border border-amber-700 rounded text-amber-200">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-900/50 border border-green-700 rounded text-green-200">
                        In Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No products yet.</p>
      )}
    </div>
  );
}
