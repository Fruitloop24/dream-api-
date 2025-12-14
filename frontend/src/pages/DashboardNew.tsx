/**
 * Dashboard - dream-api
 *
 * Clean, professional dashboard with:
 * - SaaS / Store tabs at top
 * - Test/Live key display side-by-side
 * - All customer data in expandable rows
 * - Metrics, tiers, webhook status
 */

import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';
const API_MULTI = 'https://api-multi.k-c-sheffield012376.workers.dev';

type TabType = 'saas' | 'store';
type ModeType = 'test' | 'live';

interface Credentials {
  platformId: string;
  testPublishableKey: string | null;
  testSecretKey: string | null;
  livePublishableKey: string | null;
  liveSecretKey: string | null;
  testProducts: any[];
  liveProducts: any[];
}

export default function Dashboard() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // Auth state
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [platformIdGenerated, setPlatformIdGenerated] = useState(false);

  // Credentials
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  // Dashboard data (separate for test/live)
  const [testDashboard, setTestDashboard] = useState<any>(null);
  const [liveDashboard, setLiveDashboard] = useState<any>(null);
  const [testProducts, setTestProducts] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('saas');
  const [viewMode, setViewMode] = useState<ModeType>('test');
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceling'>('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (!isSignedIn) navigate('/');
  }, [isSignedIn, navigate]);

  // Generate platformId immediately after login
  useEffect(() => {
    if (user && !platformIdGenerated) {
      generatePlatformId();
    }
  }, [user, platformIdGenerated]);

  // Check payment status and redirect to checkout if needed
  useEffect(() => {
    if (user?.publicMetadata?.plan === 'paid') {
      setHasPaid(true);
    } else if (user && platformIdGenerated && !loading) {
      setLoading(true);
      handlePayment();
    }
  }, [user, platformIdGenerated, loading]);

  // Load credentials once paid
  useEffect(() => {
    if (hasPaid && !credentials) {
      loadCredentials();
    }
  }, [hasPaid, credentials]);

  // Load dashboard data once we have credentials
  useEffect(() => {
    if (credentials) {
      if (credentials.testSecretKey) {
        loadDashboard('test');
        loadProducts('test');
      }
      if (credentials.liveSecretKey) {
        loadDashboard('live');
        loadProducts('live');
      }
      // Default to live view if we have live keys
      if (credentials.liveSecretKey && !credentials.testSecretKey) {
        setViewMode('live');
      }
    }
  }, [credentials]);

  const generatePlatformId = async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/generate-platform-id`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setPlatformIdGenerated(true);
      }
    } catch (err) {
      console.error('[Dashboard] Platform ID error:', err);
    }
  };

  const handlePayment = async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/create-checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('[Dashboard] Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/get-credentials`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials({
          platformId: data.platformId,
          testPublishableKey: data.testPublishableKey,
          testSecretKey: data.testSecretKey,
          livePublishableKey: data.livePublishableKey || data.publishableKey,
          liveSecretKey: data.liveSecretKey || data.secretKey,
          testProducts: data.testProducts || [],
          liveProducts: data.liveProducts || data.products || [],
        });
      }
    } catch (err) {
      console.error('[Dashboard] Credentials error:', err);
    }
  };

  const loadDashboard = async (mode: ModeType) => {
    const sk = mode === 'test' ? credentials?.testSecretKey : credentials?.liveSecretKey;
    if (!sk) return;

    try {
      setLoadingDashboard(true);
      const res = await fetch(`${API_MULTI}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${sk}`,
          'X-Env': mode,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (mode === 'test') setTestDashboard(data);
        else setLiveDashboard(data);
      }
    } catch (err) {
      console.error(`[Dashboard] Load ${mode} error:`, err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadProducts = async (mode: ModeType) => {
    const sk = mode === 'test' ? credentials?.testSecretKey : credentials?.liveSecretKey;
    if (!sk) return;

    try {
      const res = await fetch(`${API_MULTI}/api/products`, {
        headers: {
          'Authorization': `Bearer ${sk}`,
          'X-Env': mode,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (mode === 'test') setTestProducts(data.products || []);
        else setLiveProducts(data.products || []);
      }
    } catch (err) {
      console.error(`[Dashboard] Load ${mode} products error:`, err);
    }
  };

  const handleConnectStripe = () => {
    window.location.href = `${import.meta.env.VITE_OAUTH_API_URL}/authorize?userId=${user?.id}`;
  };

  const handlePromoteToLive = async () => {
    if (promoting) return;
    try {
      setPromoting(true);
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/promote-to-live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) {
        const text = await res.text();
        alert(`Promote failed: ${text}`);
        return;
      }
      // Reload everything
      await loadCredentials();
      setViewMode('live');
    } catch (err) {
      console.error('[Dashboard] Promote error:', err);
      alert('Failed to promote to live');
    } finally {
      setPromoting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Loading states
  if (!isSignedIn) return null;

  if (!hasPaid) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Redirecting to checkout...</h3>
          <p className="text-gray-400">Please wait</p>
        </div>
      </div>
    );
  }

  // No credentials yet - show connect Stripe
  const hasAnyKeys = credentials?.testSecretKey || credentials?.liveSecretKey;

  if (!hasAnyKeys) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'there'}!</h2>
            <p className="text-gray-400">Let's get your API set up.</p>
            {credentials?.platformId && (
              <PlatformIdBadge platformId={credentials.platformId} onCopy={copyToClipboard} />
            )}
          </div>
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Step 1: Connect Your Stripe</h3>
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
        </main>
      </div>
    );
  }

  // Main dashboard
  const dashboard = viewMode === 'test' ? testDashboard : liveDashboard;
  const products = viewMode === 'test' ? testProducts : liveProducts;
  const metrics = dashboard?.metrics || {};
  const customers = dashboard?.customers || [];
  const tiers = dashboard?.tiers || [];
  const webhook = dashboard?.webhook || {};

  // Filter subscriptions (for SaaS tab)
  const subscriptionTiers = tiers.filter((t: any) => {
    const features = typeof t.features === 'string' ? JSON.parse(t.features || '{}') : t.features || {};
    return features.billingMode !== 'one_off';
  });

  // Filter customers
  const filteredCustomers = customers
    .filter((c: any) => {
      if (statusFilter === 'active' && c.canceledAt) return false;
      if (statusFilter === 'canceling' && !c.canceledAt) return false;
      if (search) {
        const hay = `${c.email || ''} ${c.userId || ''}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      }
      return true;
    })
    .sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome + Platform ID */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'there'}!</h2>
          <p className="text-gray-400">Your API is ready. Monitor customers, usage, and billing below.</p>
          {credentials?.platformId && (
            <PlatformIdBadge platformId={credentials.platformId} onCopy={copyToClipboard} />
          )}
        </div>

        {/* Main Tabs: SaaS | Store */}
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

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">View:</span>
            <button
              onClick={() => setViewMode('test')}
              disabled={!credentials?.testSecretKey}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'test'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              } ${!credentials?.testSecretKey ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Test
            </button>
            <button
              onClick={() => setViewMode('live')}
              disabled={!credentials?.liveSecretKey}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'live'
                  ? 'bg-green-500/20 text-green-300 border border-green-500'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              } ${!credentials?.liveSecretKey ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Live
            </button>
            {loadingDashboard && <span className="text-xs text-gray-500">Loading...</span>}
          </div>
        </div>

        {/* API Keys - Always visible */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">API Keys</h3>
            <div className="flex items-center gap-2">
              {credentials?.testSecretKey && !credentials?.liveSecretKey && (
                <button
                  onClick={handlePromoteToLive}
                  disabled={promoting}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold disabled:opacity-50"
                >
                  {promoting ? 'Promoting...' : 'Go Live'}
                </button>
              )}
              <button
                onClick={() => navigate('/api-tier-config')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
              >
                + New Project
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Test Keys */}
            <div className={`p-4 rounded-lg border ${credentials?.testSecretKey ? 'bg-amber-900/10 border-amber-700/50' : 'bg-gray-900 border-gray-800 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Test</span>
                {!credentials?.testSecretKey && <span className="text-xs text-gray-500">Not configured</span>}
              </div>
              {credentials?.testSecretKey ? (
                <>
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 mb-1">Publishable Key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
                        {credentials.testPublishableKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(credentials.testPublishableKey || '')}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Secret Key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
                        {showTestSecret ? credentials.testSecretKey : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowTestSecret(!showTestSecret)}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        {showTestSecret ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(credentials.testSecretKey || '')}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Create test products to get test keys</p>
              )}
            </div>

            {/* Live Keys */}
            <div className={`p-4 rounded-lg border ${credentials?.liveSecretKey ? 'bg-green-900/10 border-green-700/50' : 'bg-gray-900 border-gray-800 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-300">Live</span>
                {!credentials?.liveSecretKey && <span className="text-xs text-gray-500">Not configured</span>}
              </div>
              {credentials?.liveSecretKey ? (
                <>
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 mb-1">Publishable Key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
                        {credentials.livePublishableKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(credentials.livePublishableKey || '')}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Secret Key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
                        {showLiveSecret ? credentials.liveSecretKey : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowLiveSecret(!showLiveSecret)}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        {showLiveSecret ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(credentials.liveSecretKey || '')}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Click "Go Live" to create live keys</p>
              )}
            </div>
          </div>

          {/* Stripe Account Link */}
          {dashboard?.keys?.stripeAccountId && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">Stripe Account:</span>
                <code className="font-mono text-xs text-gray-300">{dashboard.keys.stripeAccountId}</code>
                <a
                  href={`https://dashboard.stripe.com/${viewMode === 'test' ? 'test/' : ''}connect/accounts/${dashboard.keys.stripeAccountId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  Open Stripe Dashboard
                </a>
              </div>
            </div>
          )}
        </div>

        {/* SaaS Tab Content */}
        {activeTab === 'saas' && (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Active Subs" value={metrics.activeSubs || 0} />
              <MetricCard label="Canceling" value={metrics.cancelingSubs || 0} />
              <MetricCard label="MRR" value={`$${((metrics.mrr || 0) / 100).toFixed(2)}`} />
              <MetricCard label="Usage (Period)" value={metrics.usageThisPeriod || 0} />
            </div>

            {/* Tiers */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Subscription Tiers</h3>
                <button
                  onClick={() => navigate('/api-tier-config')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit Tiers
                </button>
              </div>
              {subscriptionTiers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {subscriptionTiers.map((tier: any) => (
                    <div key={tier.name} className="bg-gray-900 rounded p-3 border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{tier.displayName || tier.name}</p>
                        {tier.popular && (
                          <span className="text-xs px-2 py-0.5 bg-blue-600 rounded">Popular</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        ${tier.price}/mo &middot; {tier.limit === 'unlimited' ? 'Unlimited' : `${tier.limit} calls`}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 font-mono truncate">
                        {tier.priceId || 'No priceId'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No subscription tiers configured yet.</p>
              )}
            </div>

            {/* Customers */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Customers</h3>
                <div className="flex items-center gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search email or ID"
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm w-48"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="canceling">Canceling</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Usage</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Renews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c: any) => (
                      <tr
                        key={c.userId}
                        className="border-b border-gray-800 hover:bg-gray-900/50 cursor-pointer"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <td className="py-2 pr-4">{c.email || c.userId}</td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-900/50 border border-blue-700">
                            {c.plan || 'free'}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <UsageBar count={c.usageCount || 0} limit={c.limit} />
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={c.canceledAt ? 'canceling' : c.status || 'active'} />
                        </td>
                        <td className="py-2 pr-4 text-gray-400">
                          {c.currentPeriodEnd ? new Date(c.currentPeriodEnd).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No customers yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Customer Detail Panel */}
              {selectedCustomer && (
                <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onCopy={copyToClipboard} />
              )}
            </div>
          </>
        )}

        {/* Store Tab Content */}
        {activeTab === 'store' && (
          <>
            {/* Store Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Products" value={products.length} />
              <MetricCard label="Sold Out" value={products.filter((p: any) => p.soldOut).length} />
              <MetricCard label="In Stock" value={products.filter((p: any) => !p.soldOut && p.inventory !== null).reduce((sum: number, p: any) => sum + (p.inventory || 0), 0)} />
              <MetricCard label="Total Value" value={`$${products.reduce((sum: number, p: any) => sum + (p.price || 0), 0).toFixed(2)}`} />
            </div>

            {/* Products Grid */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">One-off Products</h3>
                <button
                  onClick={() => navigate('/api-tier-config')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
                >
                  + Add Product
                </button>
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p: any) => (
                    <div key={p.id || p.priceId} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                      {p.imageUrl && (
                        <div className="h-40 w-full bg-gray-800">
                          <img src={p.imageUrl} alt={p.displayName} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{p.displayName || p.name}</h4>
                          {p.soldOut ? (
                            <span className="text-xs px-2 py-0.5 bg-red-900/50 border border-red-700 rounded text-red-200">
                              Sold Out
                            </span>
                          ) : p.inventory !== null ? (
                            <span className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded">
                              {p.inventory} left
                            </span>
                          ) : null}
                        </div>
                        <p className="text-lg font-bold text-green-400 mb-2">${(p.price || 0).toFixed(2)}</p>
                        {p.description && (
                          <p className="text-sm text-gray-400 mb-2 line-clamp-2">{p.description}</p>
                        )}
                        {Array.isArray(p.features) && p.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {p.features.slice(0, 3).map((f: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-blue-900/30 border border-blue-800 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 font-mono mt-2 space-y-1">
                          <div className="truncate">priceId: {p.priceId || 'n/a'}</div>
                          <div className="truncate">productId: {p.productId || p.id || 'n/a'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No one-off products yet</p>
                  <button
                    onClick={() => navigate('/api-tier-config')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
                  >
                    Create Your First Product
                  </button>
                </div>
              )}
            </div>

            {/* Cart Checkout Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <h3 className="text-lg font-bold mb-3">Cart Checkout API</h3>
              <p className="text-sm text-gray-400 mb-3">
                Use these endpoints to build your store:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-900 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">List products</p>
                  <code className="text-sm text-green-400">GET /api/products</code>
                </div>
                <div className="bg-gray-900 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Cart checkout</p>
                  <code className="text-sm text-green-400">POST /api/cart/checkout</code>
                  <pre className="text-xs text-gray-400 mt-2">{`{ "items": [{ "priceId": "...", "quantity": 1 }] }`}</pre>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Webhook Status - Bottom of page */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold mb-3">Webhook Status</h3>
          <div className="bg-gray-900 rounded p-3 mb-3">
            <p className="text-xs text-gray-500 mb-1">Webhook URL (configured automatically)</p>
            <code className="text-sm text-gray-300 break-all">
              {API_MULTI}/webhook/stripe
            </code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last event:</span>
            <span>{webhook.lastEventAt ? new Date(webhook.lastEventAt).toLocaleString() : 'None'}</span>
          </div>
          {(webhook.recent || []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Recent events</p>
              <div className="space-y-1">
                {webhook.recent.slice(0, 5).map((evt: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{evt.type}</span>
                    <span className="text-gray-500">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">dream-api</h1>
        <UserButton />
      </div>
    </header>
  );
}

function PlatformIdBadge({ platformId, onCopy }: { platformId: string; onCopy: (s: string) => void }) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded px-3 py-1">
      <span className="text-xs uppercase text-gray-500">Platform ID</span>
      <span className="font-mono">{platformId}</span>
      <button onClick={() => onCopy(platformId)} className="text-xs text-blue-400 hover:text-blue-300">
        Copy
      </button>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function UsageBar({ count, limit }: { count: number; limit: number | string }) {
  const numericLimit = limit === 'unlimited' ? 100 : Number(limit || 1);
  const pct = Math.min(100, Math.round((count / numericLimit) * 100));
  return (
    <div className="space-y-1">
      <div className="h-2 w-24 bg-gray-800 rounded">
        <div
          className={`h-2 rounded ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">
        {count} / {limit === 'unlimited' ? '∞' : limit}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-900/40 border-green-700 text-green-200',
    canceling: 'bg-yellow-900/40 border-yellow-700 text-yellow-200',
    canceled: 'bg-red-900/40 border-red-700 text-red-200',
    none: 'bg-gray-800 border-gray-700 text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${styles[status] || styles.none}`}>
      {status}
    </span>
  );
}

function CustomerDetail({
  customer,
  onClose,
  onCopy,
}: {
  customer: any;
  onClose: () => void;
  onCopy: (s: string) => void;
}) {
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Customer Details</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <DetailItem label="User ID" value={customer.userId} copyable onCopy={onCopy} />
        <DetailItem label="Email" value={customer.email || '—'} />
        <DetailItem label="Plan" value={customer.plan || 'free'} />
        <DetailItem label="Status" value={customer.canceledAt ? 'Canceling' : customer.status || 'active'} />
        <DetailItem label="Usage" value={`${customer.usageCount || 0} / ${customer.limit || 0}`} />
        <DetailItem label="Period Ends" value={customer.currentPeriodEnd ? new Date(customer.currentPeriodEnd).toLocaleDateString() : '—'} />
        <DetailItem label="Stripe Customer" value={customer.stripeCustomerId || '—'} copyable onCopy={onCopy} />
        <DetailItem label="Subscription ID" value={customer.subscriptionId || '—'} copyable onCopy={onCopy} />
        <DetailItem label="Price ID" value={customer.priceId || '—'} copyable onCopy={onCopy} />
        <DetailItem label="Amount" value={customer.amount ? `$${(customer.amount / 100).toFixed(2)}` : '—'} />
        <DetailItem label="Currency" value={customer.currency?.toUpperCase() || '—'} />
        <DetailItem label="Product ID" value={customer.productId || '—'} copyable onCopy={onCopy} />
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (s: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm text-gray-200 truncate">{value}</p>
        {copyable && value && value !== '—' && onCopy && (
          <button onClick={() => onCopy(value)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
