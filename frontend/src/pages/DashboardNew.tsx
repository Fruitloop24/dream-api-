/**
 * Dashboard - dream-api
 *
 * - Project selector dropdown (each publishableKey = project)
 * - Shows selected project's data (SaaS or Store based on type)
 * - Test/Live mode toggle
 * - Totals tab for aggregate view across all projects
 */

import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';
const API_MULTI = 'https://api-multi.k-c-sheffield012376.workers.dev';

type ModeType = 'test' | 'live';
type ProjectType = 'saas' | 'store';

interface Project {
  publishableKey: string;
  name: string;
  type: ProjectType;
  mode: ModeType;
  status: string;
  secretKey?: string | null;
}

interface Credentials {
  testSecretKey: string | null;
  liveSecretKey: string | null;
}

export default function Dashboard() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // Auth state
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [platformIdGenerated, setPlatformIdGenerated] = useState(false);
  const [platformId, setPlatformId] = useState<string | null>(null);

  // Projects + credentials
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedPk, setSelectedPk] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({ testSecretKey: null, liveSecretKey: null });

  // Dashboard data for selected project
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // UI state
  const [showTotals, setShowTotals] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceling'>('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Selected project
  const selectedProject = projects.find(p => p.publishableKey === selectedPk) || null;

  // Clear scoped state on project switch
  useEffect(() => {
    setDashboard(null);
    setProducts([]);
    setSelectedCustomer(null);
  }, [selectedPk]);

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

  // Check payment status
  useEffect(() => {
    if (user?.publicMetadata?.plan === 'paid') {
      setHasPaid(true);
    } else if (user && platformIdGenerated && !loading) {
      setLoading(true);
      handlePayment();
    }
  }, [user, platformIdGenerated, loading]);

  // Load projects + credentials once paid
  useEffect(() => {
    if (hasPaid && projects.length === 0) {
      loadProjects();
      loadCredentials();
    }
  }, [hasPaid]);

  // Load dashboard when project selected
  useEffect(() => {
    if (selectedProject) {
      const sk = selectedProject.secretKey || (selectedProject.mode === 'test' ? credentials.testSecretKey : credentials.liveSecretKey);
      if (!sk) {
        console.warn('[Dashboard] No secret key found for selected project; dashboard/products may be stale');
      }
      loadDashboard(selectedProject, sk);
      if (selectedProject.type === 'store') {
        loadProducts(selectedProject, sk);
      }
    }
  }, [selectedPk, selectedProject?.secretKey, credentials]);

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

  const loadProjects = async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('[Dashboard] Projects failed:', res.status);
        return;
      }
      const data = await res.json();
      setPlatformId(data.platformId);
      const list: Project[] = data.projects || [];
      setProjects(list);
      // Auto-select first project
      if (list.length > 0 && !selectedPk) {
        setSelectedPk(list[0].publishableKey);
      }
    } catch (err) {
      console.error('[Dashboard] Projects error:', err);
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
          testSecretKey: data.testSecretKey || null,
          liveSecretKey: data.liveSecretKey || data.secretKey || null,
        });
      }
    } catch (err) {
      console.error('[Dashboard] Credentials error:', err);
    }
  };

