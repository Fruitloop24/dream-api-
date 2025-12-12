/**
 * API Tier Configuration - Configure REAL tiers for production API
 * After Stripe OAuth, configure actual pricing tiers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const OAUTH_API = import.meta.env.VITE_OAUTH_API_URL || 'http://localhost:8789';

interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  billingMode: 'subscription' | 'one_off';
  description?: string;
  imageUrl?: string;
  inventory?: number | null;
}

export default function ApiTierConfig() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 100, billingMode: 'subscription', description: 'Free plan', inventory: null },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 1000, billingMode: 'subscription', description: 'Pro plan', inventory: null },
  ]);
  const [loading, setLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Check if coming from Stripe OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'connected') {
      setStripeConnected(true);
    }
  }, []);

  const updateTier = (index: number, field: keyof Tier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleSubmit = async () => {
    // Validate
    const incomplete = tiers.some(t => !t.name || !t.displayName || !t.billingMode);
    if (incomplete) {
      alert('Please fill in all tier fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${OAUTH_API}/create-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id, tiers }),
      });

      if (response.ok) {
        // Backend creates products, generates publishableKey + secretKey
        // Redirect to /credentials page to display them
        navigate('/credentials?success=true');
      } else {
        const error = await response.text();
        alert(`Failed to create products: ${error}`);
      }
    } catch (error) {
      console.error('Error saving tier config:', error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Configure Your Products</h1>
          <p className="text-xl text-slate-600">Subscription tiers or one-off products for your customers</p>
        </div>

        {/* Stripe Connected Banner */}
        {stripeConnected && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h3 className="text-lg font-bold text-green-900">Stripe Connected!</h3>
                <p className="text-green-700 text-sm">
                  Now configure your tiers. We'll create products on your Stripe account automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Product Configuration */}
        <div className="space-y-6 mb-12">
          {tiers.map((tier, index) => (
            <div key={index} className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Product {index + 1}
                </h3>
                <button
                  className="text-sm text-red-500"
                  onClick={() => setTiers(tiers.filter((_, i) => i !== index))}
                  disabled={tiers.length <= 1}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Product ID (lowercase, no spaces)
                  </span>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => updateTier(index, 'name', e.target.value.toLowerCase())}
                    placeholder="free, pro, oneoff1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Display Name
                  </span>
                  <input
                    type="text"
                    value={tier.displayName}
                    onChange={(e) => updateTier(index, 'displayName', e.target.value)}
                    placeholder="Free, Pro, One-time Template"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Price ({tier.billingMode === 'one_off' ? 'one-time $' : '$/month'})
                  </span>
                  <input
                    type="text"
                    value={tier.price}
                    onChange={(e) => updateTier(index, 'price', Number(e.target.value) || 0)}
                    placeholder="0, 29, 99"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                {tier.billingMode === 'subscription' && (
                  <label className="block">
                    <span className="text-slate-700 text-sm font-semibold mb-2 block">
                      Monthly Limit
                    </span>
                    <input
                      type="text"
                      value={tier.limit}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateTier(index, 'limit', val === 'unlimited' ? 'unlimited' : Number(val) || val);
                      }}
                      placeholder="100, 1000, unlimited"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Billing Type
                  </span>
                  <select
                    value={tier.billingMode}
                    onChange={(e) => updateTier(index, 'billingMode', e.target.value as 'subscription' | 'one_off')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  >
                    <option value="subscription">Subscription (recurring)</option>
                    <option value="one_off">One-off (single payment)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Inventory (one-off only)
                  </span>
                  <input
                    type="number"
                    value={tier.inventory ?? ''}
                    onChange={(e) => updateTier(index, 'inventory', e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Leave blank for unlimited"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>
              </div>

              <label className="block mb-4">
                <span className="text-slate-700 text-sm font-semibold mb-2 block">
                  Image URL (optional)
                </span>
                <input
                  type="text"
                  value={tier.imageUrl || ''}
                  onChange={(e) => updateTier(index, 'imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                />
              </label>

              <label className="block mb-4">
                <span className="text-slate-700 text-sm font-semibold mb-2 block">
                  Description
                </span>
                <textarea
                  value={tier.description || ''}
                  onChange={(e) => updateTier(index, 'description', e.target.value)}
                  placeholder="What does this include?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  rows={3}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mb-12">
          <button
            onClick={() =>
              setTiers([
                ...tiers,
                {
                  name: '',
                  displayName: '',
                  price: 0,
                  limit: 0,
                  billingMode: 'subscription',
                  description: '',
                  imageUrl: '',
                  inventory: null,
                },
              ])
            }
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold"
          >
            + Add Product
          </button>
        </div>

        {/* Submit */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-12 py-4 text-white rounded-lg font-bold text-lg transition-colors ${
              loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {loading ? 'Creating Products...' : 'Create Stripe Products & Get API Key →'}
          </button>
          <p className="mt-4 text-slate-500 text-sm">
            We'll create these products on your Stripe account and generate your API credentials
          </p>
        </div>
      </div>
    </div>
  );
}
