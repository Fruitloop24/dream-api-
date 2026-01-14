/**
 * ============================================================================
 * FITFLOW - Fitness Membership Demo
 * ============================================================================
 *
 * This is a demo of the Dream API Membership Template.
 * See how easy it is to build membership sites with full auth & billing.
 *
 * Powered by Dream API - https://dream-api.com
 */

export const CONFIG = {
  // -------------------------------------------------------------------------
  // BRAND
  // -------------------------------------------------------------------------
  appName: 'FitFlow',
  tagline: 'Your personal fitness journey starts here',

  // Logo: place file in public/ folder, or set to null for text-only
  logo: '/assets/fitflow-fav.png',

  // Theme: 'light' (professional, clean) or 'dark' (modern, bold)
  theme: 'dark' as 'light' | 'dark',

  // Primary accent color - rose for bold, energetic fitness vibes
  accentColor: 'rose',

  // -------------------------------------------------------------------------
  // DEMO BANNER (shown at top of landing page)
  // -------------------------------------------------------------------------
  demoBanner: {
    enabled: true,
    headline: 'Live Demo - Try the Full Checkout Flow!',
    description: 'This is a working demo. Sign up, start your free trial, and explore the member dashboard.',
    testCard: '4242 4242 4242 4242',
    ctaText: 'View Source',
    ctaUrl: 'https://github.com/Fruitloop24/dream-membership-basic',
  },

  // -------------------------------------------------------------------------
  // HERO SECTION
  // -------------------------------------------------------------------------
  hero: {
    headline: 'Transform Your Body, Transform Your Life',
    subheadline: 'Get unlimited access to 500+ workout videos, personalized meal plans, progress tracking, and a supportive community of fitness enthusiasts.',
    cta: 'Start Your Free Trial',
    ctaSubtext: '5-day free trial. Cancel anytime.',
    image: '/assets/fitflow-hero.png',
  },

  // -------------------------------------------------------------------------
  // SOCIAL PROOF (logo bar)
  // -------------------------------------------------------------------------
  socialProof: {
    enabled: false,
    headline: 'Featured in',
    logos: [] as Array<{ name: string; src: string }>,
  },

  // -------------------------------------------------------------------------
  // TESTIMONIALS - Member success stories
  // -------------------------------------------------------------------------
  testimonials: {
    enabled: true,
    headline: 'Real Results from Real Members',
    subheadline: 'Join thousands who have already transformed their lives',
    items: [
      {
        quote: 'I lost 30 pounds in 4 months following the workout plans. The meal guides made it so easy to stay on track. Best investment in myself!',
        name: 'Jessica R.',
        role: 'Lost 30 lbs',
        avatar: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=150&h=150&fit=crop&crop=face',
      },
      {
        quote: 'Finally found a program that fits my busy schedule. The 20-minute HIIT workouts are intense but effective. Gained serious muscle definition.',
        name: 'Marcus T.',
        role: 'Gained lean muscle',
        avatar: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150&h=150&fit=crop&crop=face',
      },
      {
        quote: 'The community aspect is incredible. Having accountability partners and coaches cheering you on makes all the difference.',
        name: 'Priya S.',
        role: 'Lifestyle transformation',
        avatar: 'https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?w=150&h=150&fit=crop&crop=face',
      },
      {
        quote: 'The AI nutrition guidance is a game-changer. It adapts to my goals and keeps me on track without feeling restrictive.',
        name: 'David K.',
        role: 'Down 25 lbs',
        avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&h=150&fit=crop&crop=face',
      },
      {
        quote: 'As a busy mom, I needed workouts I could do at home. FitFlow gave me my energy back and I feel stronger than ever.',
        name: 'Sarah M.',
        role: 'New mom transformation',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      },
      {
        quote: 'The progress tracking keeps me motivated. Seeing my stats improve week over week is addictive in the best way!',
        name: 'James L.',
        role: 'Consistency champion',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // HOW IT WORKS (3 steps)
  // -------------------------------------------------------------------------
  howItWorks: {
    headline: 'Your Fitness Journey in 3 Steps',
    subheadline: 'Getting started is easier than you think',
    steps: [
      {
        number: '1',
        title: 'Create Your Account',
        description: 'Sign up in 30 seconds and take our fitness assessment.',
        icon: 'user',
      },
      {
        number: '2',
        title: 'Get Your Custom Plan',
        description: 'Receive personalized workout and nutrition recommendations.',
        icon: 'target',
      },
      {
        number: '3',
        title: 'Crush Your Goals',
        description: 'Follow the program, track progress, and see real results.',
        icon: 'trophy',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FEATURES - What Members Get
  // -------------------------------------------------------------------------
  features: {
    headline: 'Everything You Need to Succeed',
    subheadline: 'All the tools, guidance, and support in one membership',
    items: [
      {
        title: '500+ Workout Videos',
        description: 'From beginner to advanced, HIIT to yoga. New workouts added every week.',
        icon: 'play',
      },
      {
        title: 'Meal Plans & Recipes',
        description: 'Delicious, macro-friendly recipes with shopping lists included.',
        icon: 'apple',
      },
      {
        title: 'Progress Tracking',
        description: 'Log workouts, track measurements, and celebrate every milestone.',
        icon: 'chart',
      },
      {
        title: 'Live Training Sessions',
        description: 'Weekly live workouts with trainers. Real-time form corrections.',
        icon: 'calendar',
      },
      {
        title: 'Private Community',
        description: 'Connect with members, share wins, and get motivated together.',
        icon: 'users',
      },
      {
        title: 'Expert Coaching',
        description: 'Direct access to certified trainers for questions and guidance.',
        icon: 'shield',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // PRICING SECTION (tiers come from API)
  // -------------------------------------------------------------------------
  pricing: {
    headline: 'Simple, Transparent Pricing',
    subheadline: 'Start with a 5-day free trial. No credit card required to browse.',
  },

  // -------------------------------------------------------------------------
  // FAQ
  // -------------------------------------------------------------------------
  faq: {
    headline: 'Frequently Asked Questions',
    items: [
      {
        question: 'Do I need any equipment?',
        answer: 'Nope! We have plenty of bodyweight-only workouts. As you progress, we recommend basic equipment like dumbbells and resistance bands, but it\'s not required.',
      },
      {
        question: 'What if I\'m a complete beginner?',
        answer: 'Perfect! Our beginner programs are designed for people just starting out. Every exercise includes video tutorials with proper form demonstrations.',
      },
      {
        question: 'How long are the workouts?',
        answer: 'Workouts range from 10-45 minutes. Our most popular programs use 20-30 minute sessions, 4-5 days per week. We work with YOUR schedule.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. No contracts, no hidden fees. Cancel with one click and keep access until the end of your billing period.',
      },
      {
        question: 'What about nutrition guidance?',
        answer: 'Every membership includes meal plans, recipes, and macro guides. We focus on sustainable eating habits, not crash diets.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // FINAL CTA
  // -------------------------------------------------------------------------
  finalCta: {
    headline: 'Ready to become the strongest version of yourself?',
    subheadline: 'Join 10,000+ members already crushing their fitness goals.',
    cta: 'Start Your Free Trial',
  },

  // -------------------------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------------------------
  footer: {
    links: [] as Array<{ label: string; href: string }>,
  },

  // -------------------------------------------------------------------------
  // MEMBER CONTENT (shown in dashboard for paid users)
  // -------------------------------------------------------------------------
  memberContent: [
    {
      title: 'Quick Start Guide',
      description: 'Your personalized roadmap to fitness success. Start here.',
      icon: 'rocket',
      cta: 'Get Started',
    },
    {
      title: 'Workout Library',
      description: '500+ on-demand workout videos across all fitness levels.',
      icon: 'play',
      cta: 'Browse Workouts',
    },
    {
      title: 'Meal Plans',
      description: 'Weekly meal plans with recipes and shopping lists.',
      icon: 'apple',
      cta: 'View Plans',
    },
    {
      title: 'Progress Tracker',
      description: 'Log workouts, measurements, and photos to track your journey.',
      icon: 'chart',
      cta: 'Track Progress',
    },
    {
      title: 'Community',
      description: 'Connect with fellow members, share wins, get motivated.',
      icon: 'users',
      cta: 'Join Discussion',
    },
    {
      title: 'Live Sessions',
      description: 'Weekly live workouts with real-time coaching.',
      icon: 'calendar',
      cta: 'View Schedule',
    },
  ] as Array<{ title: string; description: string; icon: string; cta?: string }>,

  // -------------------------------------------------------------------------
  // UPGRADE PROMPT (shown to free users)
  // -------------------------------------------------------------------------
  upgrade: {
    headline: 'Unlock Your Full Potential',
    description: 'Get unlimited access to everything FitFlow has to offer.',
    benefits: [
      'All 500+ workout videos',
      'Personalized meal plans',
      'Progress tracking tools',
      'Live training sessions',
      'Private community access',
    ],
    cta: 'Start Free Trial',
    subtext: '5-day free trial, then $29.45/month',
  },
};

// ============================================================================
// COLOR UTILITIES - Don't modify below
// ============================================================================

const ACCENT_COLORS = {
  emerald: {
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    bgLight: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    textHover: 'hover:text-emerald-500',
    border: 'border-emerald-600',
    hex: '#059669',
  },
  sky: {
    bg: 'bg-sky-600',
    bgHover: 'hover:bg-sky-500',
    bgLight: 'bg-sky-500/10',
    text: 'text-sky-600',
    textHover: 'hover:text-sky-500',
    border: 'border-sky-600',
    hex: '#0284c7',
  },
  violet: {
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-500',
    bgLight: 'bg-violet-500/10',
    text: 'text-violet-600',
    textHover: 'hover:text-violet-500',
    border: 'border-violet-600',
    hex: '#7c3aed',
  },
  rose: {
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-500',
    bgLight: 'bg-rose-500/10',
    text: 'text-rose-600',
    textHover: 'hover:text-rose-500',
    border: 'border-rose-600',
    hex: '#e11d48',
  },
  amber: {
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    bgLight: 'bg-amber-500/10',
    text: 'text-amber-600',
    textHover: 'hover:text-amber-500',
    border: 'border-amber-600',
    hex: '#d97706',
  },
  zinc: {
    bg: 'bg-zinc-800',
    bgHover: 'hover:bg-zinc-700',
    bgLight: 'bg-zinc-500/10',
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
