/**
 * SubscriptionDropdown - Simple status badge + manage billing button
 */

import { useState, useRef, useEffect } from 'react';

interface SubscriptionDropdownProps {
  subscription: { status: string; trialEndsAt?: number } | null;
  loading: boolean;
  statusDisplay: { label: string; color: string };
  onManageBilling: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-700' },
  amber: { bg: 'bg-amber-900/50', text: 'text-amber-400', border: 'border-amber-700' },
  red: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-700' },
  gray: { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' },
};

export function SubscriptionDropdown({
  subscription,
  loading,
  statusDisplay,
  onManageBilling,
}: SubscriptionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colors = STATUS_COLORS[statusDisplay.color] || STATUS_COLORS.gray;

  if (loading) {
    return (
      <div className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 ${colors.bg} border ${colors.border} rounded-lg text-sm font-medium ${colors.text} hover:opacity-80 transition flex items-center gap-2`}
      >
        <span className={`w-2 h-2 rounded-full ${statusDisplay.color === 'green' ? 'bg-green-500' : statusDisplay.color === 'amber' ? 'bg-amber-500 animate-pulse' : statusDisplay.color === 'red' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
        {statusDisplay.label}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel - Simplified */}
      {isOpen && subscription && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
              <span className="text-sm text-gray-400">Subscription</span>
              <span className={`px-2 py-0.5 text-xs rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                {subscription.status.toUpperCase()}
              </span>
            </div>

            {/* Trial Info */}
            {subscription.status === 'trialing' && subscription.trialEndsAt && (
              <div className="mb-4 p-2 bg-amber-900/20 border border-amber-800 rounded">
                <p className="text-xs text-amber-400">
                  Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Past Due Warning */}
            {subscription.status === 'past_due' && (
              <div className="mb-4 p-2 bg-red-900/20 border border-red-800 rounded">
                <p className="text-xs text-red-400">
                  Payment failed. Update payment method.
                </p>
              </div>
            )}

            {/* Manage Billing Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                onManageBilling();
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition"
            >
              Manage Billing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
