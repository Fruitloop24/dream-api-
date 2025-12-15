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

  const [platformId, setPlatformId] = useState('');
  const [testPublishableKey, setTestPublishableKey] = useState('');
  const [testSecretKey, setTestSecretKey] = useState('');
  const [livePublishableKey, setLivePublishableKey] = useState('');
  const [liveSecretKey, setLiveSecretKey] = useState('');
  const [_testProducts, setTestProducts] = useState<Array<{ tier: string; priceId: string; productId: string }>>([]);
  const [_liveProducts, setLiveProducts] = useState<Array<{ tier: string; priceId: string; productId: string }>>([]);
  const [loading, setLoading] = useState(true);

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
        setTestPublishableKey(data.testPublishableKey || '');
        setTestSecretKey(data.testSecretKey || '');
        setLivePublishableKey(data.livePublishableKey || data.publishableKey || '');
        setLiveSecretKey(data.liveSecretKey || data.secretKey || '');
        setTestProducts(data.testProducts || []);
        setLiveProducts(data.liveProducts || data.products || []);
      } else {
        console.error('[Credentials] Failed to load:', await response.text());
      }
    } catch (error) {
      console.error('[Credentials] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Has any keys?
  const hasTestKeys = testPublishableKey && testSecretKey;
  const hasLiveKeys = livePublishableKey && liveSecretKey;
  const hasAnyKeys = hasTestKeys || hasLiveKeys;

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

  if (!hasAnyKeys) {
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

  // Just redirect to dashboard - it shows everything now
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">dream-api</h1>
            <button
              onClick={() => navigate('/dashboard?setup=complete')}
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
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-3xl font-bold mb-2">Products Created!</h2>
            <p className="text-gray-300 text-lg">
              Your API keys are ready. View them in the dashboard.
            </p>
          </div>

          {/* Keys Summary */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Your API Keys</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Test Keys */}
              {hasTestKeys && (
                <div className="p-4 rounded-lg bg-amber-900/10 border border-amber-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Test</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400">Publishable Key</p>
                      <code className="text-xs font-mono text-gray-300">{testPublishableKey}</code>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Secret Key</p>
                      <code className="text-xs font-mono text-gray-300">{testSecretKey.slice(0, 20)}...</code>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Keys */}
              {hasLiveKeys && (
                <div className="p-4 rounded-lg bg-green-900/10 border border-green-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-300">Live</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400">Publishable Key</p>
                      <code className="text-xs font-mono text-gray-300">{livePublishableKey}</code>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Secret Key</p>
                      <code className="text-xs font-mono text-gray-300">{liveSecretKey.slice(0, 20)}...</code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Platform ID */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">Platform ID</p>
              <code className="text-sm font-mono text-gray-400">{platformId}</code>
            </div>
          </div>

          {/* Go to Dashboard */}
          <div className="text-center">
            <button
              onClick={() => navigate('/dashboard?setup=complete')}
              className="px-8 py-4 bg-blue-600 rounded-lg font-bold text-lg hover:bg-blue-700"
            >
              Go to Dashboard →
            </button>
            <p className="mt-3 text-sm text-gray-500">
              Full keys, products, and API docs available in dashboard
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
