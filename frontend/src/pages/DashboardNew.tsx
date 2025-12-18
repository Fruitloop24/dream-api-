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
  const [keyActionLoading, setKeyActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [customerPage, setCustomerPage] = useState(0);
  const CUSTOMERS_PER_PAGE = 10;

  // Modal for showing new secret key
  const [keyModal, setKeyModal] = useState<{ show: boolean; secretKey: string; mode: string }>({ show: false, secretKey: '', mode: '' });

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
      loadDashboard(selectedProject, sk || '');
      if (selectedProject.type === 'store') {
        loadProducts(selectedProject, sk || '');
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // DELETE PROJECT - Nukes everything (test + live keys, tiers, data, assets)
  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    setKeyActionLoading(true);
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/projects/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName: selectedProject.name }),
      });
      if (res.ok) {
        // Remove ALL keys for this project from list
        setProjects(prev => prev.filter(p => p.name !== selectedProject.name));
        setSelectedPk(null);
        setShowDeleteConfirm(false);
        alert('Project deleted permanently');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete project');
      }
    } catch (err) {
      console.error('[Dashboard] Delete error:', err);
      alert('Failed to delete project');
    } finally {
      setKeyActionLoading(false);
    }
  };

  // REGENERATE SECRET - New secret key, same publishable key (per-key)
  const handleRegenerateSecret = async () => {
    if (!selectedProject) return;
    const mode = selectedProject.mode;
    setKeyActionLoading(true);
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/projects/regenerate-secret`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publishableKey: selectedProject.publishableKey }),
      });
      if (res.ok) {
        const data = await res.json();
        // Copy to clipboard automatically
        try {
          await navigator.clipboard.writeText(data.secretKey);
        } catch {}
        setShowRegenConfirm(false);
        setKeyModal({ show: true, secretKey: data.secretKey, mode });
        // Reload credentials to get new secret
        await loadCredentials();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to regenerate secret');
      }
    } catch (err) {
      console.error('[Dashboard] Regenerate error:', err);
      alert('Failed to regenerate secret');
    } finally {
      setKeyActionLoading(false);
    }
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

          {/* Delete Project - Top Level */}
          {selectedProject && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 border border-gray-700 hover:border-red-800 rounded transition-colors"
            >
              Delete Project
            </button>
          )}

          {loadingDashboard && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && selectedProject && (
          <div className="mb-4 flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-lg p-4">
            <span className="text-red-300 font-medium">
              Delete "{selectedProject.name}" permanently?
            </span>
            <span className="text-red-400/70 text-sm">
              This removes both Test + Live keys, all customer data, usage, and assets.
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleDeleteProject}
                disabled={keyActionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded font-medium text-sm"
              >
                {keyActionLoading ? 'Deleting...' : 'Yes, Delete Forever'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Totals View */}
        {showTotals ? (
          <TotalsView projects={projects} />
        ) : selectedProject ? (
          <>
            {/* API Keys */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">API Keys</h3>
{/* Only show "Edit & Go Live" if test mode AND no live version exists */}
                {selectedProject.mode === 'test' && !projects.some(p => p.name === selectedProject.name && p.mode === 'live') && (
                  <button
                    onClick={() => navigate(`/api-tier-config?promote=true&mode=test&projectType=${selectedProject.type}&pk=${selectedProject.publishableKey}&projectName=${encodeURIComponent(selectedProject.name)}`)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold"
                  >
                    Edit & Go Live
                  </button>
                )}
                {/* Show badge if already live */}
                {selectedProject.mode === 'test' && projects.some(p => p.name === selectedProject.name && p.mode === 'live') && (
                  <span className="px-3 py-1.5 bg-green-900/30 border border-green-700 rounded text-sm text-green-300">
                    ✓ Live version exists
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

              {/* Key Rotation */}
              <div className="pt-3 border-t border-gray-700">
                {!showRegenConfirm ? (
                  <button
                    onClick={() => setShowRegenConfirm(true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rotate {selectedProject.mode === 'test' ? 'Test' : 'Live'} Secret
                  </button>
                ) : (
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-200 mb-1">Rotate Secret Key</h4>
                        <p className="text-sm text-blue-300/80 mb-3">
                          This generates a new secret key for your <strong>{selectedProject.mode}</strong> environment.
                          Your publishable key stays the same, so your frontend code won't break.
                        </p>
                        <ul className="text-xs text-blue-300/70 mb-3 space-y-1">
                          <li>✓ Publishable key unchanged - frontend keeps working</li>
                          <li>✓ Products & tiers unchanged - no Stripe reconfiguration</li>
                          <li>✓ Customer data preserved - subscriptions continue</li>
                          <li>• Only update: your backend's <code className="bg-blue-900/50 px-1 rounded">SECRET_KEY</code> env var</li>
                        </ul>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleRegenerateSecret}
                            disabled={keyActionLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium text-sm"
                          >
                            {keyActionLoading ? 'Generating...' : 'Generate New Secret'}
                          </button>
                          <button
                            onClick={() => setShowRegenConfirm(false)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Subscription Tiers</h3>
                    <button
                      onClick={() => navigate(`/api-tier-config?edit=true&mode=${selectedProject.mode}&projectType=${selectedProject.type}&pk=${selectedProject.publishableKey}`)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
                    >
                      Edit Tiers
                    </button>
                  </div>
                  {tiers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tiers.map((tier: any) => (
                        <div key={tier.name} className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-lg">{tier.displayName || tier.name}</h4>
                            {tier.popular && (
                              <span className="text-xs px-2 py-1 bg-blue-600 rounded-full font-medium">Popular</span>
                            )}
                          </div>
                          <div className="mb-3">
                            <span className="text-2xl font-bold">${tier.price}</span>
                            <span className="text-gray-400 text-sm">/mo</span>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">
                            {tier.limit === 'unlimited' ? 'Unlimited API calls' : `${tier.limit} API calls/month`}
                          </p>
                          <div className="pt-3 border-t border-gray-800 space-y-1.5">
                            {tier.productId && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-16">Product:</span>
                                <code className="text-xs text-gray-400 font-mono truncate flex-1">{tier.productId}</code>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(tier.productId); }}
                                  className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                            {tier.priceId && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-16">Price:</span>
                                <code className="text-xs text-gray-400 font-mono truncate flex-1">{tier.priceId}</code>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(tier.priceId); }}
                                  className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>
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
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">Customers</h3>
                      <span className="text-sm text-gray-500">({filteredCustomers.length})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCustomerPage(0); }}
                        placeholder="Search email or ID"
                        className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm w-48"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as any); setCustomerPage(0); }}
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
                      {filteredCustomers
                        .slice(customerPage * CUSTOMERS_PER_PAGE, (customerPage + 1) * CUSTOMERS_PER_PAGE)
                        .map((c: any) => (
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

                  {/* Pagination */}
                  {filteredCustomers.length > CUSTOMERS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-4">
                      <span className="text-sm text-gray-500">
                        Showing {customerPage * CUSTOMERS_PER_PAGE + 1}-{Math.min((customerPage + 1) * CUSTOMERS_PER_PAGE, filteredCustomers.length)} of {filteredCustomers.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCustomerPage(p => Math.max(0, p - 1))}
                          disabled={customerPage === 0}
                          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-400">
                          Page {customerPage + 1} of {Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setCustomerPage(p => p + 1)}
                          disabled={(customerPage + 1) * CUSTOMERS_PER_PAGE >= filteredCustomers.length}
                          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedCustomer && (
                    <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onCopy={copyToClipboard} />
                  )}
                </div>
              </>
            )}

            {/* Store Content */}
            {selectedProject.type === 'store' && (
              <>
                {/* Sales Metrics Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <MetricCard label="Total Sales" value={metrics.storeSalesCount || 0} />
                  <MetricCard label="Revenue" value={`$${((metrics.storeTotalRevenue || 0) / 100).toFixed(2)}`} />
                  <MetricCard label="Avg Order" value={metrics.storeSalesCount > 0 ? `$${((metrics.storeTotalRevenue || 0) / metrics.storeSalesCount / 100).toFixed(2)}` : '$0.00'} />
                </div>

                {/* Products Table */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">Products</h3>
                      <span className="text-sm text-gray-500">({products.length})</span>
                    </div>
                    <button
                      onClick={() => navigate(`/api-tier-config?edit=true&mode=${selectedProject.mode}&projectType=store&pk=${selectedProject.publishableKey}`)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
                    >
                      Edit Products
                    </button>
                  </div>

                  {products.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-700">
                            <th className="py-2 pr-4 w-16">Image</th>
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Price</th>
                            <th className="py-2 pr-4">Price ID</th>
                            <th className="py-2 pr-4">Product ID</th>
                            <th className="py-2 pr-4 text-right">Stock</th>
                            <th className="py-2 pr-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p: any) => (
                            <tr key={p.priceId} className="border-b border-gray-800 hover:bg-gray-900/50">
                              <td className="py-3 pr-4">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.displayName} className="w-12 h-12 object-cover rounded" />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-4 font-medium">{p.displayName || p.name}</td>
                              <td className="py-3 pr-4">
                                <span className="text-green-400 font-bold">${(p.price || 0).toFixed(2)}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-1">
                                  <code className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{p.priceId}</code>
                                  <button
                                    onClick={() => copyToClipboard(p.priceId)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-1">
                                  <code className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{p.productId}</code>
                                  <button
                                    onClick={() => copyToClipboard(p.productId)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {p.inventory !== null ? (
                                  <span className={`font-mono ${p.inventory <= 5 ? 'text-amber-400' : 'text-gray-300'}`}>
                                    {p.inventory}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">∞</span>
                                )}
                              </td>
                              <td className="py-3 pr-4">
                                {p.soldOut ? (
                                  <span className="px-2 py-1 text-xs bg-red-900/50 border border-red-700 rounded text-red-200">
                                    Sold Out
                                  </span>
                                ) : p.inventory !== null && p.inventory <= 5 ? (
                                  <span className="px-2 py-1 text-xs bg-amber-900/50 border border-amber-700 rounded text-amber-200">
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs bg-green-900/50 border border-green-700 rounded text-green-200">
                                    In Stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No products yet.</p>
                  )}
                </div>

                {/* Orders / Customers */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">Orders</h3>
                      <span className="text-sm text-gray-500">
                        ({(webhook.recent || []).filter((e: any) => e.type === 'checkout.session.completed' && e.payload?.data?.object?.mode === 'payment').length})
                      </span>
                    </div>
                  </div>

                  {(webhook.recent || []).filter((e: any) => e.type === 'checkout.session.completed' && e.payload?.data?.object?.mode === 'payment').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-700">
                            <th className="py-2 pr-4">Customer</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Payment ID</th>
                            <th className="py-2 pr-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(webhook.recent || [])
                            .filter((e: any) => e.type === 'checkout.session.completed' && e.payload?.data?.object?.mode === 'payment')
                            .slice(0, 15)
                            .map((evt: any, i: number) => {
                              const session = evt.payload?.data?.object || {};
                              const customerDetails = session.customer_details || {};
                              const name = customerDetails.name || '—';
                              const email = session.customer_email || customerDetails.email || 'Guest';
                              const paymentIntent = session.payment_intent || session.id || '—';
                              return (
                                <tr key={i} className="border-b border-gray-800 hover:bg-gray-900/50">
                                  <td className="py-3 pr-4 font-medium">{name}</td>
                                  <td className="py-3 pr-4">
                                    <span className="text-blue-400">{email}</span>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <span className="text-green-400 font-bold">${((session.amount_total || 0) / 100).toFixed(2)}</span>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-1">
                                      <code className="text-xs text-gray-400 font-mono truncate max-w-[100px]">
                                        {typeof paymentIntent === 'string' ? paymentIntent.slice(-8) : '—'}
                                      </code>
                                      {typeof paymentIntent === 'string' && (
                                        <button
                                          onClick={() => copyToClipboard(paymentIntent)}
                                          className="text-xs text-blue-400 hover:text-blue-300"
                                        >
                                          Copy
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-gray-400">
                                    {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-gray-500">No orders yet</p>
                      <p className="text-gray-600 text-sm mt-1">Orders will appear here after customers complete checkout</p>
                    </div>
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

      {/* New Secret Key Modal */}
      {keyModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-lg w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">New {keyModal.mode.toUpperCase()} Secret Key</h3>
                  <p className="text-sm text-gray-400">Copied to clipboard</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">Your new secret key:</p>
                <code className="text-sm text-green-400 font-mono break-all select-all">{keyModal.secretKey}</code>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-200 font-medium mb-2">What to update:</p>
                <ul className="text-sm text-blue-300/80 space-y-1">
                  <li>• Your server's <code className="bg-blue-900/50 px-1 rounded">SECRET_KEY</code> environment variable</li>
                  <li>• Any backend code that calls the dream-api</li>
                </ul>
                <p className="text-xs text-blue-400 mt-3">
                  Your publishable key and frontend code remain unchanged.
                </p>
              </div>

              <button
                onClick={() => setKeyModal({ show: false, secretKey: '', mode: '' })}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
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
