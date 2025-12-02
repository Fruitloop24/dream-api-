/**
 * API Tier Configuration - Configure REAL tiers for production API
 * After Stripe OAuth, configure actual pricing tiers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  features: string;
  popular: boolean;
}

export default function ApiTierConfig() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [numTiers, setNumTiers] = useState<number>(2);
  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 100, features: 'Basic features,Community support', popular: false },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 'unlimited', features: 'All features,Priority support,API access', popular: true },
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

  const handleNumTiersChange = (num: number) => {
    setNumTiers(num);
    const newTiers: Tier[] = [];
    for (let i = 0; i < num; i++) {
      newTiers.push(
        tiers[i] || {
          name: '',
          displayName: '',
          price: 0,
          limit: 0,
          features: '',
          popular: false,
        }
      );
    }
    setTiers(newTiers);
  };

  const updateTier = (index: number, field: keyof Tier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleSubmit = async () => {
    // Validate
    const incomplete = tiers.some(t => !t.name || !t.displayName);
    if (incomplete) {
      alert('Please fill in all tier fields');
      return;
    }

    setLoading(true);

    try {
      // TODO: Send to backend to:
      // 1. Create Stripe products using their connected Stripe account
      // 2. Get price IDs
      // 3. Generate platformId + API key
      // 4. Save to KV

      // For now, save to localStorage and go to credentials page
      localStorage.setItem('apiTiers', JSON.stringify(tiers));

      // TODO: Call backend endpoint that does all this
      // For now, just navigate
      navigate('/api-credentials');
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
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Configure Your API Tiers</h1>
          <p className="text-xl text-slate-600">Set up pricing for your production API</p>
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

        {/* Number of Tiers */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 mb-8">
          <h3 className="text-slate-900 font-semibold mb-4">How many pricing tiers?</h3>
          <div className="flex gap-4">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => handleNumTiersChange(num)}
                className={`px-6 py-3 border-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  numTiers === num
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {num} Tiers
              </button>
            ))}
          </div>
        </div>

        {/* Tier Configuration */}
        <div className="space-y-6 mb-12">
          {tiers.map((tier, index) => (
            <div key={index} className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">
                Tier {index + 1} {index === 0 && '(Usually Free)'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Tier Name */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Tier ID (lowercase, no spaces)
                  </span>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => updateTier(index, 'name', e.target.value.toLowerCase())}
                    placeholder="free, pro, enterprise"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                {/* Display Name */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Display Name
                  </span>
                  <input
                    type="text"
                    value={tier.displayName}
                    onChange={(e) => updateTier(index, 'displayName', e.target.value)}
                    placeholder="Free, Pro, Enterprise"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Price */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Price ($/month)
                  </span>
                  <input
                    type="text"
                    value={tier.price}
                    onChange={(e) => updateTier(index, 'price', Number(e.target.value) || 0)}
                    placeholder="0, 29, 99"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                {/* Limit */}
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
              </div>

              {/* Features */}
              <label className="block mb-4">
                <span className="text-slate-700 text-sm font-semibold mb-2 block">
                  Features (comma-separated)
                </span>
                <input
                  type="text"
                  value={tier.features}
                  onChange={(e) => updateTier(index, 'features', e.target.value)}
                  placeholder="API access, Email support, Priority support"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                />
              </label>

              {/* Popular Badge */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier.popular}
                  onChange={(e) => updateTier(index, 'popular', e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-700 text-sm font-semibold">
                  Show "Popular" badge on this tier
                </span>
              </label>
            </div>
          ))}
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
