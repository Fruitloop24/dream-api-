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
  const [_platformId, setPlatformId] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [platformIdGenerated, setPlatformIdGenerated] = useState(false);

  // Redirect to landing if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  // STEP 1: Generate platformId IMMEDIATELY after login (before payment)
  useEffect(() => {
    if (user && !platformIdGenerated) {
      generatePlatformId();
    }
  }, [user, platformIdGenerated]);

  // STEP 2: Free users IMMEDIATELY redirected to Stripe checkout
  // NO UI shown until they've paid
  useEffect(() => {
    if (user?.publicMetadata?.plan === 'paid') {
      setHasPaid(true);
    } else if (user && platformIdGenerated && !loading) {
      // Immediately trigger payment - don't show any UI
      setLoading(true);
      handlePayment();
    }
  }, [user, platformIdGenerated, loading]);

  // Load credentials if user has paid
  useEffect(() => {
    if (hasPaid && !publishableKey) {
      loadCredentials();
    }
  }, [hasPaid, publishableKey]);

  // Check if Stripe is connected (check URL params after OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'connected') {
      setStripeConnected(true);
    }
    // Check if payment was successful - redirect to OAuth
    if (params.get('payment') === 'success') {
      // After payment, user needs to connect Stripe first
      // Don't generate credentials yet
    }
  }, []);

  // Generate platformId (called IMMEDIATELY after login)
  const generatePlatformId = async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const response = await fetch(`${FRONT_AUTH_API}/generate-platform-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Dashboard] Platform ID generated:', data.platformId);
        setPlatformId(data.platformId);
        setPlatformIdGenerated(true);
      } else {
        console.error('[Dashboard] Failed to generate platform ID');
      }
    } catch (error) {
      console.error('[Dashboard] Error generating platform ID:', error);
    }
  };

  // Load credentials (publishableKey + secretKey after tier config)
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
      } else {
        // Keys not generated yet (need to configure tiers first)
        console.log('[Dashboard] Credentials not ready yet');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load credentials:', error);
    }
  };


  const handlePayment = async () => {
    try {
      setLoading(true);
      const token = await getToken({ template: 'dream-api' });
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
    const oauthUrl = `${import.meta.env.VITE_OAUTH_API_URL}/authorize?userId=${user?.id}`;
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

  // If not paid, show ONLY a loading spinner while redirecting to Stripe
  if (!hasPaid) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-bold mb-2">Redirecting to checkout...</h3>
          <p className="text-gray-400">Please wait</p>
        </div>
      </div>
    );
  }

  // PAID DASHBOARD (after subscription)
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

          {/* If not paid, show loading (they're being redirected to Stripe) */}
          {!hasPaid && (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Redirecting to checkout...</h3>
              <p className="text-gray-400">Please wait while we redirect you to Stripe</p>
            </div>
          )}

          {/* API Configuration (after payment) */}
          {hasPaid && (
            <>
              {/* ONLY show "Connect Stripe" if no credentials yet */}
              {!publishableKey && !secretKey && (
                <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-bold mb-4">Next Step: Connect Your Stripe</h3>
                  <p className="text-gray-300 mb-4">
                    Connect your Stripe account so we can create billing products for your users.
                  </p>
                  <button
                    onClick={handleConnectStripe}
                    className="px-6 py-3 bg-purple-600 rounded font-bold hover:bg-purple-700"
                  >
                    Connect Stripe Account
                  </button>
                </div>
              )}

              {/* Show credentials ONLY if they exist (after products created) */}
              {publishableKey && secretKey && (
                <>
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 mb-6">
                    <h3 className="text-2xl font-bold mb-2">🎉 Your API is Ready!</h3>
                    <p className="text-gray-300">
                      Here are your credentials. Keep the secret key safe!
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">Your API Credentials</h3>

                    {/* Publishable Key */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-2">Publishable Key (safe to expose)</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-900 px-4 py-2 rounded font-mono text-sm">
                          {publishableKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(publishableKey)}
                          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                        >
                          {copied ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This goes in your end-users' JWT metadata
                      </p>
                    </div>

                    {/* Secret Key */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Secret Key (server-only!)</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-900 px-4 py-2 rounded font-mono text-sm">
                          {secretKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(secretKey)}
                          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                        >
                          {copied ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ⚠️ Keep this secret! Use for API authentication (Authorization: Bearer sk_live_...)
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Remove the old tier configuration UI from dashboard */}
              {false && stripeConnected && (
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
              {publishableKey && secretKey && (
                <div className="bg-gray-800 rounded-lg p-6 mt-6">
                  <h3 className="text-xl font-bold mb-4">Quick Start</h3>
                  <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto text-green-400">
{`// Create a customer
fetch('https://api.dream-api.com/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${secretKey}',
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
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
