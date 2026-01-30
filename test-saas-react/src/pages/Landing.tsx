/**
 * LANDING PAGE - Public homepage
 *
 * All customization is in src/config.ts - NOT in this file.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDreamAPI, dreamAPI } from '../hooks/useDreamAPI';
import { CONFIG, getAccentClasses, getThemeClasses } from '../config';
import Nav from '../components/Nav';
import Icon from '../components/Icons';
import type { Tier } from '@dream-api/sdk';

export default function Landing() {
  const { isSignedIn, isReady } = useDreamAPI();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const accent = getAccentClasses();
  const theme = getThemeClasses();

  // Auto-redirect signed-in users to dashboard
  useEffect(() => {
    if (isReady && isSignedIn) {
      navigate('/dashboard');
    }
  }, [isReady, isSignedIn, navigate]);

  useEffect(() => {
    dreamAPI.products.listTiers()
      .then(res => {
        // Sort tiers by price ascending (least to greatest)
        const sorted = (res.tiers || []).sort((a, b) => a.price - b.price);
        setTiers(sorted);
      })
      .catch(console.error)
      .finally(() => setLoadingTiers(false));
  }, []);

  const getSignUpUrl = () => dreamAPI.auth.getSignUpUrl({
    redirect: window.location.origin + '/dashboard'
  });

  return (
    <div className={`min-h-screen ${theme.pageBg} ${theme.heading}`}>
      {/* Navigation */}
      <Nav showAuthLinks />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`grid ${CONFIG.hero.image ? 'lg:grid-cols-2 gap-12 items-center' : ''}`}>
            {/* Hero Content */}
            <div className={CONFIG.hero.image ? '' : 'text-center max-w-4xl mx-auto'}>
              <h1 className={`text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 ${theme.heading}`}>
                {CONFIG.hero.headline}
              </h1>
              <p className={`text-lg md:text-xl ${theme.body} mb-10 max-w-2xl`}>
                {CONFIG.hero.subheadline}
              </p>
              <div className={`flex flex-col sm:flex-row gap-4 ${CONFIG.hero.image ? '' : 'justify-center'}`}>
                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className={`px-8 py-3 rounded font-medium ${accent.bg} text-white ${accent.bgHover} transition-colors text-center`}
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <a
                    href={getSignUpUrl()}
                    className={`px-8 py-3 rounded font-medium ${accent.bg} text-white ${accent.bgHover} transition-colors text-center`}
                  >
                    {CONFIG.hero.cta}
                  </a>
                )}
              </div>
              {CONFIG.hero.ctaSubtext && (
                <p className={`mt-4 ${theme.muted} text-sm`}>
                  {CONFIG.hero.ctaSubtext}
                </p>
              )}
            </div>

            {/* Hero Image */}
            {CONFIG.hero.image && (
              <div className="relative">
                <img
                  src={CONFIG.hero.image}
                  alt="Product"
                  className={`rounded-xl shadow-2xl ${theme.cardBg}`}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      {CONFIG.socialProof.enabled && CONFIG.socialProof.logos.length > 0 && (
        <section className={`py-12 px-6 border-y ${theme.dropdownDivider}`}>
          <div className="max-w-6xl mx-auto text-center">
            <p className={`${theme.muted} text-sm mb-8`}>{CONFIG.socialProof.headline}</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {CONFIG.socialProof.logos.map((logo, i) => (
                <img
                  key={i}
                  src={logo.src}
                  alt={logo.name}
                  className="h-8 md:h-10 opacity-50 hover:opacity-80 transition-opacity grayscale"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl font-light mb-3 ${theme.heading}`}>{CONFIG.howItWorks.headline}</h2>
            <p className={theme.body}>{CONFIG.howItWorks.subheadline}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {CONFIG.howItWorks.steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className={`w-14 h-14 rounded-xl ${theme.cardBg} flex items-center justify-center mx-auto mb-4 ${accent.text}`}>
                  <Icon name={step.icon || 'check'} className="w-6 h-6" />
                </div>
                <div className={`text-xs ${theme.muted} font-medium mb-2`}>STEP {step.number}</div>
                <h3 className={`text-lg font-medium mb-2 ${theme.heading}`}>{step.title}</h3>
                <p className={`${theme.body} text-sm`}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`py-24 px-6 ${theme.sectionAltBg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl font-light mb-3 ${theme.heading}`}>{CONFIG.features.headline}</h2>
            <p className={theme.body}>{CONFIG.features.subheadline}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CONFIG.features.items.map((feature, i) => (
              <div key={i} className={`p-6 rounded-xl ${theme.cardBg} ${theme.cardHover} transition-all`}>
                <div className={`w-10 h-10 rounded-lg ${accent.bg} flex items-center justify-center mb-4`}>
                  <Icon name={feature.icon || 'check'} className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-lg font-medium mb-2 ${theme.heading}`}>{feature.title}</h3>
                <p className={`${theme.body} text-sm`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl font-light mb-3 ${theme.heading}`}>{CONFIG.pricing.headline}</h2>
            <p className={theme.body}>{CONFIG.pricing.subheadline}</p>
          </div>

          {loadingTiers ? (
            <div className="text-center py-12">
              <div className={`w-6 h-6 border-2 ${theme.progressBg} border-t-current rounded-full animate-spin mx-auto ${theme.body}`} />
            </div>
          ) : (
            <div className={`grid gap-6 ${tiers.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : tiers.length >= 3 ? 'md:grid-cols-3' : ''}`}>
              {tiers.map((tier, i) => {
                const isPopular = tier.popular || i === Math.floor(tiers.length / 2);

                return (
                  <div
                    key={tier.name}
                    className={`relative p-6 rounded-xl transition-colors ${theme.cardBg} ${
                      isPopular ? `border-2 ${accent.border}` : theme.cardHover
                    }`}
                  >
                    {isPopular && (
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium rounded ${accent.bg} text-white`}>
                        POPULAR
                      </div>
                    )}

                    <h3 className={`text-lg font-medium mb-2 ${theme.heading}`}>
                      {tier.displayName || tier.name}
                    </h3>
                    <div className="mb-4">
                      <span className={`text-4xl font-light ${theme.heading}`}>${(tier.price / 100).toFixed(tier.price % 100 === 0 ? 0 : 2)}</span>
                      <span className={theme.body}>/mo</span>
                    </div>
                    <p className={`${theme.body} text-sm mb-6`}>
                      {tier.limit === -1 ? 'Unlimited requests' : `${tier.limit.toLocaleString()} requests/mo`}
                    </p>

                    {isSignedIn ? (
                      <Link
                        to="/choose-plan"
                        className={`block w-full py-2.5 rounded text-sm font-medium text-center transition-colors ${
                          isPopular
                            ? `${accent.bg} text-white ${accent.bgHover}`
                            : theme.buttonSecondary
                        }`}
                      >
                        {tier.price === 0 ? 'Current Plan' : 'Upgrade'}
                      </Link>
                    ) : (
                      <a
                        href={getSignUpUrl()}
                        className={`block w-full py-2.5 rounded text-sm font-medium text-center transition-colors ${
                          isPopular
                            ? `${accent.bg} text-white ${accent.bgHover}`
                            : theme.buttonSecondary
                        }`}
                      >
                        {tier.price === 0 ? 'Start Free' : 'Get Started'}
                      </a>
                    )}

                    {tier.features && tier.features.length > 0 && (
                      <ul className="mt-6 space-y-2">
                        {tier.features.map((feature, j) => (
                          <li key={j} className={`flex items-start gap-2 ${theme.body} text-sm`}>
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
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`py-24 px-6 ${theme.sectionAltBg}`}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl font-light mb-3 ${theme.heading}`}>{CONFIG.faq.headline}</h2>
          </div>
          <div className="space-y-4">
            {CONFIG.faq.items.map((item, i) => (
              <div key={i} className={`${theme.cardBg} rounded-xl overflow-hidden`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full px-6 py-4 text-left flex justify-between items-center ${theme.buttonHover} transition-colors`}
                >
                  <span className={`font-medium ${theme.heading}`}>{item.question}</span>
                  <svg
                    className={`w-5 h-5 ${theme.muted} transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className={`${theme.body} text-sm`}>{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-3xl font-light mb-3 ${theme.heading}`}>{CONFIG.finalCta.headline}</h2>
          <p className={`${theme.body} mb-8`}>{CONFIG.finalCta.subheadline}</p>
          {isSignedIn ? (
            <Link
              to="/dashboard"
              className={`inline-block px-8 py-3 rounded font-medium ${accent.bg} text-white ${accent.bgHover} transition-colors`}
            >
              Go to Dashboard
            </Link>
          ) : (
            <a
              href={getSignUpUrl()}
              className={`inline-block px-8 py-3 rounded font-medium ${accent.bg} text-white ${accent.bgHover} transition-colors`}
            >
              {CONFIG.finalCta.cta}
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-6 ${theme.footerBg}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className={`${theme.muted} text-sm`}>
            &copy; {new Date().getFullYear()} {CONFIG.appName}
          </p>
          {CONFIG.footer.links.length > 0 && (
            <div className="flex gap-6">
              {CONFIG.footer.links.map((link, i) => (
                <Link key={i} to={link.href} className={`${theme.link} text-sm transition-colors`}>
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
