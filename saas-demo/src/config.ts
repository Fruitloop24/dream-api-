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
  appName: 'PixelForge',
  tagline: 'AI Image Generation',

  // Logo: place file in public/ folder, or set to null for text-only
  logo: '/pixelforge-logo.png',

  // Theme: 'light' (professional, clean) or 'dark' (modern, bold)
  theme: 'dark' as 'light' | 'dark',

  // Primary accent color
  // Options: 'emerald', 'sky', 'violet', 'rose', 'amber', 'zinc'
  accentColor: 'amber',

  // Demo mode - shows banner linking to Dream API
  demo: {
    enabled: true,
    message: 'This is a demo of a SaaS built with Dream API',
    linkText: 'Build yours →',
    linkUrl: 'https://dreamapi.io',
  },

  // -------------------------------------------------------------------------
  // HERO SECTION
  // -------------------------------------------------------------------------
  hero: {
    headline: 'Turn Ideas Into Stunning Visuals',
    subheadline: 'Generate beautiful AI images in seconds. No design skills required. Just describe what you want and watch the magic happen.',
    cta: 'Start Creating Free',
    ctaSubtext: '25 free generations',
    // Hero image: place in public/, or null for no image
    image: '/hero.png',
  },

  // -------------------------------------------------------------------------
  // SOCIAL PROOF
  // -------------------------------------------------------------------------
  socialProof: {
    enabled: false,
    headline: 'Trusted by creators worldwide',
    logos: [] as Array<{ name: string; src: string }>,
  },

  // -------------------------------------------------------------------------
  // HOW IT WORKS (3 steps)
  // -------------------------------------------------------------------------
  howItWorks: {
    headline: 'Create in 3 Simple Steps',
    subheadline: 'From idea to image in under a minute',
    steps: [
      {
        number: '1',
        title: 'Describe',
        description: 'Type what you want to see. Be as detailed or simple as you like.',
        icon: 'edit',
      },
      {
        number: '2',
        title: 'Generate',
        description: 'Our AI transforms your words into stunning visuals instantly.',
        icon: 'lightning',
      },
      {
        number: '3',
        title: 'Download',
        description: 'Save your creations in high resolution. Use them anywhere.',
        icon: 'download',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FEATURES
  // -------------------------------------------------------------------------
  features: {
    headline: 'Powerful AI at Your Fingertips',
    subheadline: 'Everything you need to bring your vision to life',
    items: [
      {
        title: 'Lightning Fast',
        description: 'Generate images in seconds, not minutes. No waiting around.',
        icon: 'lightning',
      },
      {
        title: 'High Resolution',
        description: 'Download your creations in stunning 4K quality.',
        icon: 'image',
      },
      {
        title: 'Multiple Styles',
        description: 'Photorealistic, artistic, anime, and more art styles.',
        icon: 'palette',
      },
      {
        title: 'Private & Secure',
        description: 'Your prompts and images are yours. We never share them.',
        icon: 'shield',
      },
      {
        title: 'Commercial Use',
        description: 'Full rights to use your generated images commercially.',
        icon: 'check',
      },
      {
        title: 'No Watermarks',
        description: 'Clean exports without any branding or watermarks.',
        icon: 'star',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // PRICING SECTION (tiers come from API)
  // -------------------------------------------------------------------------
  pricing: {
    headline: 'Simple, Transparent Pricing',
    subheadline: 'Start free. Upgrade when you need more generations.',
  },

  // -------------------------------------------------------------------------
  // FAQ
  // -------------------------------------------------------------------------
  faq: {
    headline: 'Frequently Asked Questions',
    items: [
      {
        question: 'How many images can I generate?',
        answer: 'Free users get 25 generations per month. Pro gets 50, and Dev gets 100. Generations reset monthly.',
      },
      {
        question: 'What image styles are available?',
        answer: 'We support photorealistic, digital art, anime, oil painting, watercolor, 3D render, and many more styles.',
      },
      {
        question: 'Can I use the images commercially?',
        answer: 'Yes! All generated images are yours to use however you want, including commercial projects.',
      },
      {
        question: 'What resolution are the images?',
        answer: 'All plans get high-resolution 4K exports (4096x4096). Perfect for print and digital use.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FINAL CTA
  // -------------------------------------------------------------------------
  finalCta: {
    headline: 'Ready to create something amazing?',
    subheadline: 'Join thousands of creators using PixelForge.',
    cta: 'Start Creating Free',
  },

  // -------------------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------------------
  footer: {
    links: [] as Array<{ label: string; href: string }>,
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
