/**
 * ============================================================================
 * FRONTEND CONFIG - Edit this file to customize dream-api branding
 * ============================================================================
 *
 * This is the ONLY file you need to edit for branding.
 * All pages import from here. Change once, updates everywhere.
 *
 * AI FRIENDLY: This file is designed for easy AI editing.
 * Just describe what you want and the AI can modify THEMES or CONFIG.
 */

export const CONFIG = {
  // -------------------------------------------------------------------------
  // BRAND
  // -------------------------------------------------------------------------
  appName: 'dream-api',
  tagline: 'Auth + Billing + Usage Tracking for Indie Devs',

  // Logo: place file in public/ folder, or null for text-only
  logo: null as string | null, // e.g., '/logo.png'

  // Theme: 'dark' (current) or 'light'
  theme: 'dark' as 'light' | 'dark',

  // Primary accent color
  // Options: 'blue', 'emerald', 'violet', 'rose', 'amber', 'sky'
  accentColor: 'blue',

  // -------------------------------------------------------------------------
  // LINKS
  // -------------------------------------------------------------------------
  links: {
    github: 'https://github.com/Fruitloop24',
    docs: '/docs',
    // Live Demos (working auth + payments with test card 4242)
    saasDemo: 'https://clerk-frontend.pages.dev',
    storeDemo: 'https://ember-wick-demo.pages.dev',
    membershipDemo: 'https://fit-flow.pages.dev',
    // Templates - React (Vite)
    saasBasic: 'https://github.com/Fruitloop24/dream-saas-basic',
    storeBasic: 'https://github.com/Fruitloop24/dream-store-basic',
    membershipBasic: 'https://github.com/Fruitloop24/dream-membership-basic',
    // Templates - Next.js
    saasNext: 'https://github.com/Fruitloop24/dream-saas-next',
    storeNext: 'https://github.com/Fruitloop24/dream-store-next',
    membershipNext: 'https://github.com/Fruitloop24/dream-membership-next',
    // Self-host backend
    plugSaas: 'https://github.com/Fruitloop24/plug-saas',
  },

  // -------------------------------------------------------------------------
  // PRICING (displayed on landing page)
  // -------------------------------------------------------------------------
  pricing: {
    monthly: 19,
    trialDays: 14,
    includedUsers: 2000,
    overagePerUser: 0.03,
  },

  // -------------------------------------------------------------------------
  // LANDING PAGE CONTENT
  // -------------------------------------------------------------------------
  hero: {
    headline: 'Auth + Billing + Usage Tracking',
    subheadline: 'One API. Your Stripe.',
    highlight: 'Zero platform fees.',
    ctaPrimary: 'Start Free Trial',
    ctaSecondary: 'Watch 5-Min Setup',
    subtext: '14 days free • Credit card required • Cancel anytime',
  },

  // -------------------------------------------------------------------------
  // FEATURES (3 main cards)
  // -------------------------------------------------------------------------
  features: [
    {
      icon: '📊',
      title: 'SaaS Mode',
      description: 'Subscription tiers, usage limits, automatic enforcement. Perfect for AI tools, APIs, dev tools.',
    },
    {
      icon: '🛒',
      title: 'Store Mode',
      description: 'Products, cart, guest checkout. No per-user fees. Perfect for digital products, merch, courses.',
    },
    {
      icon: '💰',
      title: 'Your Money',
      description: 'Stripe Connect. Payments go directly to your Stripe. You handle disputes & refunds. We take $0.',
    },
  ],

  // -------------------------------------------------------------------------
  // DASHBOARD FEATURES (bullet points)
  // -------------------------------------------------------------------------
  dashboardFeatures: [
    { title: 'Change prices', subtitle: 'App updates instantly' },
    { title: 'Add tiers or products', subtitle: 'No redeploy needed' },
    { title: 'Upload product images', subtitle: 'Just drag and drop' },
    { title: 'Edit usage limits', subtitle: 'Takes 2 seconds' },
    { title: 'Unlimited projects', subtitle: 'Create as many as you need' },
    { title: 'Test → Live promotion', subtitle: 'One click when you\'re ready' },
  ],

  // -------------------------------------------------------------------------
  // HOW IT WORKS
  // -------------------------------------------------------------------------
  howItWorks: [
    {
      step: '1',
      title: 'Sign Up',
      description: 'Create account, connect your Stripe via OAuth. Requires verified Stripe account.',
    },
    {
      step: '2',
      title: 'Configure',
      description: 'Dashboard: tiers, products, prices, limits. Upload images. Set features. No code.',
    },
    {
      step: '3',
      title: 'Launch',
      description: 'One publishable key in frontend. Or use our free templates. That\'s it.',
    },
  ],

  // -------------------------------------------------------------------------
  // TECH HIGHLIGHTS
  // -------------------------------------------------------------------------
  techHighlights: [
    { icon: '⚡', title: 'Edge Compute', subtitle: '<50ms latency' },
    { icon: '☁️', title: 'Serverless', subtitle: 'Auto-scaling' },
    { icon: '🗄️', title: 'No DB to Maintain', subtitle: 'We handle it' },
    { icon: '🛡️', title: 'DDoS Protection', subtitle: 'Built-in' },
  ],

  // -------------------------------------------------------------------------
  // PRICING FEATURES
  // -------------------------------------------------------------------------
  pricingFeatures: [
    'SaaS: 2,000 end-users included',
    '$0.03/user after (scales with you)',
    'Store: unlimited guest checkout',
    'Unlimited API calls',
    'Unlimited projects',
    'Dashboard access',
    'Free templates',
  ],

  // No fees (crossed out items)
  noFees: [
    'Platform fees on transactions',
    'Revenue share',
    'Hidden costs',
  ],

  // -------------------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------------------
  footer: {
    copyright: '© 2025 dream-api. All rights reserved.',
    builtWith: ['Stripe', 'Clerk', 'Cloudflare'],
  },
};

