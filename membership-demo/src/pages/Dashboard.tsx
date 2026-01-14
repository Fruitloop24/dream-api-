/**
 * MEMBERSHIP DASHBOARD - Member content area
 *
 * Flow:
 * - Free users: Auto-redirect to Stripe checkout (4-day trial)
 * - Paid users: Show member content + Manage Billing
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDreamAPI, dreamAPI } from '../hooks/useDreamAPI';
import { CONFIG, getAccentClasses, getThemeClasses } from '../config';
import Nav from '../components/Nav';
import Icon from '../components/Icons';

export default function Dashboard() {
  const { api, isReady, user, refreshUser } = useDreamAPI();
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const successHandled = useRef(false);
  const checkoutStarted = useRef(false);

  const accent = getAccentClasses();
  const theme = getThemeClasses();
  const plan = user?.plan || 'free';
  const hasPaidAccess = plan !== 'free';

  // Handle success redirect from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true' && !successHandled.current) {
      successHandled.current = true;
      setMessage('Welcome to FitFlow! Your membership is now active.');
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => refreshUser(), 1500);
      setTimeout(() => setMessage(''), 5000);
    }
  }, [searchParams, refreshUser]);

  // AUTO-CHECKOUT: Free users go straight to Stripe (with trial)
  useEffect(() => {
    async function handleAutoCheckout() {
      if (!isReady || !user) return;
      if (plan !== 'free') return; // Already paid
      if (searchParams.get('success')) return; // Just paid, waiting for webhook
      if (searchParams.get('canceled')) return; // User canceled, show message
      if (checkoutStarted.current) return;

      checkoutStarted.current = true;

      try {
        // Fetch tiers to get the paid tier info
        const res = await dreamAPI.products.listTiers();
        const paidTier = res.tiers?.find(t => t.price > 0);

        if (!paidTier) {
          console.error('No paid tier found');
          return;
        }

        // Create checkout (trial days configured in Dream API dashboard)
        const result = await api.billing.createCheckout({
          tier: paidTier.name,
          priceId: paidTier.priceId,
          successUrl: window.location.origin + '/dashboard?success=true',
          cancelUrl: window.location.origin + '/dashboard?canceled=true',
        });

        if (result.url) {
          window.location.href = result.url;
        }
      } catch (err) {
        console.error('Auto-checkout error:', err);
        checkoutStarted.current = false;
      }
    }

    handleAutoCheckout();
  }, [isReady, user, plan, api, searchParams]);

  // Show canceled message
  if (searchParams.get('canceled')) {
    return (
      <div className={`min-h-screen ${theme.pageBg}`}>
        <Nav />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className={`${theme.cardBg} rounded-xl p-10`}>
            <div className="text-5xl mb-6">👋</div>
            <h2 className={`text-2xl font-medium ${theme.heading} mb-3`}>No problem!</h2>
            <p className={`${theme.body} mb-6`}>
              Come back when you're ready to start your fitness journey.
            </p>
            <a
              href="/"
              className={`inline-block px-6 py-3 rounded-lg font-medium ${accent.bg} text-white ${accent.bgHover} transition-colors`}
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while redirecting to checkout
  if (!hasPaidAccess && !searchParams.get('success')) {
    return (
      <div className={`min-h-screen ${theme.pageBg}`}>
        <Nav />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className={`${theme.cardBg} rounded-xl p-10`}>
            <div className={`w-10 h-10 border-2 ${theme.progressBg} border-t-current rounded-full animate-spin mx-auto mb-6 ${accent.text}`}></div>
            <h2 className={`text-xl font-medium ${theme.heading} mb-2`}>Setting up your free trial...</h2>
            <p className={theme.body}>You'll be redirected to checkout in a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  // MEMBER CONTENT
  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      <Nav />

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-light ${theme.heading} mb-1`}>Welcome, {user?.email?.split('@')[0]}!</h1>
            <p className={theme.body}>Your personal fitness dashboard</p>
          </div>
          <div className="flex gap-3">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-lg ${accent.bg} text-white`}>
              {plan.toUpperCase()} MEMBER
            </span>
            <button
              onClick={async () => {
                const result = await api.billing.openPortal({ returnUrl: window.location.href });
                if (result.url) window.location.href = result.url;
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${theme.buttonSecondary} transition-colors`}
            >
              Manage Billing
            </button>
          </div>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-emerald-100 border border-emerald-200 text-emerald-800">
            {message}
          </div>
        )}

        {/* Member Content Grid */}
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CONFIG.memberContent.map((item, i) => (
              <div key={i} className={`${theme.cardBg} rounded-xl p-6 ${theme.cardHover} transition-all cursor-pointer`}>
                <div className={`w-12 h-12 rounded-xl ${accent.bgLight} ${accent.text} flex items-center justify-center mb-4`}>
                  <Icon name={item.icon || 'check'} className="w-6 h-6" />
                </div>
                <h3 className={`text-lg font-medium mb-2 ${theme.heading}`}>{item.title}</h3>
                <p className={`${theme.body} text-sm mb-4`}>{item.description}</p>
                <span className={`text-sm font-medium ${accent.text}`}>
                  {item.cta || 'Access Now'} →
                </span>
              </div>
            ))}
          </div>

          {/* Featured Content Area */}
          <div className={`${theme.cardBg} rounded-xl p-8`}>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className={`text-xl font-medium ${theme.heading} mb-2`}>Today's Featured Workout</h2>
                <p className={`${theme.body} mb-6`}>
                  Start your day with this 25-minute full-body HIIT session. Train anywhere with our mobile-optimized videos.
                </p>
                <ul className={`space-y-2 mb-6 ${theme.body} text-sm`}>
                  <li className="flex items-center gap-2">
                    <span className={accent.text}>✓</span> HD video with form cues
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={accent.text}>✓</span> Offline download available
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={accent.text}>✓</span> Track your progress
                  </li>
                </ul>
                <button className={`px-6 py-3 rounded-lg font-medium ${accent.bg} text-white ${accent.bgHover} transition-colors`}>
                  Start Workout
                </button>
              </div>
              <div className="relative">
                <img
                  src="/assets/fitflow-phone.png"
                  alt="FitFlow mobile app"
                  className="rounded-xl shadow-2xl w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
