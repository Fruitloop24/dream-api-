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
  const [_platformId, setPlatformId] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [platformIdGenerated, setPlatformIdGenerated] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceling'>('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [productsByMode, setProductsByMode] = useState<{ test?: any[]; live?: any[] }>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [testPublishableKey, setTestPublishableKey] = useState('');
  const [testSecretKey, setTestSecretKey] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [dashboardByMode, setDashboardByMode] = useState<{ test?: any; live?: any }>({});

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
    if (hasPaid && (!publishableKey && !testPublishableKey)) {
      loadCredentials();
    }
  }, [hasPaid, publishableKey, testPublishableKey]);

  useEffect(() => {
    if (hasPaid && (secretKey || testSecretKey)) {
      const modesToLoad: Array<'test' | 'live'> = [];
      if (testSecretKey) modesToLoad.push('test');
      if (secretKey) modesToLoad.push('live');
      modesToLoad.forEach((m) => {
        loadDashboard(m);
        loadProducts(m);
      });
      if (mode === 'test' && !testSecretKey && secretKey) setMode('live');
    }
  }, [hasPaid, secretKey, testSecretKey]);

  // Check if Stripe is connected (check URL params after OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
        setTestPublishableKey(data.testPublishableKey || '');
        setTestSecretKey(data.testSecretKey || '');
        if (data.publishableKey) setMode('live');
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

  const loadProducts = async (whichMode: 'test' | 'live' = mode) => {
    try {
      setLoadingProducts(true);
      const selectedSecret = whichMode === 'test' ? (testSecretKey || secretKey) : (secretKey || testSecretKey);
      if (!selectedSecret) {
        setLoadingProducts(false);
        return;
      }
      const response = await fetch('https://api-multi.k-c-sheffield012376.workers.dev/api/products', {
        headers: {
          'Authorization': `Bearer ${selectedSecret}`,
          'X-Env': whichMode,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProductsByMode((prev) => ({ ...prev, [whichMode]: data.products || [] }));
      } else {
        console.error('Failed to load products');
      }
    } catch (error) {
      console.error('Products load error:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadDashboard = async (whichMode: 'test' | 'live' = mode) => {
    try {
      setLoadingDashboard(true);
      const selectedSecret = whichMode === 'test' ? (testSecretKey || secretKey) : (secretKey || testSecretKey);
      if (!selectedSecret) {
        setLoadingDashboard(false);
        return;
      }
      const response = await fetch('https://api-multi.k-c-sheffield012376.workers.dev/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${selectedSecret}`,
          'X-Env': whichMode,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardByMode((prev) => ({ ...prev, [whichMode]: data }));
      } else {
        console.error('Failed to load dashboard');
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handlePromoteToLive = async () => {
    if (promoting) return;
    try {
      setPromoting(true);
      const token = await getToken({ template: 'dream-api' });
      const response = await fetch(`${FRONT_AUTH_API}/promote-to-live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!response.ok) {
        const text = await response.text();
        alert(`Promote failed: ${text}`);
        return;
      }
      const data = await response.json();
      setPublishableKey(data.publishableKey || publishableKey);
      setSecretKey(data.secretKey || secretKey);
      setMode('live');
      await loadCredentials();
      await loadDashboard();
      await loadProducts();
    } catch (err) {
      console.error('Promote-to-live error', err);
      alert('Failed to promote to live');
    } finally {
      setPromoting(false);
    }
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
  const currentDashboard = dashboardByMode[mode] || {};
  const metrics = currentDashboard?.metrics || {};
  const customers = currentDashboard?.customers || [];
  const tiers = currentDashboard?.tiers || [];
  const keys = currentDashboard?.keys || {};
  const webhook = currentDashboard?.webhook || {};
  const platformId = keys.platformId || _platformId;
  const products = productsByMode[mode] || [];

  const activeSubs = metrics.activeSubs || 0;
  const cancelingSubs = metrics.cancelingSubs || 0;
  const mrr = metrics.mrr || 0;
  const usageTotal = metrics.usageThisPeriod || 0;
  const displayPublishable =
    mode === 'test'
      ? (testPublishableKey || keys.publishableKey || publishableKey)
      : (publishableKey || keys.publishableKey || testPublishableKey);
  const displaySecret =
    mode === 'test'
      ? (testSecretKey || keys.secretKey || secretKey)
      : (secretKey || keys.secretKey || testSecretKey);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderUsageBar = (count: number, limit: number | string) => {
    const numericLimit = limit === 'unlimited' ? 100 : Number(limit || 1);
    const pct = Math.min(100, Math.round((count / numericLimit) * 100));
    return (
      <div className="space-y-1">
        <div className="h-2 w-full bg-gray-800 rounded">
          <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400">{count} / {limit === 'unlimited' ? '∞' : limit}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">dream-api Dashboard</h1>
          <UserButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'there'}!</h2>
          <p className="text-gray-400">Your API is ready. Monitor customers, usage, and billing below.</p>
          {platformId && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded px-3 py-1">
              <span className="text-xs uppercase text-gray-500">Platform ID</span>
              <span className="font-mono">{platformId}</span>
              <button
                onClick={() => copyToClipboard(platformId)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {!publishableKey && !secretKey && (
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Next Step: Connect Your Stripe</h3>
            <p className="text-gray-300 mb-4">Connect your Stripe account so we can create billing products for your users.</p>
            <button
              onClick={handleConnectStripe}
              className="px-6 py-3 bg-purple-600 rounded font-bold hover:bg-purple-700"
            >
              Connect Stripe Account
            </button>
          </div>
        )}

        {publishableKey && secretKey && (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Active Subs" value={activeSubs} />
              <MetricCard label="Canceling" value={cancelingSubs} />
              <MetricCard label="MRR" value={`$${(mrr / 100).toFixed(2)}`} />
              <MetricCard label="Usage This Period" value={usageTotal} />
            </div>

            {/* Keys & tiers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">Keys</h3>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => {
                        setMode('test');
                        loadDashboard('test');
                        loadProducts('test');
                      }}
                      className={`px-2 py-1 rounded border ${
                        mode === 'test' ? 'bg-amber-200 text-amber-900 border-amber-400' : 'bg-gray-900 text-gray-300 border-gray-700'
                      }`}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => {
                        setMode('live');
                        loadDashboard('live');
                        loadProducts('live');
                      }}
                      className={`px-2 py-1 rounded border ${
                        mode === 'live' ? 'bg-green-200 text-green-900 border-green-400' : 'bg-gray-900 text-gray-300 border-gray-700'
                      }`}
                    >
                      Live
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Publishable Key</p>
                <code className="block bg-gray-900 p-2 rounded text-sm break-all mb-2">
                  {displayPublishable || '—'}
                </code>
                <p className="text-sm text-gray-400 mb-1">Secret Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-900 p-2 rounded text-sm break-all">
                    {showSecret
                      ? (displaySecret || keys.secretKeyMasked || '********')
                      : '********'}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600"
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">All API Keys</p>
                  <div className="space-y-1">
                    {(keys.apiKeys || []).map((k: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-900 px-2 py-1 rounded text-xs text-gray-300">
                        <div className="flex flex-col">
                          <span className="truncate">{k.publishableKey}</span>
                          <span className="text-gray-500">Primary key</span>
                        </div>
                        <span className="text-gray-500 ml-2">{k.createdAt ? new Date(k.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                    {(keys.apiKeys || []).length === 0 && (
                      <div className="text-xs text-gray-500">No keys yet.</div>
                    )}
                  </div>
                <div className="mt-3">
                  {mode === 'test' && (
                    <button
                      className="px-4 py-2 bg-amber-500 text-white rounded font-semibold mr-2 disabled:opacity-60"
                      onClick={handlePromoteToLive}
                      disabled={promoting || !testSecretKey}
                    >
                      {promoting ? 'Promoting...' : 'Promote Test → Live'}
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
                    onClick={() => navigate('/api-tier-config')}
                  >
                    Create New Project (New Key + Products)
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Generate a fresh key by configuring products (subscription or one-off).
                    </p>
                  </div>
                </div>
                {keys.stripeAccountId && (
                  <div className="mt-3 text-sm text-gray-300">
                    <p className="text-xs text-gray-400 mb-1">Stripe account</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{keys.stripeAccountId}</span>
                      <a
                        className="text-blue-400 text-xs hover:text-blue-300"
                        href={`https://dashboard.stripe.com/test/connect/accounts/${keys.stripeAccountId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 lg:col-span-2">
                <h3 className="text-lg font-bold mb-3">Tiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tiers.map((tier: any) => (
                    <div key={tier.name} className="bg-gray-900 rounded p-3 border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{tier.displayName || tier.name}</p>
                          <p className="text-xs text-gray-400">${tier.price}/mo · Limit {tier.limit === 'unlimited' ? '∞' : tier.limit}</p>
                        </div>
                        {tier.popular && <span className="text-xs px-2 py-1 bg-blue-600 rounded">Popular</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">priceId: {tier.priceId || 'n/a'}</p>
                    </div>
                  ))}
                  {tiers.length === 0 && <p className="text-sm text-gray-500">No tiers configured.</p>}
                </div>
              </div>
            </div>

            {/* One-off products (store/cart) */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">One-off products (store/cart)</h3>
                {loadingProducts && <span className="text-xs text-gray-400">Loading...</span>}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                Use <code className="bg-gray-900 px-1 py-0.5 rounded text-xs text-gray-200">/api/products</code> to render your catalog, and <code className="bg-gray-900 px-1 py-0.5 rounded text-xs text-gray-200">/api/cart/checkout</code> for cart checkout. Images can be uploaded via the assets endpoint.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((p: any) => (
                  <div key={p.id || p.key} className="bg-gray-900 border border-gray-800 rounded p-3">
                    {p.imageUrl && (
                      <div className="h-32 w-full mb-3 overflow-hidden rounded bg-gray-800">
                        <img src={p.imageUrl} alt={p.displayName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-100">{p.displayName || p.name}</p>
                        <p className="text-sm text-gray-400">${p.price?.toFixed(2) ?? '0.00'}</p>
                      </div>
                      {p.soldOut ? (
                        <span className="text-xs px-2 py-1 bg-red-900/60 border border-red-800 rounded text-red-100">
                          Sold out
                        </span>
                      ) : p.inventory !== null ? (
                        <span className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-gray-200">
                          {p.inventory} left
                        </span>
                      ) : null}
                    </div>
                    {p.description && <p className="text-xs text-gray-400 mt-2 line-clamp-3">{p.description}</p>}
                    {Array.isArray(p.features) && p.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.features.map((f: string, idx: number) => (
                          <span key={idx} className="text-[11px] px-2 py-1 bg-blue-900/40 border border-blue-800 rounded text-blue-100">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 text-[11px] text-gray-500 space-y-1">
                      <div>priceId: {p.priceId || 'n/a'}</div>
                      <div>productId: {p.productId || p.id || 'n/a'}</div>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="text-sm text-gray-500 bg-gray-900 border border-gray-800 rounded p-3">
                    No one-off products yet. Configure with one-off mode in Tier Config and reload.
                  </div>
                )}
              </div>
            </div>

            {/* Customers */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Customers</h3>
                <div className="flex items-center gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search email"
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-sm text-gray-200"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-sm text-gray-200"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="canceling">Canceling</option>
                  </select>
                  {loadingDashboard && <span className="text-xs text-gray-400">Loading...</span>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Usage</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Renews/Cancels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c: any) => (
                      <tr
                        key={c.userId}
                        className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <td className="py-2 pr-4 text-gray-100">{c.email || c.userId}</td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-1 text-xs rounded bg-blue-900/50 border border-blue-700">
                            {c.plan || 'free'}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {renderUsageBar(c.usageCount || 0, c.limit ?? 0)}
                        </td>
                        <td className="py-2 pr-4 text-gray-200">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              c.canceledAt
                                ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-200'
                                : (c.status || 'active') === 'active'
                                  ? 'bg-green-900/40 border border-green-700 text-green-100'
                                  : 'bg-gray-800 border border-gray-700 text-gray-200'
                            }`}
                          >
                            {c.canceledAt ? 'Canceling' : c.status || 'active'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-300">
                          {c.currentPeriodEnd ? new Date(c.currentPeriodEnd).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">No customers yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {selectedCustomer && (
                <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-4 text-sm text-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500">User ID</p>
                      <p className="font-mono text-xs">{selectedCustomer.userId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-blue-400 hover:text-blue-300"
                        onClick={() => copyToClipboard(selectedCustomer.userId)}
                      >
                        Copy ID
                      </button>
                      <button
                        className="text-xs text-gray-400 hover:text-gray-200"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <DetailItem label="Email" value={selectedCustomer.email || '—'} />
                    <DetailItem label="Plan" value={selectedCustomer.plan || 'free'} />
                    <DetailItem label="Status" value={selectedCustomer.canceledAt ? 'Canceling' : selectedCustomer.status || 'active'} />
                    <DetailItem label="Usage" value={`${selectedCustomer.usageCount || 0} / ${selectedCustomer.limit || 0}`} />
                    <DetailItem label="Renews/Cancels" value={selectedCustomer.currentPeriodEnd ? new Date(selectedCustomer.currentPeriodEnd).toLocaleDateString() : '—'} />
                    <DetailItem label="Stripe Customer" value={selectedCustomer.stripeCustomerId || selectedCustomer.customerId || '—'} />
                    <DetailItem label="Subscription ID" value={selectedCustomer.subscriptionId || '—'} />
                    <DetailItem label="Price ID" value={selectedCustomer.priceId || '—'} />
                    <DetailItem label="Amount" value={selectedCustomer.amount ? `$${(selectedCustomer.amount / 100).toFixed(2)}` : '—'} />
                  </div>
                </div>
              )}
            </div>

            {/* Webhook health */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-2">Webhook</h3>
              <p className="text-sm text-gray-400 mb-2">Stripe webhook URL</p>
              <code className="block bg-gray-900 p-2 rounded text-sm break-all">
                https://api-multi.k-c-sheffield012376.workers.dev/webhook/stripe
              </code>
              <p className="text-xs text-gray-500 mt-2">Monitor events and keep this URL configured in your Stripe dashboard.</p>
              <div className="mt-3 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last event</span>
                  <span>{webhook.lastEventAt ? new Date(webhook.lastEventAt).toLocaleString() : '—'}</span>
                </div>
                <div className="mt-2">
                  <p className="text-gray-400 text-xs mb-1">Recent events</p>
                  <ul className="space-y-1">
                    {(webhook.recent || []).map((evt: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between text-xs text-gray-300">
                        <span>{evt.type || 'event'}</span>
                        <span className="text-gray-500">{evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString() : ''}</span>
                      </li>
                    ))}
                    {(webhook.recent || []).length === 0 && (
                      <li className="text-gray-500 text-xs">No events yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-200 break-words">{value}</p>
    </div>
  );
}
