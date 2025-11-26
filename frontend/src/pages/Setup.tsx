/**
 * ============================================================================
 * SETUP PAGE - CONNECT ACCOUNTS
 * ============================================================================
 *
 * Collects tokens from GitHub (OAuth), Stripe (OAuth), Cloudflare (manual), Clerk (manual)
 * Stores in localStorage (will be Worker + KV later)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'https://auth-api.k-c-sheffield012376.workers.dev';

export default function Setup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get or create userId
  const [userId] = useState(() => {
    const urlUserId = searchParams.get('userId');
    const storedUserId = localStorage.getItem('userId');
    const newUserId = urlUserId || storedUserId || crypto.randomUUID();
    localStorage.setItem('userId', newUserId);
    return newUserId;
  });

  const [connected, setConnected] = useState({
    github: false,
    stripe: false,
    cloudflare: false,
    clerk: false,
  });

  const [tokens, setTokens] = useState({
    cloudflare: '',
    cloudflareAccountId: '',
    clerkPublishable: '',
    clerkSecret: '',
  });

  // ============================================================================
  // SECURITY: Create isolated KV namespace for this user
  // ============================================================================
  /**
   * On mount, create a dedicated KV namespace for this user's credentials
   *
   * WHY:
   * - True isolation: Each user gets their own KV namespace
   * - Cloudflare-level security: No code bugs can leak data between users
   * - Easy cleanup: Delete entire namespace after production deploy
   *
   * WHAT GETS STORED:
   * - GitHub, Stripe, Cloudflare, Clerk tokens (SENSITIVE!)
   * - Tier config, branding config
   *
   * CLEANUP:
   * - After production deploy: wrangler kv namespace delete {kvNamespaceId}
   * - Everything gone, guaranteed
   */
  useEffect(() => {
    const createUserKV = async () => {
      try {
        const response = await fetch(`${AUTH_API_URL}/kv/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        const data = await response.json();

        if (data.success) {
          console.log('✓ User KV namespace ready:', data.kvNamespaceId);
        } else {
          console.error('Failed to create KV namespace:', data.error);
        }
      } catch (error) {
        console.error('KV creation error:', error);
      }
    };

    createUserKV();
  }, [userId]);

  // Check OAuth redirect success
  useEffect(() => {
    if (searchParams.get('github') === 'success') {
      setConnected(prev => ({ ...prev, github: true }));
      localStorage.setItem('githubConnected', 'true');
    }
    if (searchParams.get('stripe') === 'success') {
      setConnected(prev => ({ ...prev, stripe: true }));
      localStorage.setItem('stripeConnected', 'true');
    }
  }, [searchParams]);

  // Load saved connection state on mount
  useEffect(() => {
    setConnected({
      github: !!localStorage.getItem('githubConnected'),
      stripe: !!localStorage.getItem('stripeConnected'),
      cloudflare: !!localStorage.getItem('cloudflareConnected'),
      clerk: !!localStorage.getItem('clerkConnected'),
    });
  }, []);

  // GitHub OAuth - handled by auth-api worker
  const handleGitHubConnect = () => {
    window.location.href = `${AUTH_API_URL}/oauth/github/authorize?userId=${userId}`;
  };

  // Stripe OAuth - handled by auth-api worker
  const handleStripeConnect = () => {
    window.location.href = `${AUTH_API_URL}/oauth/stripe/authorize?userId=${userId}`;
  };

  // Cloudflare - manual token paste
  const handleCloudflareSubmit = async () => {
    // Validate both fields
    if (!tokens.cloudflare) {
      alert('Please enter your Cloudflare API token');
      return;
    }
    if (!tokens.cloudflareAccountId) {
      alert('Please enter your Cloudflare Account ID');
      return;
    }

    try {
      // Send to auth-api to store in KV
      const response = await fetch(`${AUTH_API_URL}/tokens/cloudflare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: tokens.cloudflare,
          accountId: tokens.cloudflareAccountId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save Cloudflare token');
      }

      // Mark as connected
      setConnected(prev => ({ ...prev, cloudflare: true }));
      localStorage.setItem('cloudflareConnected', 'true');

      // Clear inputs
      setTokens(prev => ({ ...prev, cloudflare: '', cloudflareAccountId: '' }));
    } catch (error) {
      console.error('Error saving Cloudflare token:', error);
      alert('Failed to save Cloudflare token. Please try again.');
    }
  };

  // Clerk - manual key paste (3 keys needed)
  const handleClerkSubmit = async () => {
    // Validate all 3 fields
    if (!tokens.clerkPublishable.startsWith('pk_')) {
      alert('Invalid Clerk Publishable Key - must start with pk_');
      return;
    }
    if (!tokens.clerkSecret.startsWith('sk_')) {
      alert('Invalid Clerk Secret Key - must start with sk_');
      return;
    }

    try {
      // Send to auth-api to store in KV
      const response = await fetch(`${AUTH_API_URL}/tokens/clerk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          publishableKey: tokens.clerkPublishable,
          secretKey: tokens.clerkSecret
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save Clerk keys');
      }

      // Mark as connected
      setConnected(prev => ({ ...prev, clerk: true }));
      localStorage.setItem('clerkConnected', 'true');

      // Clear inputs
      setTokens(prev => ({ ...prev, clerkPublishable: '', clerkSecret: '' }));
    } catch (error) {
      console.error('Error saving Clerk keys:', error);
      alert('Failed to save Clerk keys. Please try again.');
    }
  };

  const allConnected = connected.github && connected.stripe && connected.cloudflare && connected.clerk;

  const handleNext = () => {
    navigate('/configure');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Connect Your Accounts</h1>
          <p className="text-xl text-slate-600">We need access to deploy your SaaS infrastructure</p>
        </div>

        {/* Progress */}
        <div className="mb-12 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold">Progress:</span>
            <span className="text-slate-900 font-bold">
              {Object.values(connected).filter(Boolean).length} / 4 connected
            </span>
          </div>
        </div>

        {/* Connection Cards */}
        <div className="space-y-6 mb-12">

          {/* 1. GitHub - OAuth */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">1. GitHub</h3>
                <p className="text-slate-600 text-sm">Create repo, push code, set secrets</p>
              </div>
              <button
                onClick={handleGitHubConnect}
                disabled={connected.github}
                className={`px-6 py-2 border-none rounded-lg font-semibold transition-colors cursor-pointer ${
                  connected.github
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {connected.github ? '✓ Connected' : 'Connect GitHub →'}
              </button>
            </div>
            <p className="text-xs text-slate-500">OAuth - automatic authorization</p>
          </div>

          {/* 2. Stripe - OAuth */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">2. Stripe</h3>
                <p className="text-slate-600 text-sm">Create products, prices, webhooks</p>
              </div>
              <button
                onClick={handleStripeConnect}
                disabled={connected.stripe}
                className={`px-6 py-2 border-none rounded-lg font-semibold transition-colors cursor-pointer ${
                  connected.stripe
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {connected.stripe ? '✓ Connected' : 'Connect Stripe →'}
              </button>
            </div>
            <p className="text-xs text-slate-500">OAuth - automatic authorization</p>
          </div>

          {/* 3. Cloudflare - Manual */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900 mb-1">3. Cloudflare API Token</h3>
              <p className="text-slate-600 text-sm mb-3">Deploy Workers + Pages globally</p>
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Generate token in Cloudflare Dashboard →
              </a>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Use "Edit Cloudflare Workers" template. You'll need both API token + Account ID.
            </p>

            {connected.cloudflare ? (
              <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                <p className="text-green-700 font-semibold text-lg">✓ Cloudflare Connected</p>
                <p className="text-green-600 text-sm mt-1">Token and Account ID saved</p>
              </div>
            ) : (
              <>
                {/* API Token */}
                <label className="block mb-4">
                  <span className="text-slate-700 font-semibold mb-2 block">
                    API Token
                  </span>
                  <input
                    type="password"
                    value={tokens.cloudflare}
                    onChange={(e) => setTokens(prev => ({ ...prev, cloudflare: e.target.value }))}
                    placeholder="Paste API token here"
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-lg font-mono text-base focus:border-slate-500 focus:outline-none"
                  />
                </label>

                {/* Account ID */}
                <label className="block mb-4">
                  <span className="text-slate-700 font-semibold mb-2 block">
                    Account ID
                  </span>
                  <input
                    type="text"
                    value={tokens.cloudflareAccountId}
                    onChange={(e) => setTokens(prev => ({ ...prev, cloudflareAccountId: e.target.value }))}
                    placeholder="Found in dashboard URL or sidebar"
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-lg font-mono text-base focus:border-slate-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Look for "Account ID" in right sidebar
                  </p>
                </label>

                <button
                  onClick={handleCloudflareSubmit}
                  disabled={!tokens.cloudflare || !tokens.cloudflareAccountId}
                  className="w-full px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg font-bold text-base transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Save Cloudflare Credentials
                </button>
              </>
            )}
          </div>

          {/* 4. Clerk - Manual (3 keys) */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900 mb-1">4. Clerk Authentication</h3>
              <p className="text-slate-600 text-sm mb-3">Get keys from Clerk Dashboard + setup JWT template</p>
            </div>

            {connected.clerk ? (
              <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                <p className="text-green-700 font-semibold text-lg">✓ Clerk Connected</p>
                <p className="text-green-600 text-sm mt-1">Publishable and Secret keys saved</p>
              </div>
            ) : (
              <>
                {/* Instructions */}
                <div className="mb-4 bg-slate-100 rounded-lg p-4">
                  <p className="text-slate-700 text-sm mb-2 font-semibold">
                    📹 Setup guide (3 min)
                  </p>
                  <ul className="text-slate-600 text-xs space-y-1 list-disc list-inside">
                    <li>Get keys from: Dashboard → API Keys</li>
                    <li>Create JWT template named "pan-api"</li>
                    <li>Add claim: <code className="bg-slate-200 px-1 rounded">plan</code> → <code className="bg-slate-200 px-1 rounded">user.public_metadata.plan</code></li>
                  </ul>
                </div>

                {/* Publishable Key */}
                <label className="block mb-4">
                  <span className="text-slate-700 font-semibold mb-2 block">
                    Publishable Key (starts with pk_)
                  </span>
                  <input
                    type="text"
                    value={tokens.clerkPublishable}
                    onChange={(e) => setTokens(prev => ({ ...prev, clerkPublishable: e.target.value }))}
                    placeholder="pk_test_..."
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-lg font-mono text-base focus:border-slate-500 focus:outline-none"
                  />
                </label>

                {/* Secret Key */}
                <label className="block mb-4">
                  <span className="text-slate-700 font-semibold mb-2 block">
                    Secret Key (starts with sk_)
                  </span>
                  <input
                    type="password"
                    value={tokens.clerkSecret}
                    onChange={(e) => setTokens(prev => ({ ...prev, clerkSecret: e.target.value }))}
                    placeholder="sk_test_..."
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-lg font-mono text-base focus:border-slate-500 focus:outline-none"
                  />
                </label>

                <button
                  onClick={handleClerkSubmit}
                  disabled={!tokens.clerkPublishable || !tokens.clerkSecret}
                  className="w-full px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg font-bold text-base transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Save Keys
                </button>
              </>
            )}
          </div>
        </div>

        {/* Next Button */}
        <div className="text-center mt-12">
          <button
            onClick={handleNext}
            className="px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg font-bold text-lg transition-colors cursor-pointer"
          >
            Next: Configure Pricing →
          </button>
          {!allConnected && (
            <p className="mt-4 text-slate-500 text-sm">⚠️ Some accounts not connected - deployment may fail</p>
          )}
        </div>
      </div>
    </div>
  );
}
