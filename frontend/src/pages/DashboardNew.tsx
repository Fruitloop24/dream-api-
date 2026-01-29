/**
 * ============================================================================
 * DASHBOARD - dream-api Developer Dashboard
 * ============================================================================
 *
 * Refactored from 1491 lines to ~200 lines using modular components and hooks.
 * All extracted components are in frontend/src/components/
 * All hooks are in frontend/src/hooks/
 *
 * ============================================================================
 */

import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Hooks
import { useToast, useProjects, useCredentials, useDashboardData, usePayment, usePlatformSubscription } from '@/hooks';

// Layout components
import { Header, ProjectSelector, DeleteConfirmBanner } from '@/components/layout';

// Shared components
import { PlatformIdBadge, Toast } from '@/components/shared';

// Dashboard components
import {
  ApiKeysSection,
  RegenerateConfirm,
  StripeAccountSection,
  WebhookStatus,
  SaasDashboard,
  StoreDashboard,
  TotalsView,
  KeyModal,
} from '@/components/dashboard';

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function Dashboard() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // Hooks
  const { toast, showToast, hideToast } = useToast();
  const { projects, platformId, generatePlatformId, loadProjects, deleteProject, regenerateSecret } = useProjects();
  const { credentials, showSecret, loadCredentials, toggleSecret, getSecretKey } = useCredentials();
  const { dashboard, products, loading: loadingDashboard, loadDashboard, loadProducts, clearDashboard, liveTotals, loadingTotals, loadLiveTotals, deleteCustomer } = useDashboardData();
  const { handlePayment, loading: paymentLoading } = usePayment();
  const { subscription, loading: subscriptionLoading, loadSubscription, openBillingPortal, getStatusDisplay } = usePlatformSubscription();

  // Local state
  const [hasPaid, setHasPaid] = useState(false);
  const [platformIdGenerated, setPlatformIdGenerated] = useState(false);
  const [selectedPk, setSelectedPk] = useState<string | null>(null);
  const [showTotals, setShowTotals] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [keyActionLoading, setKeyActionLoading] = useState(false);
  const [keyModal, setKeyModal] = useState<{ show: boolean; secretKey: string; mode: string }>({ show: false, secretKey: '', mode: '' });
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Derived state
  const selectedProject = projects.find(p => p.publishableKey === selectedPk) || null;

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Clear scoped state on project switch
  useEffect(() => {
    clearDashboard();
  }, [selectedPk, clearDashboard]);

  // Redirect if not signed in
  useEffect(() => {
    if (!isSignedIn) navigate('/');
  }, [isSignedIn, navigate]);

  // Generate platformId immediately after login
  useEffect(() => {
    if (user && !platformIdGenerated) {
      generatePlatformId().then(success => {
        if (success) setPlatformIdGenerated(true);
      });
    }
  }, [user, platformIdGenerated, generatePlatformId]);

  // Check payment status
  useEffect(() => {
    if (user?.publicMetadata?.plan === 'paid') {
      setHasPaid(true);
    } else if (user && platformIdGenerated && !paymentLoading) {
      handlePayment();
    }
  }, [user, platformIdGenerated, paymentLoading, handlePayment]);

  // Load projects + credentials once paid
  useEffect(() => {
    if (hasPaid && projects.length === 0) {
      loadProjects().then(list => {
        if (list.length > 0 && !selectedPk) {
          setSelectedPk(list[0].publishableKey);
        }
      });
      loadCredentials();
    }
  }, [hasPaid, projects.length, selectedPk, loadProjects, loadCredentials]);

  // Load subscription independently (always refresh on mount)
  useEffect(() => {
    if (hasPaid) {
      loadSubscription();
    }
  }, [hasPaid, loadSubscription]);

  // Load dashboard when project selected
  useEffect(() => {
    if (selectedProject) {
      const sk = selectedProject.secretKey || getSecretKey(selectedProject.mode);
      if (sk) {
        loadDashboard(selectedProject, sk);
        if (selectedProject.type === 'store') {
          loadProducts(selectedProject, sk);
        }
      }
    }
  }, [selectedPk, selectedProject, credentials, getSecretKey, loadDashboard, loadProducts]);

  // Load live totals when Totals view is shown
  useEffect(() => {
    if (showTotals && projects.length > 0) {
      const liveProjects = projects.filter(p => p.mode === 'live');
      loadLiveTotals(liveProjects, getSecretKey);
    }
  }, [showTotals, projects, getSecretKey, loadLiveTotals]);

  // Check for newly promoted project (coming from promote flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('promoted') === 'true') {
      const newKeysJson = sessionStorage.getItem('newLiveKeys');
      if (newKeysJson) {
        sessionStorage.removeItem('newLiveKeys');
        const newKeys = JSON.parse(newKeysJson);
        // Show the key modal with the new live keys
        setKeyModal({
          show: true,
          secretKey: newKeys.secretKey,
          mode: 'live',
        });
        // Show success toast - the warning banner will show automatically
        showToast('Project promoted to LIVE! Test data has been cleaned up.', 'success');
        // Reload projects to show the new live project
        loadProjects().then(list => {
          // Select the new live project
          const liveProject = list.find((p: { publishableKey: string }) => p.publishableKey === newKeys.publishableKey);
          if (liveProject) {
            setSelectedPk(liveProject.publishableKey);
          }
        });
      }
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [loadProjects, showToast]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleConnectStripe = async () => {
    const token = await getToken();
    if (!token) {
      showToast('Please sign in to connect Stripe', 'error');
      return;
    }
    // Default to test mode - projects start in test, then promote to live
    window.location.href = `${import.meta.env.VITE_OAUTH_API_URL}/authorize?token=${token}&mode=test`;
  };

  const handleSelectProject = (pk: string) => {
    setSelectedPk(pk);
    setShowTotals(false);
    setShowDeleteConfirm(false);
  };

  const handleRefresh = () => {
    if (selectedProject) {
      const sk = selectedProject.secretKey || getSecretKey(selectedProject.mode);
      if (sk) {
        loadDashboard(selectedProject, sk);
        if (selectedProject.type === 'store') {
          loadProducts(selectedProject, sk);
        }
        showToast('Dashboard refreshed', 'success');
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    setKeyActionLoading(true);
    const result = await deleteProject(selectedProject.name);
    setKeyActionLoading(false);
    if (result.success) {
      setSelectedPk(null);
      setShowDeleteConfirm(false);
      showToast(`"${selectedProject.name}" deleted permanently`, 'success');
    } else {
      showToast(result.error || 'Failed to delete project', 'error');
    }
  };

  const handleRegenerateSecret = async () => {
    if (!selectedProject) return;
    setKeyActionLoading(true);
    const result = await regenerateSecret(selectedProject.publishableKey);
    setKeyActionLoading(false);
    if (result.success && result.secretKey) {
      try { await navigator.clipboard.writeText(result.secretKey); } catch {}
      setShowRegenConfirm(false);
      setKeyModal({ show: true, secretKey: result.secretKey, mode: selectedProject.mode });
      await loadCredentials();
    } else {
      showToast(result.error || 'Failed to regenerate secret', 'error');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!selectedProject) return;
    const sk = selectedProject.secretKey || getSecretKey(selectedProject.mode);
    if (!sk) {
      showToast('No secret key available', 'error');
      return;
    }
    setDeletingCustomer(true);
    const result = await deleteCustomer(selectedProject, sk, customerId);
    setDeletingCustomer(false);
    if (result.success) {
      showToast('Customer deleted', 'success');
      // Refresh dashboard to update customer list
      loadDashboard(selectedProject, sk);
    } else {
      showToast(result.error || 'Failed to delete customer', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // EARLY RETURNS
  // --------------------------------------------------------------------------

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

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header
          subscription={subscription}
          subscriptionLoading={subscriptionLoading}
          statusDisplay={getStatusDisplay()}
          onManageBilling={openBillingPortal}
        />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'there'}!</h2>
            <p className="text-gray-400">Let's get your API set up.</p>
            {platformId && <PlatformIdBadge platformId={platformId} onCopy={copyToClipboard} />}
          </div>
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Step 1: Connect Your Stripe</h3>
            <p className="text-gray-300 mb-4">Connect your Stripe account so we can create billing products for your users.</p>
            <button onClick={handleConnectStripe} className="px-6 py-3 bg-purple-600 rounded font-bold hover:bg-purple-700">
              Connect Stripe Account
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  const metrics = dashboard?.metrics || {};
  const tiers = dashboard?.tiers || [];
  const customers = dashboard?.customers || [];
  const webhook = dashboard?.webhook || {};

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        subscription={subscription}
        subscriptionLoading={subscriptionLoading}
        statusDisplay={getStatusDisplay()}
        onManageBilling={openBillingPortal}
      />
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Welcome, {user?.firstName || 'there'}!</h2>
          <p className="text-gray-400">Your API is ready. Monitor customers, usage, and billing below.</p>
          {platformId && <PlatformIdBadge platformId={platformId} onCopy={copyToClipboard} />}
        </div>

        {/* Project Selector */}
        <ProjectSelector
          projects={projects}
          selectedPk={selectedPk}
          selectedProject={selectedProject}
          showTotals={showTotals}
          loadingDashboard={loadingDashboard}
          onSelectProject={handleSelectProject}
          onToggleTotals={() => setShowTotals(!showTotals)}
          onRefresh={handleRefresh}
          onDeleteClick={() => setShowDeleteConfirm(true)}
        />

        {/* Live Mode Warning Banner - Shows when live project selected */}
        {selectedProject?.mode === 'live' && !showTotals && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4 mb-6 flex items-start gap-3">
            <span className="text-amber-400 text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-amber-200">LIVE MODE - Deployed Domains Only</p>
              <p className="text-sm text-amber-300/80 mt-1">
                Live keys (<code className="bg-amber-900/50 px-1 rounded">pk_live_</code> / <code className="bg-amber-900/50 px-1 rounded">sk_live_</code>) only work on deployed sites (Vercel, CF Pages, Netlify, etc.).
                They will NOT work on localhost due to Clerk security restrictions.
              </p>
              <p className="text-sm text-amber-300/60 mt-2">
                Need to test locally? Create a new TEST project - test mode has no time limits.
              </p>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && selectedProject && (
          <DeleteConfirmBanner
            projectName={selectedProject.name}
            loading={keyActionLoading}
            onConfirm={handleDeleteProject}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {/* Content Area */}
        {showTotals ? (
          <TotalsView
            projects={projects}
            liveMetrics={liveTotals || undefined}
            loading={loadingTotals}
            platformLiveEndUsers={subscription?.liveEndUserCount}
          />
        ) : selectedProject ? (
          <>
            {/* API Keys */}
            {!showRegenConfirm ? (
              <ApiKeysSection
                project={selectedProject}
                projects={projects}
                credentials={credentials}
                showSecret={showSecret}
                onToggleSecret={toggleSecret}
                onCopy={copyToClipboard}
                onRegenerateClick={() => setShowRegenConfirm(true)}
              />
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
                <RegenerateConfirm
                  mode={selectedProject.mode}
                  loading={keyActionLoading}
                  onConfirm={handleRegenerateSecret}
                  onCancel={() => setShowRegenConfirm(false)}
                />
              </div>
            )}

            {/* Stripe Account */}
            <StripeAccountSection
              stripeAccountId={dashboard?.keys?.stripeAccountId}
              onCopy={copyToClipboard}
            />

            {/* Dashboard Content by Type */}
            {selectedProject.type === 'saas' && (
              <SaasDashboard
                project={selectedProject}
                metrics={metrics}
                tiers={tiers}
                customers={customers}
                onCopy={copyToClipboard}
                onDeleteCustomer={handleDeleteCustomer}
                deletingCustomer={deletingCustomer}
              />
            )}

            {selectedProject.type === 'store' && (
              <StoreDashboard
                project={selectedProject}
                metrics={metrics}
                products={products}
                webhook={webhook}
                onCopy={copyToClipboard}
              />
            )}

            {/* Webhook Status */}
            <WebhookStatus webhook={webhook} />
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Select a project to view its dashboard</div>
        )}
      </main>

      {/* Key Modal */}
      {keyModal.show && (
        <KeyModal
          secretKey={keyModal.secretKey}
          mode={keyModal.mode}
          onClose={() => setKeyModal({ show: false, secretKey: '', mode: '' })}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={hideToast} />}
    </div>
  );
}