const loadDashboard = async (project: Project, sk: string) => {
  try {
    setLoadingDashboard(true);
    const res = await fetch(`${API_MULTI}/api/dashboard`, {
      headers: {
        'Authorization': `Bearer ${sk}`,
        'X-Env': project.mode,
        'X-Publishable-Key': project.publishableKey,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setDashboard(data);
      }
    } catch (err) {
      console.error('[Dashboard] Load error:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

const loadProducts = async (project: Project, sk: string) => {
  try {
    const res = await fetch(`${API_MULTI}/api/products`, {
      headers: {
        'Authorization': `Bearer ${sk}`,
        'X-Env': project.mode,
        'X-Publishable-Key': project.publishableKey,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products || []);
      }
    } catch (err) {
      console.error('[Dashboard] Products error:', err);
    }
  };

  const handleConnectStripe = () => {
    window.location.href = `${import.meta.env.VITE_OAUTH_API_URL}/authorize?userId=${user?.id}`;
  };

  const handlePromoteToLive = async () => {
    if (promoting || !selectedProject) return;
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
        alert(`Promote failed: ${await res.text()}`);
        return;
      }
      await loadProjects();
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

  // No projects yet - show connect Stripe
  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'there'}!</h2>
            <p className="text-gray-400">Let's get your API set up.</p>
            {platformId && <PlatformIdBadge platformId={platformId} onCopy={copyToClipboard} />}
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
  const metrics = dashboard?.metrics || {};
  const customers = dashboard?.customers || [];
  const tiers = dashboard?.tiers || [];
  const webhook = dashboard?.webhook || {};

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
          {platformId && <PlatformIdBadge platformId={platformId} onCopy={copyToClipboard} />}
        </div>

        {/* Project Selector + Actions */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
          {/* Project Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Project:</span>
            <select
              value={selectedPk || ''}
              onChange={(e) => {
                setSelectedPk(e.target.value);
                setShowTotals(false);
              }}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm min-w-[200px]"
            >
              {projects.map((p) => (
                <option key={p.publishableKey} value={p.publishableKey}>
                  {p.name} ({p.type}) - {p.mode}
                </option>
              ))}
            </select>
          </div>

          {/* Type Badge */}
          {selectedProject && (
            <span className={`px-3 py-1 rounded text-sm font-medium ${
              selectedProject.type === 'saas'
                ? 'bg-blue-900/30 border border-blue-700 text-blue-200'
                : 'bg-purple-900/30 border border-purple-700 text-purple-200'
            }`}>
              {selectedProject.type === 'saas' ? 'SaaS' : 'Store'}
            </span>
          )}

          {/* Mode Badge */}
          {selectedProject && (
            <span className={`px-3 py-1 rounded text-sm font-medium ${
              selectedProject.mode === 'test'
                ? 'bg-amber-900/30 border border-amber-700 text-amber-200'
                : 'bg-green-900/30 border border-green-700 text-green-200'
            }`}>
              {selectedProject.mode === 'test' ? 'Test' : 'Live'}
            </span>
          )}

          {/* Totals Toggle */}
          <button
            onClick={() => setShowTotals(!showTotals)}
            className={`ml-auto px-3 py-1.5 rounded text-sm font-medium ${
              showTotals
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            Totals
          </button>

          {/* Actions */}
          <button
            onClick={() => navigate('/api-tier-config')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
          >
            + New Project
          </button>

          {loadingDashboard && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        {/* Totals View */}
        {showTotals ? (
          <TotalsView projects={projects} />
        ) : selectedProject ? (
          <>
            {/* API Keys */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">API Keys</h3>
                <div className="flex items-center gap-2">
                  {selectedProject.mode === 'test' && (
                    <button
                      onClick={handlePromoteToLive}
                      disabled={promoting}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold disabled:opacity-50"
                    >
                      {promoting ? 'Promoting...' : 'Go Live'}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/api-tier-config?edit=true&mode=${selectedProject.mode}&projectType=${selectedProject.type}&pk=${selectedProject.publishableKey}`)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit {selectedProject.type === 'saas' ? 'Tiers' : 'Products'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Publishable Key</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
                      {selectedProject.publishableKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedProject.publishableKey)}
                      className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Secret Key</p>
                  {(() => {
                    const sk = selectedProject.mode === 'test' ? credentials.testSecretKey : credentials.liveSecretKey;
                    return (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-xs font-mono truncate">
                          {showSecret ? (sk || 'Not available') : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => setShowSecret(!showSecret)}
                          className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                        >
                          {showSecret ? 'Hide' : 'Show'}
                        </button>
                        {sk && (
                          <button
                            onClick={() => copyToClipboard(sk)}
                            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* SaaS Content */}
            {selectedProject.type === 'saas' && (
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
                  <h3 className="text-lg font-bold mb-3">Subscription Tiers</h3>
                  {tiers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {tiers.map((tier: any) => (
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No tiers configured yet.</p>
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

                  {selectedCustomer && (
                    <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onCopy={copyToClipboard} />
                  )}
                </div>
              </>
            )}

            {/* Store Content */}
            {selectedProject.type === 'store' && (
              <>
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricCard label="Products" value={products.length} />
                  <MetricCard label="Sold Out" value={products.filter((p: any) => p.soldOut).length} />
                  <MetricCard label="In Stock" value={products.filter((p: any) => !p.soldOut && p.inventory !== null).reduce((sum: number, p: any) => sum + (p.inventory || 0), 0)} />
                  <MetricCard label="Total Value" value={`$${products.reduce((sum: number, p: any) => sum + (p.price || 0), 0).toFixed(2)}`} />
                </div>

                {/* Products Grid */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
                  <h3 className="text-lg font-bold mb-4">Products</h3>
                  {products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((p: any) => (
                        <div key={p.priceId} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                          {p.imageUrl && (
                            <div className="h-40 bg-gray-800">
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
                            <p className="text-lg font-bold text-green-400">${(p.price || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No products yet.</p>
                  )}
                </div>
              </>
            )}

            {/* Webhook Status */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">Webhook Status</h3>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <p className="text-xs text-gray-500 mb-1">Webhook URL</p>
                <code className="text-sm text-gray-300 break-all">{API_MULTI}/webhook/stripe</code>
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
                        <span className="text-gray-500">{evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString() : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select a project to view its dashboard
          </div>
        )}
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

function CustomerDetail({ customer, onClose, onCopy }: { customer: any; onClose: () => void; onCopy: (s: string) => void }) {
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Customer Details</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Close</button>
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
      </div>
    </div>
  );
}

function DetailItem({ label, value, copyable, onCopy }: { label: string; value: string; copyable?: boolean; onCopy?: (s: string) => void }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm text-gray-200 truncate">{value}</p>
        {copyable && value && value !== '—' && onCopy && (
          <button onClick={() => onCopy(value)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Copy</button>
        )}
      </div>
    </div>
  );
}

function TotalsView({ projects }: { projects: Project[] }) {
  // Group by type
  const saasProjects = projects.filter(p => p.type === 'saas');
  const storeProjects = projects.filter(p => p.type === 'store');
  const liveProjects = projects.filter(p => p.mode === 'live');

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Totals Across All Projects</h3>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Projects" value={projects.length} />
        <MetricCard label="SaaS Projects" value={saasProjects.length} />
        <MetricCard label="Store Projects" value={storeProjects.length} />
        <MetricCard label="Live Projects" value={liveProjects.length} />
      </div>

      {/* Projects List */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-lg font-bold mb-4">All Projects</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Mode</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Key</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.publishableKey} className="border-b border-gray-800">
                <td className="py-2 pr-4 font-medium">{p.name}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.type === 'saas' ? 'bg-blue-900/50 text-blue-200' : 'bg-purple-900/50 text-purple-200'
                  }`}>
                    {p.type}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.mode === 'test' ? 'bg-amber-900/50 text-amber-200' : 'bg-green-900/50 text-green-200'
                  }`}>
                    {p.mode}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.status === 'active' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-400 truncate max-w-[200px]">
                  {p.publishableKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
