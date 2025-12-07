/**
 * Credentials Page - dream-api
 *
 * Shows publishableKey + secretKey after successful tier configuration
 * This is the SUCCESS page after /create-products completes
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export default function Credentials() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [_searchParams] = useSearchParams();

  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [products, setProducts] = useState<Array<{ tier: string; priceId: string; productId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'pub' | 'secret' | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const response = await fetch(`${FRONT_AUTH_API}/get-credentials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlatformId(data.platformId);
        setPublishableKey(data.publishableKey);
        setSecretKey(data.secretKey);
        setProducts(data.products || []);
      } else {
        // Credentials not ready yet
        console.error('[Credentials] Failed to load:', await response.text());
      }
    } catch (error) {
      console.error('[Credentials] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'pub' | 'secret') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your credentials...</p>
        </div>
      </div>
    );
  }

  if (!publishableKey || !secretKey) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Credentials Not Found</h2>
          <p className="text-gray-400 mb-6">
            Please complete the tier configuration first.
          </p>
          <button
            onClick={() => navigate('/api-tier-config')}
            className="px-6 py-3 bg-blue-600 rounded font-bold hover:bg-blue-700"
          >
            Go to Tier Config
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">dream-api</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-400 hover:text-blue-300"
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">

          {/* Success Message */}
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-8 mb-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Your API is Ready!</h2>
            <p className="text-gray-300 text-lg">
              Your products are live on Stripe and your API keys are generated.
            </p>
          </div>

          {/* Credentials */}
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h3 className="text-2xl font-bold mb-6">Your API Credentials</h3>

            {/* Publishable Key */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-400">
                  Publishable Key
                </label>
                <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                  Safe to expose
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-900 px-4 py-3 rounded font-mono text-sm text-green-400 overflow-x-auto">
                  {publishableKey}
                </code>
                <button
                  onClick={() => copyToClipboard(publishableKey, 'pub')}
                  className="px-4 py-3 bg-gray-700 rounded hover:bg-gray-600 whitespace-nowrap"
                >
                  {copied === 'pub' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This goes in your end-users' JWT metadata (publicMetadata.publishableKey)
              </p>
            </div>

            {/* Secret Key */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-400">
                  Secret Key
                </label>
                <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                  Server-only
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-900 px-4 py-3 rounded font-mono text-sm text-red-400 overflow-x-auto">
                  {secretKey}
                </code>
                <button
                  onClick={() => copyToClipboard(secretKey, 'secret')}
                  className="px-4 py-3 bg-gray-700 rounded hover:bg-gray-600 whitespace-nowrap"
                >
                  {copied === 'secret' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Keep this secret! Use for API authentication (Authorization: Bearer sk_live_...)
              </p>
            </div>

            {/* Stripe Price IDs */}
            <div className="pt-6 border-t border-gray-700">
              <h4 className="text-lg font-bold mb-3">Your Stripe Products</h4>
              <p className="text-sm text-gray-400 mb-4">
                These are the Stripe Price IDs created on YOUR connected Stripe account. Use these to create checkout sessions.
              </p>
              {products.length > 0 ? (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.priceId} className="bg-gray-900 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-400 uppercase">{product.tier}</span>
                        <span className="text-xs text-gray-500">Product: {product.productId}</span>
                      </div>
                      <code className="block text-xs text-green-400 font-mono">
                        {product.priceId}
                      </code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No products found</p>
              )}
            </div>

            {/* Platform ID (Internal) */}
            <div className="pt-4 border-t border-gray-700 mt-4">
              <label className="text-xs text-gray-500">Platform ID (internal)</label>
              <code className="block bg-gray-900 px-4 py-2 rounded font-mono text-xs text-gray-400 mt-1">
                {platformId}
              </code>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h3 className="text-xl font-bold mb-4">Quick Start</h3>
            <p className="text-gray-400 mb-4">
              Use these keys to integrate dream-api into your application:
            </p>

            <div className="bg-gray-900 p-4 rounded mb-4">
              <p className="text-sm font-bold text-gray-400 mb-2">1. Create a customer</p>
              <pre className="text-sm overflow-x-auto text-green-400">
{`fetch('https://api-multi.k-c-sheffield012376.workers.dev/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SECRET_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    name: 'John Doe',
    plan: 'free'
  })
})`}
              </pre>
            </div>

            <div className="bg-gray-900 p-4 rounded">
              <p className="text-sm font-bold text-gray-400 mb-2">2. Create checkout (upgrade)</p>
              <pre className="text-sm overflow-x-auto text-green-400">
{`fetch('https://api-multi.k-c-sheffield012376.workers.dev/checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SECRET_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user_123',
    tier: 'pro'
  })
})`}
              </pre>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-3">Next Steps</h3>
            <ul className="space-y-2 text-gray-300">
              <li>✅ Your Stripe products are live</li>
              <li>✅ Your API keys are generated</li>
              <li>📝 Integrate the API into your backend</li>
              <li>📊 View your customers in the dashboard</li>
              <li>💰 Start earning revenue!</li>
            </ul>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 w-full px-6 py-3 bg-blue-600 rounded font-bold hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
