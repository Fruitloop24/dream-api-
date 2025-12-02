/**
 * ============================================================================
 * CONFIGURE PAGE - PRODUCT & PRICING SETUP
 * ============================================================================
 *
 * Collects product name and tier configuration
 * Based on /configure-tiers Claude command logic
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

export default function Configure() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [productName, setProductName] = useState('');
  const [numTiers, setNumTiers] = useState<number>(2);
  const [tiers, setTiers] = useState<Tier[]>([
    { name: '', displayName: '', price: 0, limit: 0, features: '', popular: false },
    { name: '', displayName: '', price: 0, limit: 0, features: '', popular: false },
  ]);
  const [platformId, setPlatformId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState<'loading' | 'credentials' | 'config'>('loading');

  // On mount, check if payment was successful and generate credentials
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      generateCredentials();
    } else {
      // If no payment success, this page is for tier config only
      setStep('config');
    }
  }, []);

  const generateCredentials = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${FRONT_AUTH_API}/generate-credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlatformId(data.platformId);
        setApiKey(data.apiKey);
        setStep('credentials');
      } else {
        alert('Failed to generate credentials');
        setStep('config');
      }
    } catch (error) {
      console.error('Failed to generate credentials:', error);
      alert('Error generating credentials');
      setStep('config');
    }
  };

  const handleNumTiersChange = (num: number) => {
    setNumTiers(num);
    const newTiers: Tier[] = [];
    for (let i = 0; i < num; i++) {
      newTiers.push(
        tiers[i] || {
          name: '',
          displayName: '',
          price: 0,
          limit: '',
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

  const isDev = import.meta.env.DEV;

  const handleSubmit = async () => {
    // Validate
    if (!productName) {
      alert('Please enter your product name');
      return;
    }

    const incomplete = tiers.some(t => !t.name || !t.displayName);
    if (incomplete) {
      alert('Please fill in all tier fields');
      return;
    }

    try {
      // Step 1: Verify JWT with config-api to get userId
      const token = await getToken();
      if (!token) {
        alert('Authentication failed. Please log in again.');
        return;
      }

      const authResponse = await fetch(`${FRONT_AUTH_API}/verify-auth`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        console.error('[Configure] Auth failed:', errorData);
        throw new Error('Authentication failed');
      }

      const { userId } = await authResponse.json();
      console.log('[Configure] Got userId from Clerk:', userId);

      // Step 2: Save to localStorage for Styling page
      const tierConfig = {
        productName,
        tiers
      };
      localStorage.setItem('tierConfig', JSON.stringify(tierConfig));
      console.log('[Configure] Saved to localStorage:', tierConfig);

      // Navigate to styling page
      navigate('/styling');
    } catch (error) {
      console.error('Error saving tier config:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save configuration: ${message}`);
    }
  };

  const handleSkipForTesting = () => {
    if (confirm('Skip tier configuration? (Development only)')) {
      navigate('/styling');
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Setting up your API...</h2>
          <p className="text-slate-600">Please wait while we generate your credentials.</p>
        </div>
      </div>
    );
  }

  // Credentials display (after payment)
  if (step === 'credentials') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-8 py-16">
          {/* Success Header */}
          <div className="mb-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Payment Successful!</h1>
            <p className="text-xl text-slate-600">Let's set up your production API</p>
          </div>

          {/* Step 1: Connect Stripe FIRST */}
          <div className="bg-purple-50 border-2 border-purple-500 rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl">🔗</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Step 1: Connect Your Stripe Account</h3>
                <p className="text-slate-600">
                  We need your Stripe account to create products and handle customer billing
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const OAUTH_API = import.meta.env.VITE_OAUTH_API_URL || 'http://localhost:8789';
                window.location.href = `${OAUTH_API}/authorize?userId=${user?.id}`;
              }}
              className="w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors"
            >
              Connect Stripe Account →
            </button>
            <p className="text-xs text-slate-500 mt-3">
              This will open Stripe's secure authorization page. We'll only request permissions to create products and prices.
            </p>
          </div>

          {/* Why This Order */}
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Why Connect Stripe First?</h3>
            <div className="space-y-3 text-slate-700">
              <div className="flex items-start gap-3">
                <span className="text-purple-600 font-bold">1.</span>
                <p className="text-sm">Connect your Stripe account</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-400 font-bold">2.</span>
                <p className="text-sm text-slate-400">Configure your API tiers (coming next)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-400 font-bold">3.</span>
                <p className="text-sm text-slate-400">We create products on your Stripe automatically</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-400 font-bold">4.</span>
                <p className="text-sm text-slate-400">Get your API credentials and price IDs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tier configuration form
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Configure Your SaaS</h1>
          <p className="text-xl text-slate-600">Set up your product name and pricing tiers</p>
        </div>

        {/* Product Name */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 mb-8">
          <label className="block mb-4">
            <span className="text-slate-900 font-semibold mb-2 block">Product Name</span>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="My Awesome SaaS"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
            />
          </label>
        </div>

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
                {/* Tier Name (lowercase, internal) */}
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
                    placeholder="5, 100, unlimited"
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
            className="px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg font-bold text-lg transition-colors cursor-pointer"
          >
            Continue to Styling →
          </button>

          {/* Dev Testing Skip Button */}
          {isDev && (
            <button
              onClick={handleSkipForTesting}
              className="ml-4 px-8 py-2 bg-yellow-600 hover:bg-yellow-700 text-white border-none rounded-lg font-semibold text-sm transition-colors cursor-pointer"
            >
              ⚠️ Skip (Dev)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
