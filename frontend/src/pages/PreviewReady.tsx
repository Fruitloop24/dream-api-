/**
 * Preview Ready - Show preview URL and Subscribe button
 * After completing Setup → Configure → Styling
 */

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useAuth } from '@clerk/clerk-react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export default function PreviewReady() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [previewConfig, setPreviewConfig] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const configJson = localStorage.getItem('previewConfig');
    if (configJson) {
      setPreviewConfig(JSON.parse(configJson));
      // TODO: Call worker to generate real preview URL
      setPreviewUrl(`https://preview-${user?.id?.substring(0, 8)}.dream-api.workers.dev`);
    }
  }, [user]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`${FRONT_AUTH_API}/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">dream-api</h1>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Banner */}
          <div className="bg-green-900 border border-green-700 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🎉</span>
              <div>
                <h2 className="text-2xl font-bold mb-1">Your Preview is Ready!</h2>
                <p className="text-green-200">
                  Check out your working SaaS with auth + billing already configured
                </p>
              </div>
            </div>
          </div>

          {/* Preview Link */}
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h3 className="text-xl font-bold mb-4">Your Preview Site</h3>
            <div className="bg-gray-900 p-4 rounded mb-4">
              <div className="flex items-center gap-3">
                <code className="flex-1 text-blue-400">{previewUrl}</code>
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Open Preview →
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              This is a fully working preview with your branding, tiers, and billing flow.
            </p>
          </div>

          {/* Config Summary */}
          {previewConfig && (
            <div className="bg-gray-800 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-bold mb-4">Your Configuration</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">App Name:</span>
                  <span className="font-bold">{previewConfig.appName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Primary Color:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-600"
                      style={{ backgroundColor: previewConfig.primaryColor }}
                    />
                    <span className="font-mono">{previewConfig.primaryColor}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pricing Tiers:</span>
                  <span className="font-bold">{previewConfig.tiers?.length} tiers</span>
                </div>
              </div>
            </div>
          )}

          {/* Subscribe CTA */}
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 border-2 border-blue-500 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-3">Love It? Get Your Production API</h3>
            <p className="text-blue-200 mb-6">
              Subscribe for $29/mo to get your real API credentials, connect your Stripe, and go live.
            </p>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full px-8 py-4 bg-green-600 rounded-lg font-bold text-xl hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Subscribe Now - $29/mo →'}
            </button>
            <div className="mt-6 grid md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Production API credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Connect your Stripe account</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited API calls</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Your customers pay you directly</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
