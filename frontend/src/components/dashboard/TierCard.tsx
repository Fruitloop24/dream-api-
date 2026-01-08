/**
 * TierCard - Single subscription tier display
 */

interface TierCardProps {
  tier: {
    name: string;
    displayName?: string;
    price: number;
    limit: number | string;
    priceId?: string;
    productId?: string;
    popular?: boolean;
  };
  onCopy: (text: string) => void;
}

export function TierCard({ tier, onCopy }: TierCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-lg">{tier.displayName || tier.name}</h4>
        {tier.popular && (
          <span className="text-xs px-2 py-1 bg-blue-600 rounded-full font-medium">Popular</span>
        )}
      </div>
      <div className="mb-3">
        <span className="text-2xl font-bold">${(tier.price / 100).toFixed(2)}</span>
        <span className="text-gray-400 text-sm">/mo</span>
      </div>
      <p className="text-sm text-gray-300 mb-3">
        {tier.limit === 'unlimited' ? 'Unlimited API calls' : `${tier.limit} API calls/month`}
      </p>
      <div className="pt-3 border-t border-gray-800 space-y-1.5">
        {tier.productId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Product:</span>
            <code className="text-xs text-gray-400 font-mono truncate flex-1">{tier.productId}</code>
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(tier.productId!); }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Copy
            </button>
          </div>
        )}
        {tier.priceId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Price:</span>
            <code className="text-xs text-gray-400 font-mono truncate flex-1">{tier.priceId}</code>
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(tier.priceId!); }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
