/**
 * STORE CONFIGURATION
 *
 * Edit this file to customize your store's branding.
 * Products, prices, and inventory are managed in your Dream API dashboard.
 */

export const CONFIG = {
  // ============================================
  // BASIC INFO
  // ============================================
  storeName: 'Ember & Wick',
  tagline: 'Hand-poured. Slow-burning. Made with intention.',
  description: 'Small-batch artisan candles crafted for those who appreciate the quiet luxury of a perfectly lit room.',

  // ============================================
  // DEMO MODE - Shows test card banner
  // ============================================
  demoMode: true,

  // ============================================
  // LOGO & HERO IMAGE
  // ============================================
  logo: null as string | null,        // '/logo.png' or null for text
  heroImage: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=1600&q=80',
  // Cozy candle scene - swap with your own or set null to hide

  // ============================================
  // THEME & COLORS
  // ============================================
  // Theme: 'light' (clean, minimal) or 'dark' (modern, bold)
  theme: 'light' as 'light' | 'dark',

  // Accent color for buttons, highlights
  // Options: zinc, emerald, sky, violet, rose, amber
  accentColor: 'amber',

  // ============================================
  // FOOTER
  // ============================================
  footer: {
    tagline: 'Ember & Wick - artisan candles for mindful living. Each candle hand-poured with care.',
    links: {
      support: [
        { label: 'FAQ', href: '#' },
        { label: 'Shipping', href: '#' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  },

  // ============================================
  // ABOUT PAGE
  // ============================================
  about: {
    headline: 'Our Story',
    content: `Ember & Wick started in a small kitchen with a simple belief: candles should be more than background decor.

Each candle is hand-poured in small batches using natural soy wax and premium fragrance oils. No synthetic dyes. No mass production. Just honest craftsmanship.

We believe in slow burning—candles that last, scents that linger, and moments worth savoring.

Whether you're setting the mood for a quiet evening or filling your space with warmth, our candles are made to elevate the everyday.`,
  },

  // ============================================
  // CONTACT PAGE
  // ============================================
  contact: {
    headline: 'Get in Touch',
    email: 'kc@pancea-tech.net',
    response: "We'd love to hear from you. Questions about orders, custom scents, or wholesale? Drop us a line.",
  },

  // ============================================
  // TEAM PAGE
  // ============================================
  team: {
    headline: 'Meet the Makers',
    subheadline: 'A small team with big passion for the perfect flame.',
    members: [
      {
        name: 'Sarah Chen',
        role: 'Founder & Chandler',
        bio: 'Former aromatherapist turned candle maker. Started Ember & Wick after years of searching for candles that actually smelled like their labels promised.',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
      },
      {
        name: 'Marcus Williams',
        role: 'Head of Production',
        bio: 'Precision is everything. Marcus oversees every pour, ensuring each candle meets our standards for burn time and scent throw.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      },
      {
        name: 'Luna Park',
        role: 'Scent Designer',
        bio: 'With a background in perfumery, Luna crafts our signature blends. She believes every scent tells a story.',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
      },
    ],
  },

  // ============================================
  // MISSION / VALUES
  // ============================================
  mission: {
    headline: 'Our Mission',
    statement: 'To create moments of calm in a chaotic world, one candle at a time.',
    values: [
      { title: 'Craftsmanship', description: 'Every candle is hand-poured with intention.' },
      { title: 'Sustainability', description: 'Natural soy wax, cotton wicks, recyclable packaging.' },
      { title: 'Transparency', description: 'We list every ingredient. No mystery fragrances.' },
    ],
  },
}

// ============================================
// ACCENT COLOR UTILITIES
// ============================================
const ACCENT_COLORS = {
  zinc: {
    bg: 'bg-zinc-100',
    bgHover: 'hover:bg-white',
    text: 'text-zinc-100',
    textHover: 'hover:text-white',
    border: 'border-zinc-100',
    buttonText: 'text-zinc-900',
  },
  emerald: {
    bg: 'bg-emerald-500',
    bgHover: 'hover:bg-emerald-400',
    text: 'text-emerald-500',
    textHover: 'hover:text-emerald-400',
    border: 'border-emerald-500',
    buttonText: 'text-white',
  },
  sky: {
    bg: 'bg-sky-500',
    bgHover: 'hover:bg-sky-400',
    text: 'text-sky-500',
    textHover: 'hover:text-sky-400',
    border: 'border-sky-500',
    buttonText: 'text-white',
  },
  violet: {
    bg: 'bg-violet-500',
    bgHover: 'hover:bg-violet-400',
    text: 'text-violet-500',
    textHover: 'hover:text-violet-400',
    border: 'border-violet-500',
    buttonText: 'text-white',
  },
  rose: {
    bg: 'bg-rose-500',
    bgHover: 'hover:bg-rose-400',
    text: 'text-rose-500',
    textHover: 'hover:text-rose-400',
    border: 'border-rose-500',
    buttonText: 'text-white',
  },
  amber: {
    bg: 'bg-amber-500',
    bgHover: 'hover:bg-amber-400',
    text: 'text-amber-500',
    textHover: 'hover:text-amber-400',
    border: 'border-amber-500',
    buttonText: 'text-zinc-900',
  },
}

export function getAccentClasses() {
  return ACCENT_COLORS[CONFIG.accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.zinc
}

// ============================================
// THEME UTILITIES
// ============================================
const THEMES = {
  light: {
    // Backgrounds - warm cream tones
    pageBg: 'bg-stone-100',
    headerBg: 'bg-stone-50 border-b border-stone-200',
    cardBg: 'bg-white border border-stone-200',
    cardHover: 'hover:border-stone-300 hover:shadow-lg',
    modalBg: 'bg-white',
    modalOverlay: 'bg-black/60',
    drawerBg: 'bg-white border-l border-stone-200',
    footerBg: 'bg-stone-200/50 border-t border-stone-200',
    // Text - warm tones
    heading: 'text-stone-800',
    body: 'text-stone-600',
    muted: 'text-stone-400',
    price: 'text-stone-800',
    // Interactive
    buttonSecondary: 'border border-stone-300 text-stone-600 hover:text-stone-800 hover:border-stone-400',
    buttonDisabled: 'bg-stone-200 text-stone-400',
    link: 'text-stone-600 hover:text-stone-800',
    // Inputs
    inputBg: 'bg-white border border-stone-300',
    inputFocus: 'focus:border-stone-400 focus:ring-stone-400',
    inputPlaceholder: 'placeholder-stone-400',
    // Dividers
    divider: 'border-stone-200',
    // Cart
    cartItemBg: 'bg-stone-50 border border-stone-200',
    quantityButton: 'bg-stone-200 hover:bg-stone-300 text-stone-700',
    // Product
    imagePlaceholder: 'bg-stone-100 text-stone-300',
    soldOutOverlay: 'bg-white/80',
    soldOutText: 'text-stone-500',
    stockText: 'text-stone-500',
    featureDot: 'bg-stone-400',
    // Hero section
    heroBg: 'bg-stone-800',
    heroText: 'text-white',
    heroMuted: 'text-stone-300',
  },
  dark: {
    // Backgrounds
    pageBg: 'bg-zinc-950',
    headerBg: 'bg-zinc-950 border-b border-zinc-800',
    cardBg: 'bg-zinc-900/50 border border-zinc-800',
    cardHover: 'hover:border-zinc-700',
    modalBg: 'bg-zinc-900 border border-zinc-800',
    modalOverlay: 'bg-black/80',
    drawerBg: 'bg-zinc-900 border-l border-zinc-800',
    footerBg: 'bg-zinc-950 border-t border-zinc-800',
    // Text
    heading: 'text-zinc-100',
    body: 'text-zinc-400',
    muted: 'text-zinc-500',
    price: 'text-zinc-200',
    // Interactive
    buttonSecondary: 'border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
    buttonDisabled: 'bg-zinc-800 text-zinc-500',
    link: 'text-zinc-400 hover:text-zinc-200',
    // Inputs
    inputBg: 'bg-zinc-900 border border-zinc-700',
    inputFocus: 'focus:border-zinc-600 focus:ring-zinc-600',
    inputPlaceholder: 'placeholder-zinc-600',
    // Dividers
    divider: 'border-zinc-800',
    // Cart
    cartItemBg: 'bg-zinc-800/50 border border-zinc-800',
    quantityButton: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300',
    // Product
    imagePlaceholder: 'bg-zinc-900 text-zinc-700',
    soldOutOverlay: 'bg-black/70',
    soldOutText: 'text-zinc-400',
    stockText: 'text-zinc-600',
    featureDot: 'bg-zinc-600',
    // Hero section
    heroBg: 'bg-zinc-900',
    heroText: 'text-white',
    heroMuted: 'text-zinc-400',
  },
}

export function getThemeClasses() {
  return THEMES[CONFIG.theme] || THEMES.dark
}
