/**
 * CHOOSE PLAN - Pricing selection (protected)
 *
 * Uses shared config from src/config.ts
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDreamAPI, dreamAPI } from '../hooks/useDreamAPI';
import { getAccentClasses, getThemeClasses } from '../config';
import Nav from '../components/Nav';
import type { Tier } from '@dream-api/sdk';

export default function ChoosePlanPage() {
  const { api, isReady, user } = useDreamAPI();
  const navigate = useNavigate();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const currentPlan = user?.plan || 'free';
  const accent = getAccentClasses();
  const theme = getThemeClasses();

  useEffect(() => {
    async function loadTiers() {
      try {
        const response = await dreamAPI.products.listTiers();
        // Sort tiers by price ascending (least to greatest)
        const sortedTiers = (response.tiers || []).sort((a, b) => a.price - b.price);
        setTiers(sortedTiers);
      } catch (err: any) {
        console.error('Failed to load tiers:', err);
        setError(err.message || 'Failed to load pricing');
      } finally {
        setLoading(false);
      }
    }
    loadTiers();
  }, []);

  const handleSelectPlan = async (tier: Tier) => {
    if (tier.name === 'free' || tier.price === 0) {
      navigate('/dashboard');
      return;
    }

    if (!isReady) {
      setError('Please wait...');
      return;
    }

    setUpgrading(tier.name);
    try {
      const result = await api.billing.createCheckout({
        tier: tier.name,
        priceId: tier.priceId,
        successUrl: window.location.origin + '/dashboard?success=true',
        cancelUrl: window.location.origin + '/choose-plan?canceled=true',
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to create checkout session');
        setUpgrading(null);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong');
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.pageBg} flex items-center justify-center`}>
        <div className={`w-6 h-6 border-2 ${theme.progressBg} border-t-current rounded-full animate-spin ${theme.body}`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      {/* Shared Nav with profile dropdown */}
      <Nav />

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className={`text-3xl font-light ${theme.heading} mb-3`}>Choose Your Plan</h1>
          <p className={theme.body}>Upgrade or change your subscription</p>
          {currentPlan && (
            <p className={`mt-2 text-sm ${theme.muted}`}>
              Current plan: <span className={accent.text}>{currentPlan.toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 max-w-md mx-auto bg-red-950/50 border border-red-900 rounded-lg p-4">
            <p className="text-red-400 text-center text-sm">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className={`grid gap-6 ${tiers.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : tiers.length >= 3 ? 'md:grid-cols-3' : ''}`}>
          {tiers.map((tier, index) => {
            const isCurrentPlan = tier.name === currentPlan;
            const isUpgrading = upgrading === tier.name;
            const isPopular = tier.popular || index === Math.floor(tiers.length / 2);

            return (
              <div
                key={tier.name}
                className={`relative ${theme.cardBg} rounded-xl p-6 transition-colors ${
                  isCurrentPlan
                    ? `border-2 ${accent.border}`
                    : isPopular
                    ? `border-2 ${accent.border} opacity-80`
                    : theme.cardHover
                }`}
              >
                {/* Popular badge */}
                {isPopular && !isCurrentPlan && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium rounded ${accent.bg} text-white`}>
                    POPULAR
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div className={`mb-4 inline-block px-2 py-1 text-xs font-medium rounded ${accent.bg} text-white`}>
                    CURRENT
                  </div>
                )}

                <h3 className={`text-lg font-medium ${theme.heading} mb-2`}>
                  {tier.displayName || tier.name}
                </h3>

                <div className="mb-4">
                  <span className={`text-3xl font-light ${theme.heading}`}>${(tier.price / 100).toFixed(tier.price % 100 === 0 ? 0 : 2)}</span>
                  <span className={`${theme.body} text-sm`}>/month</span>
                </div>

                <p className={`${theme.body} text-sm mb-6`}>
                  {tier.limit === -1 ? 'Unlimited requests' : `${tier.limit.toLocaleString()} requests/month`}
                </p>

                <button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={isCurrentPlan || isUpgrading}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isCurrentPlan
                      ? `${theme.buttonDisabled} cursor-default`
                      : isUpgrading
                      ? `${theme.buttonDisabled} cursor-wait`
                      : tier.price === 0
                      ? theme.buttonSecondary
                      : `${accent.bg} text-white ${accent.bgHover}`
                  }`}
                >
                  {isCurrentPlan
                    ? 'Current Plan'
                    : isUpgrading
                    ? 'Processing...'
                    : tier.price === 0
                    ? 'Select Free'
                    : 'Upgrade'}
                </button>

                {tier.features && tier.features.length > 0 && (
                  <ul className="mt-6 space-y-2">
                    {tier.features.map((feature, i) => (
                      <li key={i} className={`flex items-start gap-2 ${theme.body} text-sm`}>
                        <svg className={`w-4 h-4 mt-0.5 ${accent.text} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className={`${theme.muted} text-sm`}>
            All plans include core features &middot; Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
