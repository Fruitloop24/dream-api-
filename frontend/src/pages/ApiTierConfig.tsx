/**
 * API Product Configuration - dream-api
 *
 * Configure SaaS subscription tiers OR Store one-off products
 * Dark theme matching dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';

const OAUTH_API = import.meta.env.VITE_OAUTH_API_URL || 'http://localhost:8789';
const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

type ConfigTab = 'saas' | 'store';
type ModeType = 'test' | 'live';

interface SaasTier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  features: string;
  popular?: boolean;
}

interface StoreProduct {
  name: string;
  displayName: string;
  price: number;
  description: string;
  imageUrl: string;
  inventory: number | null;
  features: string;
}

export default function ApiTierConfig() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Mode: test or live
  const [mode, setMode] = useState<ModeType>('test');

  // Project name
  const [projectName, setProjectName] = useState<string>('');

  // Tab: saas or store
  const [activeTab, setActiveTab] = useState<ConfigTab>('saas');

  // SaaS tiers
  const [saasTiers, setSaasTiers] = useState<SaasTier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 100, features: '', popular: false },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 1000, features: '', popular: true },
  ]);

  // Store products
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([
    { name: 'product1', displayName: 'My Product', price: 49, description: '', imageUrl: '', inventory: null, features: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Check URL params for stripe connected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'connected') {
      setStripeConnected(true);
    }
  }, []);

  // Image upload helper
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (file: File, index: number) => {
    try {
      setUploadingIndex(index);
      const base64 = await fileToBase64(file);
      const token = await getToken({ template: 'dream-api' });
      if (!token) throw new Error('Missing auth token');

      const res = await fetch(`${FRONT_AUTH_API}/upload-asset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          data: base64,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      updateStoreProduct(index, 'imageUrl', data.url || '');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Try again.');
    } finally {
      setUploadingIndex(null);
    }
  };

  // SaaS tier helpers
  const updateSaasTier = (index: number, field: keyof SaasTier, value: any) => {
    const updated = [...saasTiers];
    updated[index] = { ...updated[index], [field]: value };
    setSaasTiers(updated);
  };

  const addSaasTier = () => {
    setSaasTiers([
      ...saasTiers,
      { name: '', displayName: '', price: 0, limit: 100, features: '', popular: false },
    ]);
  };

  const removeSaasTier = (index: number) => {
    if (saasTiers.length <= 1) return;
    setSaasTiers(saasTiers.filter((_, i) => i !== index));
  };

  // Store product helpers
  const updateStoreProduct = (index: number, field: keyof StoreProduct, value: any) => {
    const updated = [...storeProducts];
    updated[index] = { ...updated[index], [field]: value };
    setStoreProducts(updated);
  };

  const addStoreProduct = () => {
    setStoreProducts([
      ...storeProducts,
      { name: '', displayName: '', price: 0, description: '', imageUrl: '', inventory: null, features: '' },
    ]);
  };

  const removeStoreProduct = (index: number) => {
    if (storeProducts.length <= 1) return;
    setStoreProducts(storeProducts.filter((_, i) => i !== index));
  };

  // Submit handler
  const handleSubmit = async () => {
    // Validate project name
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    // Build tiers array based on active tab
    let tiers: any[] = [];

    if (activeTab === 'saas') {
      const incomplete = saasTiers.some(t => !t.name || !t.displayName);
      if (incomplete) {
        alert('Please fill in all tier fields (name and display name required)');
        return;
      }
      tiers = saasTiers.map(t => ({
        name: t.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: t.displayName,
        price: t.price,
        limit: t.limit,
        billingMode: 'subscription',
        features: t.features,
        popular: t.popular,
        description: '',
        imageUrl: '',
        inventory: null,
      }));
    } else {
      const incomplete = storeProducts.some(p => !p.name || !p.displayName);
      if (incomplete) {
        alert('Please fill in all product fields (name and display name required)');
        return;
      }
      tiers = storeProducts.map(p => ({
        name: p.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: p.displayName,
        price: p.price,
        limit: 0,
        billingMode: 'one_off',
        features: p.features,
        description: p.description,
        imageUrl: p.imageUrl,
        inventory: p.inventory,
      }));
    }

    setLoading(true);

    try {
      const response = await fetch(`${OAUTH_API}/create-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, tiers, mode, projectName: projectName.trim() }),
      });

      if (response.ok) {
        // Go straight to dashboard - keys will be loaded there
        navigate('/dashboard');
      } else {
        const error = await response.text();
        alert(`Failed to create products: ${error}`);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">dream-api</h1>
            <span className="text-gray-500">/ Configure Products</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-400 hover:text-white"
            >
              Back to Dashboard
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Stripe Connected Banner */}
        {stripeConnected && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-semibold text-green-200">Stripe Connected!</p>
              <p className="text-sm text-green-300/70">Configure your products below.</p>
            </div>
          </div>
        )}

        {/* Project Name */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <label className="block font-semibold mb-2">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., My Chat API, My Store, Weather API"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-sm text-gray-500 mt-2">This name will identify your API keys in the dashboard</p>
        </div>

        {/* Mode Toggle */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Environment Mode</h3>
              <p className="text-sm text-gray-400">
                Start with Test mode. When ready, create Live products.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('test')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'test'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                    : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                }`}
              >
                Test Mode
              </button>
              <button
                onClick={() => setMode('live')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'live'
                    ? 'bg-green-500/20 text-green-300 border border-green-500'
                    : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                }`}
              >
                Live Mode
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
          <button
            onClick={() => setActiveTab('saas')}
            className={`px-4 py-2 rounded-t font-semibold transition-colors ${
              activeTab === 'saas'
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            SaaS / Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 rounded-t font-semibold transition-colors ${
              activeTab === 'store'
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Store / One-offs
          </button>
        </div>

        {/* SaaS Tab Content */}
        {activeTab === 'saas' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4">
              <p className="text-sm text-gray-400">
                Configure subscription tiers with monthly limits. Customers subscribe and get usage-tracked API access.
              </p>
            </div>

            {saasTiers.map((tier, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Tier {index + 1}</h3>
                  <button
                    onClick={() => removeSaasTier(index)}
                    disabled={saasTiers.length <= 1}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tier ID (lowercase)</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateSaasTier(index, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="free, pro, enterprise"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={tier.displayName}
                      onChange={(e) => updateSaasTier(index, 'displayName', e.target.value)}
                      placeholder="Free, Pro, Enterprise"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Price ($/month)</label>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateSaasTier(index, 'price', Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Monthly Limit</label>
                    <input
                      type="text"
                      value={tier.limit}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateSaasTier(index, 'limit', val === 'unlimited' ? 'unlimited' : Number(val) || 0);
                      }}
                      placeholder="100, 1000, unlimited"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tier.popular || false}
                        onChange={(e) => updateSaasTier(index, 'popular', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-900"
                      />
                      <span className="text-sm text-gray-400">Popular badge</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Features (comma separated)</label>
                  <input
                    type="text"
                    value={tier.features}
                    onChange={(e) => updateSaasTier(index, 'features', e.target.value)}
                    placeholder="API access, Email support, Priority support"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addSaasTier}
              className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 hover:text-gray-300"
            >
              + Add Tier
            </button>
          </div>
        )}

        {/* Store Tab Content */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4">
              <p className="text-sm text-gray-400">
                Configure one-off products for your store. Customers pay once, inventory decrements automatically.
              </p>
            </div>

            {storeProducts.map((product, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Product {index + 1}</h3>
                  <button
                    onClick={() => removeStoreProduct(index)}
                    disabled={storeProducts.length <= 1}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Product ID (lowercase)</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateStoreProduct(index, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="product_1, template_pro"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={product.displayName}
                      onChange={(e) => updateStoreProduct(index, 'displayName', e.target.value)}
                      placeholder="My Product"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={product.price}
                      onChange={(e) => updateStoreProduct(index, 'price', Number(e.target.value) || 0)}
                      placeholder="49"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Inventory (blank = unlimited)</label>
                    <input
                      type="number"
                      value={product.inventory ?? ''}
                      onChange={(e) => updateStoreProduct(index, 'inventory', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={product.description}
                    onChange={(e) => updateStoreProduct(index, 'description', e.target.value)}
                    placeholder="What does this product include?"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={product.imageUrl}
                      onChange={(e) => updateStoreProduct(index, 'imageUrl', e.target.value)}
                      placeholder="https://... or upload below"
                      className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                    <label className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer text-sm">
                      {uploadingIndex === index ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, index);
                        }}
                        disabled={uploadingIndex !== null}
                      />
                    </label>
                  </div>
                  {product.imageUrl && (
                    <div className="mt-2">
                      <img src={product.imageUrl} alt="Preview" className="h-20 w-20 object-cover rounded border border-gray-700" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Features/Badges (comma separated)</label>
                  <input
                    type="text"
                    value={product.features}
                    onChange={(e) => updateStoreProduct(index, 'features', e.target.value)}
                    placeholder="Lifetime access, Free updates, Source code"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addStoreProduct}
              className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 hover:text-gray-300"
            >
              + Add Product
            </button>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              loading
                ? 'bg-gray-700 cursor-not-allowed'
                : mode === 'live'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading
              ? 'Creating Products...'
              : mode === 'live'
                ? `Create Live ${activeTab === 'saas' ? 'Subscriptions' : 'Products'} →`
                : `Create Test ${activeTab === 'saas' ? 'Subscriptions' : 'Products'} →`
            }
          </button>
          <p className="text-center text-sm text-gray-500 mt-3">
            This creates {mode} products on your Stripe account and generates {mode} API keys.
          </p>
        </div>
      </main>
    </div>
  );
}
