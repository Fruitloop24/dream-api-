/**
 * Toast - Success/error notification
 */

import type { Toast as ToastType } from '@/hooks';

interface ToastProps {
  toast: ToastType;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        toast.type === 'success'
          ? 'bg-green-900/90 border-green-700 text-green-100'
          : 'bg-red-900/90 border-red-700 text-red-100'
      }`}>
        {toast.type === 'success' ? (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="font-medium">{toast.message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-current opacity-70 hover:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
