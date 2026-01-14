/**
 * Landing Page - dream-api
 * Uses config.ts for all branding - easy to customize
 */

import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CONFIG, getTheme, getAccent, getPrimaryButtonClasses, getSecondaryButtonClasses } from '../config';

// Icons
const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Landing() {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const theme = getTheme();
  const accent = getAccent();
  const primaryBtn = getPrimaryButtonClasses();
  const secondaryBtn = getSecondaryButtonClasses();

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard');
  }, [isSignedIn, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`min-h-screen ${theme.pageGradient} ${theme.heading}`}>
      {/* Sticky Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${
        scrolled ? `${theme.navBg} border-b ${theme.navBorder}` : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className={`text-xl font-bold ${theme.heading}`}>{CONFIG.appName}</a>
            <div className={`hidden md:flex items-center gap-6 text-sm ${theme.navText}`}>
              <a href="/docs" className={theme.navTextHover}>Docs</a>
              <a href="/templates" className={theme.navTextHover}>Templates</a>
              <a href="#pricing" className={theme.navTextHover}>Pricing</a>
              <a href={CONFIG.links.github} target="_blank" rel="noopener noreferrer" className={theme.navTextHover}>GitHub</a>
            </div>
            <div className="flex items-center gap-3">
              <a href="/sign-in" className={`text-sm ${theme.navText} ${theme.navTextHover}`}>Sign In</a>
              <a href="/sign-up" className={`px-4 py-2 ${primaryBtn} text-sm`}>
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            {CONFIG.hero.headline}
          </h1>
          <p className={`text-xl md:text-2xl ${theme.muted} mb-8 max-w-2xl mx-auto`}>
            {CONFIG.hero.subheadline} <span className={accent.text}>{CONFIG.hero.highlight}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a href="/sign-up" className={`px-8 py-4 ${primaryBtn} text-lg`}>
              {CONFIG.hero.ctaPrimary}
            </a>
            <a href="#demos" className={`px-8 py-4 ${secondaryBtn} text-lg`}>
              Try Live Demos
            </a>
          </div>
          <p className={`text-sm ${theme.mutedMore}`}>{CONFIG.hero.subtext}</p>
        </div>
      </section>

      {/* Live Demos Banner */}
      <section id="demos" className={`py-8 px-4 ${accent.bg}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Try Working Demos - Full Auth &amp; Payments</h2>
            <p className="text-white/80">
              Test card: <code className="bg-white/20 px-2 py-1 rounded font-mono text-sm">4242 4242 4242 4242</code>
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <a href={CONFIG.links.saasDemo} target="_blank" rel="noopener noreferrer"
               className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-center transition">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-bold text-white">SaaS Demo</div>
              <div className="text-white/70 text-sm">Usage tracking, tiers</div>
            </a>
            <a href={CONFIG.links.storeDemo} target="_blank" rel="noopener noreferrer"
               className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-center transition">
              <div className="text-2xl mb-2">🛒</div>
              <div className="font-bold text-white">Store Demo</div>
              <div className="text-white/70 text-sm">Cart, guest checkout</div>
            </a>
            <a href={CONFIG.links.membershipDemo} target="_blank" rel="noopener noreferrer"
               className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-center transition">
              <div className="text-2xl mb-2">🔐</div>
              <div className="font-bold text-white">Membership Demo</div>
              <div className="text-white/70 text-sm">Paywall, content gating</div>
            </a>
          </div>
          <p className="text-center text-white/60 text-sm mt-4">
            5 minutes to launch your own. Clone template → add key → deploy.
          </p>
        </div>
      </section>

      {/* 3 Feature Cards */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {CONFIG.features.map((feature, i) => (
              <div key={i} className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className={`${theme.muted} text-sm`}>
                  {feature.description.includes('$0') ? (
                    <>
                      {feature.description.replace('$0', '')}
                      <span className={`${accent.text} font-bold`}>$0</span>.
                    </>
                  ) : feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No Code Dashboard Section */}
      <section id="dashboard" className={`py-20 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">No Code. No Deploys. Just Dashboard.</h2>
            <p className={`${theme.muted} text-lg`}>Change your products, prices, and limits. Your app updates instantly.</p>
          </div>

          {/* Dashboard Screenshot Placeholder */}
          <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-8 mb-8 min-h-[300px] flex items-center justify-center`}>
            <div className={`text-center ${theme.mutedMore}`}>
              <div className="text-4xl mb-2">🖥️</div>
              <p>[Dashboard Screenshot]</p>
              <p className="text-sm">Tier config, pricing, limits, customers</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {CONFIG.dashboardFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckIcon className={accent.text} />
                <div>
                  <p className="font-medium">{feature.title}</p>
                  <p className={`text-sm ${theme.mutedMore}`}>{feature.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">One Key. Four Calls. Done.</h2>
            <p className={`${theme.muted} text-lg`}>Published on npm. Safe for frontend.</p>
          </div>

          <div className={`${theme.codeBg} border ${theme.cardBorder} rounded-xl overflow-hidden`}>
            <div className={`${theme.cardBgAlt} px-4 py-2 border-b ${theme.cardBorder} flex items-center gap-2`}>
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <span className={`text-xs ${theme.mutedMore} ml-2`}>terminal</span>
            </div>
            <pre className="p-6 text-sm overflow-x-auto">
              <code>
                <span className={theme.mutedMore}># Install</span>{'\n'}
                <span className={accent.text}>npm install</span> @dream-api/sdk{'\n\n'}
                <span className={theme.mutedMore}>// Setup - one publishable key</span>{'\n'}
                <span className="text-violet-400">const</span> api = <span className="text-violet-400">new</span> <span className="text-amber-400">DreamAPI</span>{'({'}{'\n'}
                {'  '}publishableKey: <span className={accent.text}>'pk_live_xxx'</span>{'\n'}
                {'});'}{'\n\n'}
                <span className={theme.mutedMore}>// That's your whole frontend integration</span>{'\n'}
                <span className="text-violet-400">await</span> api.products.<span className="text-sky-400">list</span>()      <span className="text-gray-600">// Tiers from dashboard</span>{'\n'}
                <span className="text-violet-400">await</span> api.usage.<span className="text-sky-400">track</span>()        <span className="text-gray-600">// Enforced limits</span>{'\n'}
                <span className="text-violet-400">await</span> api.billing.<span className="text-sky-400">checkout</span>()   <span className="text-gray-600">// Your Stripe</span>{'\n'}
                <span className="text-violet-400">await</span> api.auth.<span className="text-sky-400">getSignUpUrl</span>()  <span className="text-gray-600">// Hosted auth</span>
              </code>
            </pre>
          </div>

          <div className={`mt-6 flex flex-wrap gap-4 justify-center text-sm ${theme.mutedMore}`}>
            <span className="flex items-center gap-2"><CheckIcon className={accent.text} /> JWT-enforced plans</span>
            <span className="flex items-center gap-2"><CheckIcon className={accent.text} /> Webhook-signed security</span>
            <span className="flex items-center gap-2"><CheckIcon className={accent.text} /> Auto token refresh</span>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className={`py-20 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Set Up in 5 Minutes</h2>
            <p className={`${theme.muted} text-lg`}>Clone. Run AI commands. Ship.</p>
          </div>
          <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl aspect-video flex items-center justify-center`}>
            <div className={`text-center ${theme.mutedMore}`}>
              <div className="text-5xl mb-4">▶️</div>
              <p className="text-lg">[5-Minute Setup Video]</p>
              <p className="text-sm mt-2">Clone → /setup → /pwa → Deploy</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {CONFIG.howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className={`w-12 h-12 ${accent.bgLight} ${accent.text} rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4`}>
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className={`${theme.muted} text-sm`}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className={`py-20 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Free Templates - AI Customizable</h2>
            <p className={`${theme.muted} text-lg mb-4`}>Clone, run <code className={accent.text}>/setup</code>, deploy. Done in 5 minutes.</p>
            <a href="/templates" className={`inline-block px-6 py-2 ${secondaryBtn} text-sm`}>
              View All Templates →
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* SaaS Template */}
            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">📊</div>
                <h3 className="text-xl font-bold">SaaS</h3>
              </div>
              <p className={`${theme.muted} text-sm mb-4`}>Usage tracking, subscription tiers, automatic limits. Perfect for AI tools, APIs.</p>
              <ul className={`space-y-2 text-sm ${theme.muted} mb-6`}>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> Auth + Billing wired</li>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> Usage enforcement</li>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> <code className={accent.text}>/setup</code> + <code className={accent.text}>/pwa</code></li>
              </ul>
              <div className="flex gap-3">
                <a href={CONFIG.links.saasDemo} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center py-2 ${primaryBtn} text-sm`}>Demo</a>
                <a href={CONFIG.links.saasBasic} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center py-2 ${secondaryBtn} text-sm`}>GitHub</a>
              </div>
            </div>

            {/* Store Template */}
            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">🛒</div>
                <h3 className="text-xl font-bold">Store</h3>
              </div>
              <p className={`${theme.muted} text-sm mb-4`}>Products, cart, guest checkout. No per-user fees. Perfect for merch, courses.</p>
              <ul className={`space-y-2 text-sm ${theme.muted} mb-6`}>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> Product catalog</li>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> Cart + Checkout</li>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> <code className={accent.text}>/setup</code> + <code className={accent.text}>/pwa</code></li>
              </ul>
              <div className="flex gap-3">
                <a href={CONFIG.links.storeDemo} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center py-2 ${primaryBtn} text-sm`}>Demo</a>
                <a href={CONFIG.links.storeBasic} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center py-2 ${secondaryBtn} text-sm`}>GitHub</a>
              </div>
            </div>

            {/* Membership Template */}
            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">🔐</div>
                <h3 className="text-xl font-bold">Membership</h3>
              </div>
              <p className={`${theme.muted} text-sm mb-4`}>Content gating, paywalls, auto-checkout. Perfect for courses, communities.</p>
              <ul className={`space-y-2 text-sm ${theme.muted} mb-6`}>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> Auto-checkout flow</li>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> Content gating</li>
                <li className="flex items-center gap-2"><CheckIcon className={accent.text} /> <code className={accent.text}>/setup</code> + <code className={accent.text}>/pwa</code></li>
              </ul>
              <div className="flex gap-3">
                <a href={CONFIG.links.membershipDemo} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center py-2 ${primaryBtn} text-sm`}>Demo</a>
                <a href={CONFIG.links.membershipBasic} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center py-2 ${secondaryBtn} text-sm`}>GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {CONFIG.techHighlights.map((item, i) => (
              <div key={i}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-medium">{item.title}</p>
                <p className={`text-xs ${theme.mutedMore}`}>{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={`py-20 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8`}>
            <div className="text-center mb-8">
              <div className="text-5xl font-bold mb-2">
                ${CONFIG.pricing.monthly}<span className={`text-xl ${theme.mutedMore} font-normal`}>/mo</span>
              </div>
              <p className={theme.muted}>after {CONFIG.pricing.trialDays}-day free trial</p>
            </div>

            <ul className="space-y-3 mb-8">
              {CONFIG.pricingFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckIcon className={accent.text} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className={`border-t ${theme.divider} pt-6 mb-8`}>
              <div className={`space-y-2 ${theme.muted}`}>
                {CONFIG.noFees.map((fee, i) => (
                  <p key={i} className="flex items-center gap-3">
                    <XIcon />
                    <span className="line-through">{fee}</span>
                  </p>
                ))}
              </div>
              <p className={`${accent.text} font-medium mt-4`}>
                You keep 100% of customer payments.
              </p>
            </div>

            <a href="/sign-up" className={`block w-full py-4 ${primaryBtn} text-center text-lg`}>
              Start Free Trial
            </a>
            <p className={`text-center text-sm ${theme.mutedMore} mt-4`}>
              Credit card required • Cancel anytime • Invoice sent before charge
            </p>
          </div>
          <p className={`text-center ${theme.mutedMore} mt-6`}>
            Requires verified Stripe account
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Just need a Stripe account.</h2>
          <p className={`${theme.muted} text-lg mb-8`}>We're infrastructure, not a middleman.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/sign-up" className={`px-8 py-4 ${primaryBtn} text-lg`}>Start Free Trial</a>
            <a href={CONFIG.links.docs} className={`px-8 py-4 ${secondaryBtn} text-lg`}>View Documentation</a>
          </div>
        </div>
      </section>

      {/* Built On */}
      <section className={`py-12 px-4 border-t ${theme.footerBorder}`}>
        <div className="max-w-4xl mx-auto">
          <p className={`text-center ${theme.mutedMore} text-sm mb-6`}>Built on</p>
          <div className="flex justify-center items-center gap-12 opacity-60">
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition">
              <svg className="h-8" viewBox="0 0 60 25" fill="currentColor">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.93.76-2.13 2.42h4.15c-.02-1.27-.75-2.42-2.02-2.42zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 9.14c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-5.13L32.37 0v3.77l-4.13.88V.44zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.45-3.32.43zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54-3.15 0-4.3-1.93-4.3-4.75V.44l4.07-.88v5.82h3.09v3.54h-3.1v5.59h.01zm-8.82-1.98c0-4.63-6.27-3.82-6.27-5.77 0-.79.62-1.1 1.63-1.1.98 0 2.23.34 3.51 1.02V3.35c-1.28-.55-2.54-.82-3.94-.82-3.2 0-5.32 1.73-5.32 4.61 0 4.35 6.18 3.63 6.18 5.63 0 .92-.8 1.22-1.87 1.22-1.18 0-2.7-.49-3.94-1.31v4.03c1.24.65 2.57 1 3.97 1 3.28 0 5.55-1.62 5.55-4.6 0-.1-.02-.2-.02-.3l.52.72z"/>
              </svg>
            </a>
            <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition">
              <span className="text-xl font-bold">clerk</span>
            </a>
            <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition">
              <svg className="h-8" viewBox="0 0 130 43" fill="currentColor">
                <path d="M26.9 30.6l.8-2.6c.6-1.8.4-3.5-.6-4.7-1-1.1-2.5-1.8-4.3-1.8H6.5c-.2 0-.4-.1-.5-.2-.1-.2-.1-.4 0-.6.7-2.2 2.8-3.8 5.2-3.8h.5c.3 0 .6-.2.7-.5 1.7-5.1 6.5-8.5 11.9-8.5 5.8 0 10.8 3.9 12.3 9.3.1.3.4.5.7.5 3.7.3 6.7 3.1 7.2 6.8 0 .3.3.6.6.6h2.3c2.1 0 4 1.3 4.8 3.2.1.2.1.5 0 .7-.1.2-.3.3-.6.3l-24.1.1c-.3 0-.5-.3-.6-.5l-.1-.3z"/>
                <path d="M31.6 30.7c.2.2.1.5-.1.6l-.3.1h-5.4c-.2 0-.5-.1-.6-.3-.7-1.9.2-4 2.1-4.7.5-.2 1-.3 1.5-.3 1.1 0 2.1.5 2.8 1.4.1.2.2.4.1.6l-.1 2.6z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-4 border-t ${theme.footerBorder} ${theme.footerBg}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className={`${theme.mutedMore} text-sm`}>{CONFIG.footer.copyright}</p>
            <div className={`flex gap-6 text-sm ${theme.mutedMore}`}>
              <a href={CONFIG.links.github} target="_blank" rel="noopener noreferrer" className={theme.navTextHover}>GitHub</a>
              <a href={CONFIG.links.docs} className={theme.navTextHover}>Documentation</a>
              <a href="#" className={theme.navTextHover}>Terms</a>
              <a href="#" className={theme.navTextHover}>Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
