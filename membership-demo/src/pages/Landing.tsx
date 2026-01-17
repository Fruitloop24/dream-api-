/**
 * LANDING PAGE - Public homepage
 *
 * All customization is in src/config.ts - NOT in this file.
 */

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDreamAPI, dreamAPI } from '../hooks/useDreamAPI';
import { CONFIG, getAccentClasses, getThemeClasses } from '../config';
import Nav from '../components/Nav';
import Icon from '../components/Icons';
import type { Tier } from '@dream-api/sdk';

export default function Landing() {
  const { isSignedIn } = useDreamAPI();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const accent = getAccentClasses();
  const theme = getThemeClasses();

  useEffect(() => {
    dreamAPI.products.listTiers()
      .then(res => setTiers(res.tiers || []))
      .catch(console.error)
      .finally(() => setLoadingTiers(false));
  }, []);

  const getSignUpUrl = () => dreamAPI.auth.getSignUpUrl({
    redirect: window.location.origin + '/choose-plan'
  });

  return (
    <div className={`min-h-screen ${theme.pageBg} ${theme.heading}`}>
      {/* QR Code Card - Fixed position above demo card (hidden on mobile) */}
      <div className="hidden md:block fixed bottom-44 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl max-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
          <span className="text-violet-400 text-xs font-semibold">PWA Ready</span>
        </div>
        <img src="/qr-code.png" alt="Scan to visit" className="w-full rounded mb-3" />
        <div className="space-y-1 text-xs">
          <p className="text-white font-medium">Install on Phone</p>
          <p className="text-zinc-400">1. Scan → 2. Tap Share</p>
          <p className="text-zinc-400">3. "Add to Home Screen"</p>
        </div>
      </div>

      {/* Demo Card - Fixed position (hidden on mobile) */}
      <div className="hidden md:block fixed bottom-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-medium">Live Demo</span>
        </div>
        <p className="text-zinc-400 text-xs mb-2">Test credit card for checkout:</p>
        <code className="block bg-zinc-800 text-violet-400 px-3 py-2 rounded text-sm font-mono">
          4242 4242 4242 4242
        </code>
        <p className="text-zinc-500 text-xs mt-2">Any future date, any CVC</p>
      </div>

      {/* Navigation */}
      <Nav showAuthLinks />

      {/* Demo Banner */}
      <div className={`${accent.bg} text-white py-3 px-6`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center sm:text-left">
          <span className="font-medium">🚀 Live Demo - Try the Full Checkout Flow!</span>
          <span className="text-white/80 text-sm">Use test card: <code className="bg-white/20 px-2 py-0.5 rounded font-mono">4242 4242 4242 4242</code></span>
          <a
            href="https://github.com/Fruitloop24/dream-membership-basic"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-2 hover:text-white/90"
          >
            View Source →
          </a>
        </div>
      </div>

      {/* Hero */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Top Headline */}
          <div className="text-center mb-8">
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight ${theme.heading}`}>
              Transform Your Body,
            </h1>
          </div>

          {/* Full-Width Hero Image */}
          {CONFIG.hero.image && (
            <div className="relative mb-8">
              <img
                src={CONFIG.hero.image}
                alt="FitFlow Pro - Your Personal Health & Fitness Coach"
                className="w-full rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Bottom Headline + CTA */}
          <div className="text-center">
            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 ${theme.heading}`}>
              Transform Your Life
            </h2>
            <p className={`text-lg md:text-xl ${theme.body} mb-10 max-w-2xl mx-auto`}>
              {CONFIG.hero.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

      {/* Testimonials */}
      {CONFIG.testimonials?.enabled && CONFIG.testimonials.items.length > 0 && (
        <section className={`py-20 px-6 ${theme.sectionAltBg}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-light mb-3 ${theme.heading}`}>{CONFIG.testimonials.headline}</h2>
              <p className={theme.body}>{CONFIG.testimonials.subheadline}</p>
            </div>

            {/* Big Testimonial Image */}
            <div className="mb-12">
              <img
                src="/assets/fitflow-test.png"
                alt="Real member transformations"
                className="w-full rounded-xl shadow-lg"
              />
            </div>

            {/* Individual Testimonials */}
            <div className="grid md:grid-cols-3 gap-6">
              {CONFIG.testimonials.items.map((item, i) => (
                <div key={i} className={`p-6 rounded-xl ${theme.cardBg}`}>
                  <div className={`${accent.text} mb-4`}>
                    <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                  <p className={`${theme.body} mb-4 text-sm leading-relaxed`}>"{item.quote}"</p>
                  <div className="flex items-center gap-3">
                    {(item as any).avatar && (
                      <img
                        src={(item as any).avatar}
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className={`font-medium ${theme.heading} text-sm`}>{item.name}</p>
                      <p className={`${theme.muted} text-xs`}>{item.role}</p>
                    </div>
                  </div>
                </div>
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
                      {tier.price === 0 ? 'Limited preview access' : 'Full access to all content'}
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

      {/* PWA Install Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className={`${theme.cardBg} rounded-xl p-8 flex flex-col md:flex-row items-center gap-8`}>
            {/* QR Code */}
            <div className="flex-shrink-0">
              <img
                src="/assets/fitflow-qr.png"
                alt="Scan to install FitFlow"
                className="w-32 h-32 rounded-lg"
              />
            </div>

            {/* Instructions */}
            <div className="text-center md:text-left">
              <h3 className={`text-xl font-medium ${theme.heading} mb-2`}>Train From Your Phone</h3>
              <p className={`${theme.body} mb-4`}>
                Scan the QR code to install FitFlow on your device. No app store needed - opens right from your home screen.
              </p>
              <div className={`${theme.muted} text-sm space-y-1`}>
                <p><strong>iPhone:</strong> Tap Share → Add to Home Screen</p>
                <p><strong>Android:</strong> Tap Menu → Install App</p>
              </div>
              <p className={`${accent.text} text-sm mt-3`}>Works on iPhone, Android, and tablets</p>
            </div>
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
