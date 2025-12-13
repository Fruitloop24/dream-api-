/**
 * API Tier Configuration - Configure REAL tiers for production API
 * After Stripe OAuth, configure actual pricing tiers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const OAUTH_API = import.meta.env.VITE_OAUTH_API_URL || 'http://localhost:8789';
const API_MULTI = import.meta.env.VITE_API_MULTI_URL || 'http://localhost:8787';

interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  billingMode: 'subscription' | 'one_off';
  description?: string;
  imageUrl?: string;
  inventory?: number | null;
  features?: string;
}

export default function ApiTierConfig() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [sellingMode, setSellingMode] = useState<'subscription' | 'one_off'>('subscription');
  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 100, billingMode: 'subscription', description: 'Free plan', inventory: null, features: '' },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 1000, billingMode: 'subscription', description: 'Pro plan', inventory: null, features: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [secretForUploads, setSecretForUploads] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

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

  const handleSellingModeChange = (mode: 'subscription' | 'one_off') => {
    setSellingMode(mode);
    setTiers((prev) =>
      prev.map((tier) => ({
        ...tier,
        billingMode: mode,
        limit: mode === 'subscription' ? tier.limit || 100 : 0,
        inventory: mode === 'one_off' ? tier.inventory ?? null : null,
      }))
    );
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (file: File, index: number) => {
    if (!secretForUploads) {
      alert('Enter your secret key to upload images');
      return;
    }
    try {
      setUploadingIndex(index);
      const base64 = await fileToBase64(file);
      const res = await fetch(`${API_MULTI}/api/assets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretForUploads}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          data: base64,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = await res.json();
      updateTier(index, 'imageUrl', data.url || '');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Check your secret key and try again.');
    } finally {
      setUploadingIndex(null);
    }
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

        {/* Selling Mode Switch */}
        <div className="mb-10 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">What are you selling?</h2>
          <p className="text-sm text-slate-600 mb-4">
            Keep flows separate: subscriptions for SaaS/courses with usage limits; one-off for store/cart (no limits, cart checkout).
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleSellingModeChange('subscription')}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                sellingMode === 'subscription'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-gray-300 hover:border-slate-400'
              }`}
            >
              Subscriptions (recurring)
            </button>
            <button
              onClick={() => handleSellingModeChange('one_off')}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                sellingMode === 'one_off'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-gray-300 hover:border-slate-400'
              }`}
            >
              One-off products (store/cart)
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            This sets all products below. Use separate keys/platforms if you want both flows.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-800 mb-2">Secret key (for image uploads to our CDN)</label>
            <input
              type="text"
              value={secretForUploads}
              onChange={(e) => setSecretForUploads(e.target.value)}
              placeholder="sk_live_..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional: paste your secret key to upload product images to the built-in CDN (R2). You can still paste external image URLs without this.
            </p>
          </div>
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
                <div className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Selling mode
                  </span>
                  <div className="px-4 py-2 border border-gray-200 rounded-lg text-slate-800 bg-slate-50">
                    {tier.billingMode === 'subscription' ? 'Subscription (recurring)' : 'One-off (single payment, cart)'}
                  </div>
                </div>

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
                    disabled={tier.billingMode !== 'one_off'}
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
                <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, index);
                      }}
                      disabled={uploadingIndex !== null}
                    />
                  </label>
                  {uploadingIndex === index && <span className="text-xs text-blue-600">Uploading...</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Paste a hosted image URL or upload to our CDN (requires secret key above). Shown on product cards.
                </div>
              </label>

              <label className="block mb-4">
                <span className="text-slate-700 text-sm font-semibold mb-2 block">
                  Highlights / badges (comma separated, optional)
                </span>
                <input
                  type="text"
                  value={tier.features || ''}
                  onChange={(e) => updateTier(index, 'features', e.target.value)}
                  placeholder="Fast support, Lifetime updates"
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
                  limit: sellingMode === 'subscription' ? 100 : 0,
                  billingMode: sellingMode,
                  description: '',
                  imageUrl: '',
                  inventory: null,
                  features: '',
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
