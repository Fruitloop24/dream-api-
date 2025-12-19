/**
 * StripeAccountSection - Shows connected Stripe account or connect prompt
 */

import { useUser } from '@clerk/clerk-react';

interface StripeAccountSectionProps {
  stripeAccountId: string | null | undefined;
  onCopy: (text: string) => void;
}

export function StripeAccountSection({ stripeAccountId, onCopy }: StripeAccountSectionProps) {
  const { user } = useUser();

  const handleConnectStripe = () => {
    window.location.href = `${import.meta.env.VITE_OAUTH_API_URL}/authorize?userId=${user?.id}`;
  };

  if (stripeAccountId) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Stripe Logo */}
            <div className="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Connected Stripe Account</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-white">{stripeAccountId}</code>
                <button
                  onClick={() => onCopy(stripeAccountId)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <a
            href={`https://dashboard.stripe.com/${stripeAccountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#635BFF] hover:bg-[#5449E0] rounded text-sm font-medium text-white flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Stripe Dashboard
          </a>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            <span className="text-green-400 font-medium">You have full control.</span> All funds go directly to your Stripe account.
            You handle refunds, disputes, and payouts. We never touch your money.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-amber-200 font-medium">Stripe Not Connected</p>
            <p className="text-amber-300/70 text-sm">Connect your Stripe account to process payments</p>
          </div>
        </div>
        <button
          onClick={handleConnectStripe}
          className="px-4 py-2 bg-[#635BFF] hover:bg-[#5449E0] rounded font-medium text-white"
        >
          Connect Stripe
        </button>
      </div>
    </div>
  );
}
