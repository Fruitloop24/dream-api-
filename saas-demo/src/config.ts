/**
 * ============================================================================
 * APP CONFIGURATION - Edit this file to customize your SaaS
 * ============================================================================
 *
 * This is the ONLY file you need to edit for branding.
 * All pages import from here. Run /setup to customize with AI assistance.
 */

export const CONFIG = {
  // -------------------------------------------------------------------------
  // BRAND
  // -------------------------------------------------------------------------
  appName: 'My SaaS',
  tagline: 'Your tagline here',

  // Logo: place file in public/ folder, or set to null for text-only
  logo: null as string | null, // e.g., '/logo.png'

  // Theme: 'light' (professional, clean) or 'dark' (modern, bold)
  theme: 'light' as 'light' | 'dark',

  // Primary accent color
  // Options: 'emerald', 'sky', 'violet', 'rose', 'amber', 'zinc'
  accentColor: 'emerald',

  // -------------------------------------------------------------------------
  // HERO SECTION
  // -------------------------------------------------------------------------
  hero: {
    headline: 'Build something amazing',
    subheadline: 'A brief description of what your product does and why customers will love it.',
    cta: 'Get Started',
    ctaSubtext: 'Free to start',
    // Hero image: place in public/, or null for no image
    image: null as string | null, // e.g., '/hero-mockup.png'
  },

  // -------------------------------------------------------------------------
  // SOCIAL PROOF
  // -------------------------------------------------------------------------
  socialProof: {
    enabled: false,
    headline: 'Trusted by teams at',
    // Add logo images to public/logos/ folder
    logos: [] as Array<{ name: string; src: string }>,
    // Example:
    // logos: [
    //   { name: 'Acme', src: '/logos/acme.svg' },
    //   { name: 'Globex', src: '/logos/globex.svg' },
    // ],
  },

  // -------------------------------------------------------------------------
  // HOW IT WORKS (3 steps)
  // -------------------------------------------------------------------------
  howItWorks: {
    headline: 'How It Works',
    subheadline: 'Get started in minutes',
    steps: [
      {
        number: '1',
        title: 'Sign Up',
        description: 'Create your free account in seconds.',
        icon: 'user',
      },
      {
        number: '2',
        title: 'Configure',
        description: 'Set up your preferences and get started.',
        icon: 'settings',
      },
      {
        number: '3',
        title: 'Launch',
        description: 'Start using the platform immediately.',
        icon: 'rocket',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FEATURES
  // -------------------------------------------------------------------------
  features: {
    headline: 'Everything You Need',
    subheadline: 'Powerful features to help you succeed',
    items: [
      {
        title: 'Easy to Use',
        description: 'Intuitive interface that anyone can master quickly.',
        icon: 'check',
      },
      {
        title: 'Secure',
        description: 'Enterprise-grade security to protect your data.',
        icon: 'shield',
      },
      {
        title: 'Fast',
        description: 'Lightning-fast performance you can count on.',
        icon: 'lightning',
      },
      {
        title: 'Analytics',
        description: 'Detailed insights to track your progress.',
        icon: 'chart',
      },
      {
        title: 'Support',
        description: 'Friendly support team ready to help.',
        icon: 'user',
      },
      {
        title: 'Integrations',
        description: 'Connect with your favorite tools.',
        icon: 'globe',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // PRICING SECTION (tiers come from API)
  // -------------------------------------------------------------------------
  pricing: {
    headline: 'Simple Pricing',
    subheadline: 'Start free, upgrade when you need more',
  },

  // -------------------------------------------------------------------------
  // FAQ
  // -------------------------------------------------------------------------
  faq: {
    headline: 'Frequently Asked Questions',
    items: [
      {
        question: 'How do I get started?',
        answer: 'Simply sign up for a free account and follow our quick setup guide. You\'ll be up and running in minutes.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Yes, you can cancel your subscription at any time. No long-term contracts or hidden fees.',
      },
      {
        question: 'Is my data secure?',
        answer: 'Absolutely. We use industry-standard encryption and security practices to keep your data safe.',
      },
      {
        question: 'Do you offer support?',
        answer: 'Yes, we offer support via email for all plans, with priority support for paid plans.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FINAL CTA
  // -------------------------------------------------------------------------
  finalCta: {
    headline: 'Ready to get started?',
    subheadline: 'Join thousands of happy customers today.',
    cta: 'Start Free Trial',
  },

  // -------------------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------------------
  footer: {
    links: [] as Array<{ label: string; href: string }>,
    // Example:
    // links: [
    //   { label: 'Privacy', href: '/privacy' },
    //   { label: 'Terms', href: '/terms' },
    // ],
  },
};

// ============================================================================
// COLOR UTILITIES - Don't modify below
// ============================================================================

const ACCENT_COLORS = {
  emerald: {
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    text: 'text-emerald-600',
    textHover: 'hover:text-emerald-500',
    border: 'border-emerald-600',
    hex: '#059669',
  },
  sky: {
    bg: 'bg-sky-600',
    bgHover: 'hover:bg-sky-500',
    text: 'text-sky-600',
    textHover: 'hover:text-sky-500',
    border: 'border-sky-600',
    hex: '#0284c7',
  },
  violet: {
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-500',
    text: 'text-violet-600',
    textHover: 'hover:text-violet-500',
    border: 'border-violet-600',
    hex: '#7c3aed',
  },
  rose: {
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-500',
    text: 'text-rose-600',
    textHover: 'hover:text-rose-500',
    border: 'border-rose-600',
    hex: '#e11d48',
  },
  amber: {
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    text: 'text-amber-600',
    textHover: 'hover:text-amber-500',
    border: 'border-amber-600',
    hex: '#d97706',
  },
  zinc: {
    bg: 'bg-zinc-800',
    bgHover: 'hover:bg-zinc-700',
    text: 'text-zinc-800',
    textHover: 'hover:text-zinc-700',
    border: 'border-zinc-800',
    hex: '#27272a',
  },
};

export function getAccentClasses() {
  return ACCENT_COLORS[CONFIG.accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.emerald;
}

export function getAccentHex() {
  return getAccentClasses().hex;
}

// ============================================================================
// THEME UTILITIES
// ============================================================================

const THEMES = {
  light: {
    // Main backgrounds
    pageBg: 'bg-slate-50',
    navBg: 'bg-white border-b border-slate-200',
    cardBg: 'bg-white border border-slate-200',
    sectionAltBg: 'bg-white',
    footerBg: 'bg-slate-100 border-t border-slate-200',
    // Text colors
    heading: 'text-slate-900',
    body: 'text-slate-600',
    muted: 'text-slate-400',
    // Interactive
    cardHover: 'hover:border-slate-300 hover:shadow-md',
    link: 'text-slate-600 hover:text-slate-900',
    // Dropdown (Nav)
    dropdownBg: 'bg-white border border-slate-200',
    dropdownDivider: 'border-slate-200',
    dropdownItem: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    buttonHover: 'hover:bg-slate-100',
    dangerItem: 'text-red-600 hover:text-red-700 hover:bg-red-50',
    progressBg: 'bg-slate-200',
    // Buttons
    buttonDisabled: 'bg-slate-200 text-slate-400',
    buttonSecondary: 'border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400',
  },
  dark: {
    // Main backgrounds
    pageBg: 'bg-zinc-950',
    navBg: 'bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50',
    cardBg: 'bg-zinc-900/70 border border-zinc-700/50',
    sectionAltBg: 'bg-zinc-900/40',
    footerBg: 'bg-zinc-950 border-t border-zinc-800',
    // Text colors
    heading: 'text-white',
    body: 'text-zinc-300',
    muted: 'text-zinc-500',
    // Interactive
    cardHover: 'hover:border-zinc-700',
    link: 'text-zinc-500 hover:text-zinc-300',
    // Dropdown (Nav)
    dropdownBg: 'bg-zinc-900 border border-zinc-800',
    dropdownDivider: 'border-zinc-800',
    dropdownItem: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
    buttonHover: 'hover:bg-zinc-900',
    dangerItem: 'text-red-400 hover:text-red-300 hover:bg-zinc-800',
    progressBg: 'bg-zinc-800',
    // Buttons
    buttonDisabled: 'bg-zinc-800 text-zinc-500',
    buttonSecondary: 'border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
  },
};

export function getThemeClasses() {
  return THEMES[CONFIG.theme] || THEMES.light;
}