// ============================================================================
// ACCENT COLORS
// ============================================================================

const ACCENT_COLORS = {
  blue: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-500',
    bgLight: 'bg-blue-500/20',
    text: 'text-blue-400',
    textBold: 'text-blue-500',
    border: 'border-blue-500',
    gradient: 'from-blue-600 to-blue-800',
  },
  emerald: {
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    bgLight: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    textBold: 'text-emerald-500',
    border: 'border-emerald-500',
    gradient: 'from-emerald-600 to-emerald-800',
  },
  violet: {
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-500',
    bgLight: 'bg-violet-500/20',
    text: 'text-violet-400',
    textBold: 'text-violet-500',
    border: 'border-violet-500',
    gradient: 'from-violet-600 to-violet-800',
  },
  rose: {
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-500',
    bgLight: 'bg-rose-500/20',
    text: 'text-rose-400',
    textBold: 'text-rose-500',
    border: 'border-rose-500',
    gradient: 'from-rose-600 to-rose-800',
  },
  amber: {
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    bgLight: 'bg-amber-500/20',
    text: 'text-amber-400',
    textBold: 'text-amber-500',
    border: 'border-amber-500',
    gradient: 'from-amber-600 to-amber-800',
  },
  sky: {
    bg: 'bg-sky-600',
    bgHover: 'hover:bg-sky-500',
    bgLight: 'bg-sky-500/20',
    text: 'text-sky-400',
    textBold: 'text-sky-500',
    border: 'border-sky-500',
    gradient: 'from-sky-600 to-sky-800',
  },
};

// ============================================================================
// THEME CLASSES
// ============================================================================

const THEMES = {
  dark: {
    // Page
    pageBg: 'bg-gray-900',
    pageGradient: 'bg-gradient-to-b from-gray-900 to-gray-800',
    // Nav
    navBg: 'bg-gray-900/95 backdrop-blur',
    navBorder: 'border-gray-700',
    navText: 'text-gray-300',
    navTextHover: 'hover:text-white',
    // Cards
    cardBg: 'bg-gray-800',
    cardBgAlt: 'bg-gray-800/50',
    cardBorder: 'border-gray-700',
    cardHover: 'hover:border-gray-600',
    // Text
    heading: 'text-white',
    body: 'text-gray-300',
    muted: 'text-gray-400',
    mutedMore: 'text-gray-500',
    // Sections
    sectionAlt: 'bg-gray-800/30',
    // Inputs
    inputBg: 'bg-gray-700',
    inputBorder: 'border-gray-600',
    inputText: 'text-white',
    // Code blocks
    codeBg: 'bg-gray-950',
    codeText: 'text-green-400',
    // Buttons
    buttonSecondary: 'border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white',
    // Dividers
    divider: 'border-gray-700',
    // Footer
    footerBg: 'bg-gray-900',
    footerBorder: 'border-gray-800',
  },
  light: {
    // Page
    pageBg: 'bg-slate-50',
    pageGradient: 'bg-gradient-to-b from-slate-100 to-white',
    // Nav
    navBg: 'bg-white/95 backdrop-blur',
    navBorder: 'border-slate-200',
    navText: 'text-slate-600',
    navTextHover: 'hover:text-slate-900',
    // Cards
    cardBg: 'bg-white',
    cardBgAlt: 'bg-slate-50',
    cardBorder: 'border-slate-200',
    cardHover: 'hover:border-slate-300',
    // Text
    heading: 'text-slate-900',
    body: 'text-slate-600',
    muted: 'text-slate-500',
    mutedMore: 'text-slate-400',
    // Sections
    sectionAlt: 'bg-slate-100',
    // Inputs
    inputBg: 'bg-white',
    inputBorder: 'border-slate-300',
    inputText: 'text-slate-900',
    // Code blocks
    codeBg: 'bg-slate-900',
    codeText: 'text-green-400',
    // Buttons
    buttonSecondary: 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900',
    // Dividers
    divider: 'border-slate-200',
    // Footer
    footerBg: 'bg-slate-100',
    footerBorder: 'border-slate-200',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTheme() {
  return THEMES[CONFIG.theme] || THEMES.dark;
}

export function getAccent() {
  return ACCENT_COLORS[CONFIG.accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.blue;
}

// Convenience: get both
export function getStyles() {
  return {
    theme: getTheme(),
    accent: getAccent(),
  };
}

// Button class builder
export function getPrimaryButtonClasses() {
  const accent = getAccent();
  return `${accent.bg} ${accent.bgHover} text-white font-bold rounded-lg transition`;
}

export function getSecondaryButtonClasses() {
  const theme = getTheme();
  return `${theme.buttonSecondary} font-medium rounded-lg transition`;
}
