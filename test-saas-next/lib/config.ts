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
  appName: 'MangaVault',
  tagline: 'Unlimited manga, one subscription',

  // Logo: place file in public/ folder, or set to null for text-only
  logo: null as string | null,

  // Theme: 'light' (professional, clean) or 'dark' (modern, bold)
  theme: 'dark' as 'light' | 'dark',

  // Primary accent color
  accentColor: 'rose',

  // -------------------------------------------------------------------------
  // HERO SECTION
  // -------------------------------------------------------------------------
  hero: {
    headline: '10,000+ manga titles. Zero limits.',
    subheadline: 'Read the latest chapters from Shonen Jump, seinen classics, and indie creators. New releases every day. Cancel anytime.',
    cta: 'Start Reading',
    ctaSubtext: '$1/month • Unlimited access',
    image: null as string | null,
  },

  // -------------------------------------------------------------------------
  // SOCIAL PROOF
  // -------------------------------------------------------------------------
  socialProof: {
    enabled: false,
    headline: 'Featured publishers',
    logos: [] as Array<{ name: string; src: string }>,
  },

  // -------------------------------------------------------------------------
  // HOW IT WORKS (3 steps)
  // -------------------------------------------------------------------------
  howItWorks: {
    headline: 'Start Reading in Seconds',
    subheadline: 'No complicated setup',
    steps: [
      {
        number: '1',
        title: 'Subscribe',
        description: 'One click, $1/month. Access everything instantly.',
        icon: 'check',
      },
      {
        number: '2',
        title: 'Browse',
        description: 'Explore our massive library by genre, popularity, or new releases.',
        icon: 'globe',
      },
      {
        number: '3',
        title: 'Read',
        description: 'Enjoy on any device. Download for offline reading.',
        icon: 'lightning',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FEATURES
  // -------------------------------------------------------------------------
  features: {
    headline: 'Why MangaVault?',
    subheadline: 'Built for true manga fans',
    items: [
      {
        title: 'Simulpub Releases',
        description: 'Read new chapters the same day they drop in Japan.',
        icon: 'rocket',
      },
      {
        title: 'Offline Mode',
        description: 'Download chapters and read anywhere, anytime.',
        icon: 'shield',
      },
      {
        title: 'No Ads Ever',
        description: 'Pure, uninterrupted reading experience.',
        icon: 'check',
      },
      {
        title: 'HD Quality',
        description: 'Crystal clear pages on any screen size.',
        icon: 'chart',
      },
      {
        title: 'Reading Lists',
        description: 'Track your progress across every series.',
        icon: 'user',
      },
      {
        title: 'Multi-device Sync',
        description: 'Pick up where you left off on any device.',
        icon: 'globe',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // PRICING SECTION (tiers come from API)
  // -------------------------------------------------------------------------
  pricing: {
    headline: 'Simple, Fair Pricing',
    subheadline: 'Less than a coffee. Unlimited manga.',
  },

  // -------------------------------------------------------------------------
  // FAQ
  // -------------------------------------------------------------------------
  faq: {
    headline: 'Questions?',
    items: [
      {
        question: 'What manga is available?',
        answer: 'We have over 10,000 titles including popular series from Shonen Jump, seinen classics, shojo favorites, and indie creators. New series added weekly.',
      },
      {
        question: 'Can I read offline?',
        answer: 'Yes! Download any chapter to read offline. Perfect for commutes or travel.',
      },
      {
        question: 'How often are new chapters released?',
        answer: 'Popular series get simulpub releases (same day as Japan). Other series update weekly or as new volumes are published.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. Cancel with one click, no questions asked. Your access continues until the end of your billing period.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FINAL CTA
  // -------------------------------------------------------------------------
  finalCta: {
    headline: 'Ready to dive in?',
    subheadline: 'Join 50,000+ manga readers. Start your unlimited reading today.',
    cta: 'Get Unlimited Access',
  },

  // -------------------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------------------
  footer: {
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
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
