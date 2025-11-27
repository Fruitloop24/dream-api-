/**
 * Dashboard - dream-api
 *
 * Shows after user signs up and pays
 * - Connect Stripe button
 * - Configure tiers
 * - Display API key + platformId
 */

import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export default function Dashboard() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [hasPaid, setHasPaid] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [platformId, setPlatformId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect to landing if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  // Check if user has paid (check metadata)
  useEffect(() => {
    if (user?.publicMetadata?.subscribed) {
      setHasPaid(true);
    }
  }, [user]);

  // Load credentials if user has paid
  useEffect(() => {
    if (hasPaid && !platformId) {
      loadCredentials();
    }
  }, [hasPaid, platformId]);

  // Check if Stripe is connected (check URL params after OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'connected') {
      setStripeConnected(true);
    }
    // Check if payment was successful
    if (params.get('payment') === 'success') {
      generateCredentials();
    }
  }, []);

  const loadCredentials = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${FRONT_AUTH_API}/get-credentials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlatformId(data.platformId);
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const generateCredentials = async () => {
    try {
      setLoading(true);
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
      }
    } catch (error) {
      console.error('Failed to generate credentials:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleConnectStripe = () => {
    const oauthUrl = `${import.meta.env.VITE_OAUTH_API_URL}/oauth/stripe/authorize?userId=${user?.id}`;
    window.location.href = oauthUrl;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">dream-api Dashboard</h1>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Welcome, {user?.firstName || 'there'}!
            </h2>
            <p className="text-gray-400">
              {hasPaid ? 'Your API is ready to use.' : 'Subscribe to get your API key.'}
            </p>
          </div>

          {/* Payment Required */}
          {!hasPaid && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold mb-2">Subscribe to Get Started</h3>
              <p className="text-gray-300 mb-4">
                $29/mo - Auth + Billing API for your SaaS
              </p>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
          )}

          {/* API Configuration (after payment) */}
          {hasPaid && (
            <>
              {/* API Credentials */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Your API Credentials</h3>

                {/* Platform ID */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Platform ID</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900 px-4 py-2 rounded font-mono text-sm">
                      {platformId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(platformId)}
                      className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">API Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900 px-4 py-2 rounded font-mono text-sm">
                      {apiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(apiKey)}
                      className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ Keep this secret! Don't commit to git.
                  </p>
                </div>
              </div>

              {/* Stripe Connection */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Connect Your Stripe</h3>
                {stripeConnected ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="text-2xl">✓</span>
                    <span>Stripe Connected</span>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-400 mb-4">
                      Connect your Stripe account to enable billing for your users.
                    </p>
                    <button
                      onClick={handleConnectStripe}
                      className="px-6 py-3 bg-purple-600 rounded font-bold hover:bg-purple-700"
                    >
                      Connect Stripe Account
                    </button>
                  </>
                )}
              </div>

              {/* Tier Configuration (after Stripe connected) */}
              {stripeConnected && (
                <>
                  <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">Configure Your Tiers</h3>
                    <p className="text-gray-400 mb-4">
                      Define your pricing tiers. Products will be created in your Stripe account.
                    </p>

                    {/* Example tier display */}
                    <div className="space-y-3 mb-4">
                      <div className="bg-gray-900 p-4 rounded">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold">Free Tier</h4>
                            <p className="text-sm text-gray-400">$0/mo - 100 requests</p>
                          </div>
                          <span className="text-green-400">✓ Active</span>
                        </div>
                      </div>
                      <div className="bg-gray-900 p-4 rounded opacity-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold">Pro Tier</h4>
                            <p className="text-sm text-gray-400">$29/mo - 10,000 requests</p>
                          </div>
                          <button className="text-sm text-blue-400 hover:text-blue-300">
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      onClick={() => alert('Tier configuration coming soon!')}
                    >
                      + Add Tier
                    </button>
                  </div>

                  {/* Webhook Configuration */}
                  <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">Webhook URL</h3>
                    <p className="text-gray-400 mb-4">
                      Add this webhook URL to your Stripe account to receive payment events.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 px-4 py-2 rounded font-mono text-sm">
                        https://api.dream-api.com/webhook/stripe
                      </code>
                      <button
                        onClick={() => copyToClipboard('https://api.dream-api.com/webhook/stripe')}
                        className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                      >
                        {copied ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This webhook handles subscription events from your Stripe account.
                    </p>
                  </div>
                </>
              )}

              {/* Quick Start */}
              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h3 className="text-xl font-bold mb-4">Quick Start</h3>
                <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto text-green-400">
{`// Track usage
fetch('https://api.dream-api.com/api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'X-User-Id': 'user_123',
    'X-User-Plan': 'free'
  }
})`}
                </pre>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
