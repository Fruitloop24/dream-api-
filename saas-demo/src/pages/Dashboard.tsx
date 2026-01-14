/**
 * DASHBOARD - Protected user dashboard
 *
 * Uses shared config from src/config.ts
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDreamAPI } from '../hooks/useDreamAPI';
import { getAccentClasses, getThemeClasses } from '../config';
import Nav from '../components/Nav';

interface UsageData {
  usageCount: number;
  limit: number | string;
  remaining: number | string;
  plan: string;
}

export default function Dashboard() {
  const { api, isReady, user, refreshUser } = useDreamAPI();
  const navigate = useNavigate();

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const successHandled = useRef(false);

  const accent = getAccentClasses();
  const theme = getThemeClasses();
  const plan = user?.plan || 'free';

  const fetchUsage = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await api.usage.check();
      setUsage({
        usageCount: data.usageCount || 0,
        limit: data.limit || 'unlimited',
        remaining: data.remaining || 'unlimited',
        plan: data.plan || 'free',
      });
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  }, [api, isReady]);

  // Demo: Track usage when button clicked
  const handleTrackUsage = async () => {
    if (!isReady) return;
    setLoading(true);
    setMessage('');

    try {
      const result = await api.usage.track();
      if (result.success) {
        setMessage('Usage tracked successfully!');
        await fetchUsage();
      } else {
        setMessage('Usage limit reached. Please upgrade.');
      }
    } catch (error: any) {
      if (error.message?.includes('limit')) {
        setMessage('Usage limit reached. Please upgrade.');
      } else {
        setMessage(error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle success redirect from Stripe (only once)
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true' && !successHandled.current) {
      successHandled.current = true;
      setMessage('Upgrade successful!');
      window.history.replaceState({}, '', '/dashboard');
      const refresh = async () => {
        await refreshUser();
        await fetchUsage();
        setTimeout(() => setMessage(''), 3000);
      };
      setTimeout(refresh, 1500);
    }
  }, [searchParams, refreshUser, fetchUsage]);

  // Initial usage fetch
  useEffect(() => {
    if (isReady && !successHandled.current) {
      fetchUsage();
    }
  }, [isReady, fetchUsage]);

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      {/* Shared Nav with profile dropdown */}
      <Nav />

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-light ${theme.heading} mb-1`}>Dashboard</h1>
            <p className={theme.body}>Welcome back, {user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/choose-plan')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${theme.buttonSecondary} transition-colors`}
            >
              {plan === 'free' ? 'Upgrade' : 'Change Plan'}
            </button>
            {plan !== 'free' && (
              <button
                onClick={async () => {
                  try {
                    const result = await api.billing.openPortal({ returnUrl: window.location.href });
                    if (result.url) window.location.href = result.url;
                  } catch (e) {
                    console.error('Billing portal error:', e);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${theme.buttonSecondary} transition-colors`}
              >
                Billing
              </button>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.includes('limit') || message.includes('wrong')
              ? 'bg-red-950/50 border border-red-900 text-red-400'
              : 'bg-emerald-950/50 border border-emerald-900 text-emerald-400'
          }`}>
            {message}
          </div>
        )}

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Usage Card */}
          <div className={`${theme.cardBg} rounded-xl p-6`}>
            <h2 className={`text-xs ${theme.muted} font-medium uppercase tracking-wider mb-4`}>Usage This Month</h2>
            {usage ? (
              <>
                <div className={`text-3xl font-light ${theme.heading} mb-2`}>
                  {usage.usageCount}
                  {usage.limit !== 'unlimited' && (
                    <span className={`${theme.body} text-lg`}> / {usage.limit}</span>
                  )}
                </div>
                {usage.limit !== 'unlimited' && (
                  <div className={`w-full ${theme.progressBg} rounded-full h-2 mb-4`}>
                    <div
                      className={`h-2 rounded-full transition-all ${accent.bg}`}
                      style={{
                        width: `${Math.min((usage.usageCount / Number(usage.limit)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`${theme.body} text-sm`}>Plan:</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${accent.bg} text-white`}>
                    {plan.toUpperCase()}
                  </span>
                </div>
              </>
            ) : (
              <div className={theme.body}>Loading...</div>
            )}
          </div>

          {/* ================================================================
              YOUR PRODUCT GOES HERE
              ================================================================

              Replace this entire card with your product's main feature.

              KEEP THIS PATTERN:
              1. User does something (generates PDF, runs AI, processes file)
              2. You call: await api.usage.track()
              3. That's it - limits are enforced automatically

              EXAMPLE - PDF Generator:
              ----------------------------------------------------------------
              <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('https://your-api.com/generate', { ... });
                if (res.ok) {
                  await api.usage.track();  // <-- THIS IS THE MAGIC LINE
                  // Show download link, success message, etc.
                }
              }}>
                <input type="file" />
                <button>Generate PDF</button>
              </form>
              ----------------------------------------------------------------

              The handleTrackUsage function below is just a demo.
              Delete it and add your own product logic.
              ================================================================ */}
          <div className={`${theme.cardBg} rounded-xl p-6`}>
            <h2 className={`text-xs ${theme.muted} font-medium uppercase tracking-wider mb-4`}>Demo Action</h2>
            <p className={`${theme.body} text-sm mb-4`}>
              Replace this with your product's main action. Each click tracks usage.
            </p>
            <button
              onClick={handleTrackUsage}
              disabled={loading || !isReady}
              className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${
                loading || !isReady
                  ? `${theme.buttonDisabled} cursor-not-allowed`
                  : `${accent.bg} text-white ${accent.bgHover}`
              }`}
            >
              {loading ? 'Processing...' : 'Track Usage'}
            </button>
          </div>
        </div>

        {/* Upgrade CTA */}
        {plan === 'free' && (
          <div className={`mt-8 ${theme.cardBg} rounded-xl p-6 text-center`}>
            <h3 className={`text-lg font-medium ${theme.heading} mb-2`}>Upgrade Your Plan</h3>
            <p className={`${theme.body} text-sm mb-4`}>
              Remove limits and unlock all features
            </p>
            <button
              onClick={() => navigate('/choose-plan')}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg ${accent.bg} text-white ${accent.bgHover} transition-colors`}
            >
              View Plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
