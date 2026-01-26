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
            <a href="/" className="flex items-center gap-2">
              {CONFIG.logo && <img src={CONFIG.logo} alt={CONFIG.appName} className="h-10 w-auto rounded-lg" />}
              <span className={`text-xl font-bold ${theme.heading}`}>{CONFIG.appName}</span>
            </a>
            <div className={`hidden md:flex items-center gap-6 text-sm ${theme.navText}`}>
              <a href="/who-am-i" className={theme.navTextHover}>Who Am I</a>
              <a href="/why-trust-us" className={theme.navTextHover}>Why Trust Us</a>
              <a href="/docs" className={theme.navTextHover}>Quickstart</a>
              <a href="/templates" className={theme.navTextHover}>Templates</a>
              <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={theme.navTextHover}>Open Source</a>
              <a href="#pricing" className={theme.navTextHover}>Pricing</a>
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
      <section className="pt-32 pb-12 px-4 hero-bg">
        <div className="max-w-4xl mx-auto text-center">
          {/* Equation Hero */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight animate-fade-in-up">
              SaaS <span className={accent.text}>+</span> Store <span className={accent.text}>+</span> Usage
            </h1>
            <div className={`text-3xl md:text-4xl font-bold ${accent.text} mb-4 animate-fade-in-up delay-100`}>=</div>
            <div className="flex items-center justify-center gap-3 animate-fade-in-up delay-200">
              {CONFIG.logo && <img src={CONFIG.logo} alt={CONFIG.appName} className="h-12 md:h-16 w-auto rounded-xl" />}
              <span className="text-3xl md:text-5xl font-black">{CONFIG.appName}</span>
            </div>
          </div>
          <p className={`text-xl md:text-2xl ${theme.muted} mb-8 max-w-2xl mx-auto animate-fade-in-up delay-300`}>
            {CONFIG.hero.subheadline} <span className={`${accent.text} font-semibold`}>{CONFIG.hero.highlight}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 animate-fade-in-up delay-400">
            <a href="/sign-up" className={`px-8 py-4 ${primaryBtn} text-lg btn-glow`}>
              {CONFIG.hero.ctaPrimary}
            </a>
            <a href="#demos" className={`px-8 py-4 ${secondaryBtn} text-lg hover:scale-105 transition-transform`}>
              Try Live Demos
            </a>
          </div>
          <p className={`text-sm ${theme.mutedMore} mb-8 animate-fade-in delay-500`}>{CONFIG.hero.subtext}</p>

          {/* Built with badge */}
          <div className="flex items-center justify-center gap-4 animate-fade-in delay-600">
            <span className={`text-sm ${theme.mutedMore}`}>Built with</span>
            <div className="flex items-center gap-8">
              {/* Stripe */}
              <div className="flex flex-col items-center gap-1">
                <svg className="h-7" viewBox="0 0 468 222.5" fill="#635BFF">
                  <path d="M414 113.4c0-25.6-12.4-45.8-36.1-45.8-23.8 0-38.2 20.2-38.2 45.6 0 30.1 17 45.3 41.4 45.3 11.9 0 20.9-2.7 27.7-6.5v-20c-6.8 3.4-14.6 5.5-24.5 5.5-9.7 0-18.3-3.4-19.4-15.2h48.9c0-1.3.2-6.5.2-8.9zm-49.4-9.5c0-11.3 6.9-16 13.2-16 6.1 0 12.6 4.7 12.6 16h-25.8zM301.1 67.6c-9.8 0-16.1 4.6-19.6 7.8l-1.3-6.2h-22v116.6l25-5.3.1-28.3c3.6 2.6 8.9 6.3 17.7 6.3 17.9 0 34.2-14.4 34.2-46.1-.1-29-16.6-44.8-34.1-44.8zm-6 68.9c-5.9 0-9.4-2.1-11.8-4.7l-.1-37.1c2.6-2.9 6.2-4.9 11.9-4.9 9.1 0 15.4 10.2 15.4 23.3 0 13.4-6.2 23.4-15.4 23.4zM223.8 61.7l25.1-5.4V36l-25.1 5.3zM223.8 69.3h25.1v87.5h-25.1zM196.9 76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7 15.9-6.3 19-5.2v-23c-3.2-1.2-14.9-3.4-20.8 7.4zM146.9 47.6l-24.4 5.2-.1 80.1c0 14.8 11.1 25.7 25.9 25.7 8.2 0 14.2-1.5 17.5-3.3V135c-3.2 1.3-19 5.9-19-8.9V90.6h19V69.3h-19l.1-21.7zM79.3 94.7c0-3.9 3.2-5.4 8.5-5.4 7.6 0 17.2 2.3 24.8 6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5 67.6 54 78.2 54 95.9c0 27.6 38 23.2 38 35.1 0 4.6-4 6.1-9.6 6.1-8.3 0-18.9-3.4-27.3-8v23.8c9.3 4 18.7 5.7 27.3 5.7 20.8 0 35.1-10.3 35.1-28.2-.1-29.8-38.2-24.5-38.2-35.7z"/>
                </svg>
                <span className={`text-xs ${theme.mutedMore}`}>Stripe</span>
              </div>
              {/* Clerk */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-bold text-[#6C47FF]">clerk</span>
                <span className={`text-xs ${theme.mutedMore}`}>Clerk</span>
              </div>
              {/* Cloudflare */}
              <div className="flex flex-col items-center gap-1">
                <svg className="h-7" viewBox="0 0 130 43" fill="none">
                  <path d="M26.9 30.6l.8-2.6c.6-1.8.4-3.5-.6-4.7-1-1.1-2.5-1.8-4.3-1.8H6.5c-.2 0-.4-.1-.5-.2-.1-.2-.1-.4 0-.6.7-2.2 2.8-3.8 5.2-3.8h.5c.3 0 .6-.2.7-.5 1.7-5.1 6.5-8.5 11.9-8.5 5.8 0 10.8 3.9 12.3 9.3.1.3.4.5.7.5 3.7.3 6.7 3.1 7.2 6.8 0 .3.3.6.6.6h2.3c2.1 0 4 1.3 4.8 3.2.1.2.1.5 0 .7-.1.2-.3.3-.6.3l-24.1.1c-.3 0-.5-.3-.6-.5l-.1-.3z" fill="#F6821F"/>
                  <path d="M31.6 30.7c.2.2.1.5-.1.6l-.3.1h-5.4c-.2 0-.5-.1-.6-.3-.7-1.9.2-4 2.1-4.7.5-.2 1-.3 1.5-.3 1.1 0 2.1.5 2.8 1.4.1.2.2.4.1.6l-.1 2.6z" fill="#FAAD3F"/>
                </svg>
                <span className={`text-xs ${theme.mutedMore}`}>Cloudflare</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demos Banner - Dark Contrasted Cards */}
      <section id="demos" className={`py-12 px-4 ${accent.bg}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Try Working Demos - Full Auth &amp; Payments</h2>
            <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-lg px-4 py-2">
              <span className="text-white/60 text-sm">Test card:</span>
              <code className="font-mono text-white">4242 4242 4242 4242</code>
              <span className="text-white/40">|</span>
              <code className="font-mono text-white/80">12/34</code>
              <span className="text-white/40">|</span>
              <code className="font-mono text-white/80">123</code>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* SaaS Demo */}
            <a href={CONFIG.links.saasDemo} target="_blank" rel="noopener noreferrer"
               className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 card-lift block group`}>
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-violet-500/30 transition-all">
                <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">SaaS Demo</h3>
              <p className={`${theme.muted} text-sm`}>Usage tracking, subscription tiers, automatic limits.</p>
            </a>
            {/* Store Demo */}
            <a href={CONFIG.links.storeDemo} target="_blank" rel="noopener noreferrer"
               className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 card-lift block group`}>
              <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-500/30 transition-all">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Store Demo</h3>
              <p className={`${theme.muted} text-sm`}>Products, cart, guest checkout. No per-user fees.</p>
            </a>
            {/* Membership Demo */}
            <a href={CONFIG.links.membershipDemo} target="_blank" rel="noopener noreferrer"
               className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 card-lift block group`}>
              <div className="w-14 h-14 rounded-xl bg-sky-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-sky-500/30 transition-all">
                <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Membership Demo</h3>
              <p className={`${theme.muted} text-sm`}>Content gating, paywalls, auto-checkout.</p>
            </a>
          </div>
          <a href="/templates" className="flex items-center justify-center gap-2 mt-8 text-white hover:text-white/80 transition group">
            <span className="text-lg font-medium">Build yours now with our free AI-configurable templates</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Stripe Requirement + Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            All you need is a verified Stripe account
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Zero Platform Fees</h4>
              <p className={`${theme.muted} text-sm`}>We never touch your money. Payments go direct to your Stripe. You handle disputes & refunds.</p>
            </div>
            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">OAuth in Seconds</h4>
              <p className={`${theme.muted} text-sm`}>Connect your Stripe via OAuth. Configure products in dashboard. Test mode → Live with one key swap.</p>
            </div>
            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">You Control Everything</h4>
              <p className={`${theme.muted} text-sm`}>Trial periods, tax collection, pricing changes. All from your dashboard. No code, no deploys.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section - 5 Minute Setup - THE HOOK */}
      <section id="video" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Set Up in 5 Minutes</h2>
            <p className={`${theme.muted} text-lg`}>Clone. Run AI commands. Ship.</p>
          </div>
          <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-2xl overflow-hidden`}>
            <video
              className="w-full aspect-video"
              controls
              preload="metadata"
              poster="/clone-poster.jpg"
            >
              <source src="/clone.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Testimonials - Social Proof */}
      <section className={`py-16 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Testimonial 1 - Non-tech user */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 relative`}>
              <div className="absolute -top-3 left-6">
                <span className="text-4xl text-sky-500/30">"</span>
              </div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className={`${theme.body} text-sm mb-4 leading-relaxed`}>
                I'm not a coder. Used the template with <span className="text-sky-400 font-medium">Cursor</span> and had my SaaS up in under 15 minutes. Auth, billing, everything.
              </p>
              <p className="font-semibold text-white">S. Stonecypher</p>
              <p className={`text-xs ${theme.mutedMore}`}>Southland Wood Company</p>
            </div>

            {/* Testimonial 2 - Developer */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 relative`}>
              <div className="absolute -top-3 left-6">
                <span className="text-4xl text-sky-500/30">"</span>
              </div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className={`${theme.body} text-sm mb-4 leading-relaxed`}>
                Used the AI prompt from the docs and had auth + billing on my API in no time. They really mean <span className="text-sky-400 font-medium">one key</span>.
              </p>
              <p className="font-semibold text-white">J. Boone</p>
              <p className={`text-xs ${theme.mutedMore}`}>Boone Farms</p>
            </div>

            {/* Testimonial 3 - Store owner */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 relative`}>
              <div className="absolute -top-3 left-6">
                <span className="text-4xl text-sky-500/30">"</span>
              </div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className={`${theme.body} text-sm mb-4 leading-relaxed`}>
                Got my store set up in under 10 minutes. Just used photos from my phone for products. <span className="text-sky-400 font-medium">PWA and everything</span>.
              </p>
              <p className="font-semibold text-white">C. Crabb</p>
              <p className={`text-xs ${theme.mutedMore}`}>Ocmulgee Retrievers</p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get vs What You Don't Build */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What You Get vs What You Don't Build
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* What You Get */}
            <div className={`${theme.cardBg} border-2 ${accent.border} rounded-xl p-8`}>
              <h3 className={`text-2xl font-bold ${accent.text} mb-2`}>
                What You Get
              </h3>
              <div className={`h-1 w-24 ${accent.bg} rounded mb-6`}></div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">User Authentication</p>
                    <p className={`text-sm ${theme.muted}`}>Sign up, sign in, sign out, account settings</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">Subscription Billing</p>
                    <p className={`text-sm ${theme.muted}`}>Checkout, upgrades, cancellations, billing portal</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">Usage Tracking</p>
                    <p className={`text-sm ${theme.muted}`}>Metered billing, automatic limit enforcement</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">Unlimited Guest Checkout</p>
                    <p className={`text-sm ${theme.muted}`}>Store mode with no per-user fees</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">Instant Updates</p>
                    <p className={`text-sm ${theme.muted}`}>Change prices in dashboard, app updates automatically</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">Webhook Idempotency</p>
                    <p className={`text-sm ${theme.muted}`}>Duplicate events handled, no double charges</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className={`${accent.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-medium text-white">Customer Dashboard</p>
                    <p className={`text-sm ${theme.muted}`}>View users, plans, usage, revenue metrics</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* What You Don't Build */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8`}>
              <h3 className="text-2xl font-bold text-red-400 mb-2">
                What You Don't Build
              </h3>
              <div className="h-1 w-24 bg-red-500 rounded mb-6"></div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Auth system from scratch</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No JWT logic, session management, or security audits</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Stripe webhook handlers</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No signature verification or event processing</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Usage database</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No schema design, queries, or period resets</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Plan enforcement logic</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No "check if user can do X" scattered everywhere</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Customer admin panel</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No internal tools to view/manage subscribers</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Deployment for pricing changes</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No CI/CD just to update a price</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400 line-through">Idempotency handling</p>
                    <p className={`text-sm ${theme.mutedMore}`}>No deduplication logic for retried webhooks</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <p className={`text-center ${theme.muted} mt-8 text-lg`}>
            Focus on your product. We handle the infrastructure.
          </p>
        </div>
      </section>

      {/* Video Section - Store Dashboard Demo */}
      <section id="dashboard" className={`py-20 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">No Code. No Deploys. Just Dashboard.</h2>
            <p className={`${theme.muted} text-lg`}>Change prices, toggle tax, update limits. Your app updates instantly.</p>
          </div>
          <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-2xl overflow-hidden`}>
            <video
              className="w-full aspect-video"
              controls
              preload="metadata"
              poster="/store-dash-poster.jpg"
            >
              <source src="/store-dash.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <p className={`text-center mt-6 ${theme.muted}`}>
            <a href="/dashboard.mp4" className={`${accent.text} hover:underline`}>
              See the SaaS dashboard too →
            </a>
          </p>
        </div>
      </section>

      {/* SDK Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">One Key. Four Calls. Done.</h2>
            <p className={`${theme.muted} text-lg`}>Published on npm. Safe for frontend.</p>
          </div>

          <div className={`${theme.codeBg} border ${theme.cardBorder} rounded-xl overflow-hidden code-glow`}>
            <div className={`${theme.cardBgAlt} px-4 py-3 border-b ${theme.cardBorder} flex items-center gap-2`}>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className={`text-xs ${theme.mutedMore} ml-3 font-mono`}>~/my-saas</span>
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
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
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
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
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
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
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
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Edge Compute */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-sky-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="font-bold text-lg">Edge Compute</p>
              <p className={`text-sm ${theme.muted}`}>&lt;50ms worldwide</p>
            </div>
            {/* Serverless */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <p className="font-bold text-lg">Serverless</p>
              <p className={`text-sm ${theme.muted}`}>Auto-scaling</p>
            </div>
            {/* No DB to Manage */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <p className="font-bold text-lg">No DB to Manage</p>
              <p className={`text-sm ${theme.muted}`}>We handle it</p>
            </div>
            {/* DDoS Protection */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="font-bold text-lg">DDoS Protection</p>
              <p className={`text-sm ${theme.muted}`}>Built-in</p>
            </div>
            {/* Webhook Security */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="font-bold text-lg">Webhook Security</p>
              <p className={`text-sm ${theme.muted}`}>Signed payloads</p>
            </div>
            {/* TypeScript SDK */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="font-bold text-lg">TypeScript SDK</p>
              <p className={`text-sm ${theme.muted}`}>npm install</p>
            </div>
            {/* Rate Limiting */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-lg">Rate Limiting</p>
              <p className={`text-sm ${theme.muted}`}>Per-user controls</p>
            </div>
            {/* Global CDN */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-lg">Global CDN</p>
              <p className={`text-sm ${theme.muted}`}>99.9% uptime</p>
            </div>
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

            <a href="/sign-up" className={`block w-full py-4 ${primaryBtn} text-center text-lg btn-glow`}>
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
            <a href="/sign-up" className={`px-8 py-4 ${primaryBtn} text-lg btn-glow`}>Start Free Trial</a>
            <a href={CONFIG.links.docs} className={`px-8 py-4 ${secondaryBtn} text-lg hover:scale-105 transition-transform`}>View Documentation</a>
          </div>
        </div>
      </section>

      {/* Built On */}
      <section className={`py-16 px-4 border-t ${theme.footerBorder}`}>
        <div className="max-w-4xl mx-auto">
          <p className={`text-center ${theme.mutedMore} text-sm mb-10`}>Built on</p>
          <div className="flex justify-center items-center gap-16 md:gap-24">
            {/* Stripe */}
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 hover:opacity-80 transition">
              <svg className="h-12" viewBox="0 0 468 222.5" fill="#635BFF">
                <path d="M414 113.4c0-25.6-12.4-45.8-36.1-45.8-23.8 0-38.2 20.2-38.2 45.6 0 30.1 17 45.3 41.4 45.3 11.9 0 20.9-2.7 27.7-6.5v-20c-6.8 3.4-14.6 5.5-24.5 5.5-9.7 0-18.3-3.4-19.4-15.2h48.9c0-1.3.2-6.5.2-8.9zm-49.4-9.5c0-11.3 6.9-16 13.2-16 6.1 0 12.6 4.7 12.6 16h-25.8zM301.1 67.6c-9.8 0-16.1 4.6-19.6 7.8l-1.3-6.2h-22v116.6l25-5.3.1-28.3c3.6 2.6 8.9 6.3 17.7 6.3 17.9 0 34.2-14.4 34.2-46.1-.1-29-16.6-44.8-34.1-44.8zm-6 68.9c-5.9 0-9.4-2.1-11.8-4.7l-.1-37.1c2.6-2.9 6.2-4.9 11.9-4.9 9.1 0 15.4 10.2 15.4 23.3 0 13.4-6.2 23.4-15.4 23.4zM223.8 61.7l25.1-5.4V36l-25.1 5.3zM223.8 69.3h25.1v87.5h-25.1zM196.9 76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7 15.9-6.3 19-5.2v-23c-3.2-1.2-14.9-3.4-20.8 7.4zM146.9 47.6l-24.4 5.2-.1 80.1c0 14.8 11.1 25.7 25.9 25.7 8.2 0 14.2-1.5 17.5-3.3V135c-3.2 1.3-19 5.9-19-8.9V90.6h19V69.3h-19l.1-21.7zM79.3 94.7c0-3.9 3.2-5.4 8.5-5.4 7.6 0 17.2 2.3 24.8 6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5 67.6 54 78.2 54 95.9c0 27.6 38 23.2 38 35.1 0 4.6-4 6.1-9.6 6.1-8.3 0-18.9-3.4-27.3-8v23.8c9.3 4 18.7 5.7 27.3 5.7 20.8 0 35.1-10.3 35.1-28.2-.1-29.8-38.2-24.5-38.2-35.7z"/>
              </svg>
              <span className={`text-sm font-medium ${theme.muted}`}>Stripe</span>
            </a>
            {/* Clerk */}
            <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 hover:opacity-80 transition">
              <span className="text-3xl font-bold text-[#6C47FF]">clerk</span>
              <span className={`text-sm font-medium ${theme.muted}`}>Clerk</span>
            </a>
            {/* Cloudflare */}
            <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 hover:opacity-80 transition">
              <svg className="h-12" viewBox="0 0 130 43" fill="none">
                <path d="M26.9 30.6l.8-2.6c.6-1.8.4-3.5-.6-4.7-1-1.1-2.5-1.8-4.3-1.8H6.5c-.2 0-.4-.1-.5-.2-.1-.2-.1-.4 0-.6.7-2.2 2.8-3.8 5.2-3.8h.5c.3 0 .6-.2.7-.5 1.7-5.1 6.5-8.5 11.9-8.5 5.8 0 10.8 3.9 12.3 9.3.1.3.4.5.7.5 3.7.3 6.7 3.1 7.2 6.8 0 .3.3.6.6.6h2.3c2.1 0 4 1.3 4.8 3.2.1.2.1.5 0 .7-.1.2-.3.3-.6.3l-24.1.1c-.3 0-.5-.3-.6-.5l-.1-.3z" fill="#F6821F"/>
                <path d="M31.6 30.7c.2.2.1.5-.1.6l-.3.1h-5.4c-.2 0-.5-.1-.6-.3-.7-1.9.2-4 2.1-4.7.5-.2 1-.3 1.5-.3 1.1 0 2.1.5 2.8 1.4.1.2.2.4.1.6l-.1 2.6z" fill="#FAAD3F"/>
              </svg>
              <span className={`text-sm font-medium ${theme.muted}`}>Cloudflare</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 border-t ${theme.footerBorder} ${theme.footerBg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                {CONFIG.logo && <img src={CONFIG.logo} alt={CONFIG.appName} className="h-8 w-auto rounded-lg" />}
                <span className={`text-lg font-bold ${theme.heading}`}>{CONFIG.appName}</span>
              </div>
              <p className={`${theme.muted} text-sm mb-4`}>
                A product of {CONFIG.company.name}
              </p>
              <div className={`${theme.mutedMore} text-sm space-y-1`}>
                <p>{CONFIG.company.address}</p>
                <p>
                  <a href={`mailto:${CONFIG.company.email.sales}`} className={theme.navTextHover}>{CONFIG.company.email.sales}</a>
                </p>
                <p>Telegram for quick questions</p>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className={`font-semibold ${theme.heading} mb-4`}>Product</h4>
              <ul className={`space-y-2 text-sm ${theme.mutedMore}`}>
                <li><a href={CONFIG.links.docs} className={theme.navTextHover}>Documentation</a></li>
                <li><a href="/templates" className={theme.navTextHover}>Templates</a></li>
                <li><a href="#pricing" className={theme.navTextHover}>Pricing</a></li>
                <li><a href="/sla" className={theme.navTextHover}>Service Level</a></li>
                <li><a href="/about" className={theme.navTextHover}>About</a></li>
              </ul>
            </div>

            {/* Legal + Open Source */}
            <div>
              <h4 className={`font-semibold ${theme.heading} mb-4`}>Legal & Open Source</h4>
              <ul className={`space-y-2 text-sm ${theme.mutedMore}`}>
                <li><a href="/privacy" className={theme.navTextHover}>Privacy Policy</a></li>
                <li><a href="/terms" className={theme.navTextHover}>Terms of Service</a></li>
                <li>
                  <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={theme.navTextHover}>
                    plug-saas (OSS Foundation)
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={`pt-8 border-t ${theme.footerBorder} flex flex-col md:flex-row justify-between items-center gap-4`}>
            <p className={`${theme.mutedMore} text-sm`}>{CONFIG.footer.copyright}</p>
            <p className={`${theme.mutedMore} text-xs`}>
              CSV export anytime. Your Stripe, your customers, your data.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
