/**
 * Public Documentation Page
 *
 * Tabs: SaaS | Store
 * Sticky sidebar TOC
 * Framework examples with GitHub links
 */

import { useState } from 'react';
import { getTheme, getAccent, CONFIG } from '../config';

type Tab = 'saas' | 'store';

const GITHUB_BASE = CONFIG.links.github;

export default function Docs() {
  const theme = getTheme();
  const accent = getAccent();
  const [activeTab, setActiveTab] = useState<Tab>('saas');

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${theme.navBg} border-b ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className={`text-xl font-semibold ${theme.heading}`}>
            {CONFIG.appName}
          </a>
          <nav className="flex items-center gap-6">
            <a href="/docs" className={`${accent.text} font-medium`}>Docs</a>
            <a href="/templates" className={`${theme.muted} hover:${theme.heading} transition-colors`}>
              Templates
            </a>
            <a href={CONFIG.links.github} target="_blank" rel="noopener noreferrer" className={`${theme.muted} hover:${theme.heading} transition-colors`}>
              GitHub
            </a>
            <a href="/sign-in" className={`px-4 py-2 rounded ${accent.bg} text-white ${accent.bgHover} transition-colors`}>
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto py-8 px-6">
          <nav className="space-y-1">
            <p className={`text-xs font-semibold uppercase tracking-wider ${theme.muted} mb-3`}>
              On this page
            </p>
            <SidebarLink href="#quick-start" theme={theme}>Quick Start</SidebarLink>
            <SidebarLink href="#react" theme={theme}>React</SidebarLink>
            <SidebarLink href="#nextjs" theme={theme}>Next.js</SidebarLink>
            <SidebarLink href="#vue" theme={theme}>Vue</SidebarLink>
            <SidebarLink href="#gotchas" theme={theme}>Gotchas</SidebarLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-12">
          {/* Title */}
          <h1 className={`text-4xl font-bold ${theme.heading} mb-4`}>Documentation</h1>
          <p className={`text-lg ${theme.body} mb-8`}>
            One SDK. One key. Auth, billing, and {activeTab === 'saas' ? 'usage tracking' : 'checkout'} included.
          </p>

          {/* Tabs */}
          <div className={`flex gap-1 p-1 rounded-lg ${theme.cardBg} w-fit mb-8`}>
            <TabButton
              active={activeTab === 'saas'}
              onClick={() => setActiveTab('saas')}
              theme={theme}
              accent={accent}
            >
              SaaS
            </TabButton>
            <TabButton
              active={activeTab === 'store'}
              onClick={() => setActiveTab('store')}
              theme={theme}
              accent={accent}
            >
              Store
            </TabButton>
          </div>

          {/* Content */}
          {activeTab === 'saas' ? <SaasContent theme={theme} accent={accent} /> : <StoreContent theme={theme} accent={accent} />}

          {/* Gotchas - shared */}
          <section id="gotchas" className={`mt-16 pt-8 border-t ${theme.divider}`}>
            <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Gotchas</h2>
            <div className="space-y-4">
              <Gotcha theme={theme} title="auth.init() is client-side only">
                Call it in useEffect or onMounted. It's SSR-safe (returns early on server), but won't do anything server-side.
              </Gotcha>
              <Gotcha theme={theme} title="Auth URLs work everywhere">
                getSignUpUrl() and getSignInUrl() just return strings. Use them in server components, API routes, anywhere.
              </Gotcha>
              <Gotcha theme={theme} title="features is an array">
                Tier and product features come as an array, not a comma-separated string. Use .map(), not .split().
              </Gotcha>
              <Gotcha theme={theme} title="Control everything in your dashboard">
                Prices, limits, tiers, products - all controlled in your Dream API dashboard. Change them there, your app updates automatically.
              </Gotcha>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// SaaS Content
// =============================================================================

function SaasContent({ theme, accent }: { theme: any; accent: any }) {
  return (
    <div className="space-y-12">
      {/* Quick Start */}
      <section id="quick-start">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Quick Start</h2>
        <CodeBlock theme={theme}>{`npm install @dream-api/sdk`}</CodeBlock>
        <CodeBlock theme={theme}>{`import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({ publishableKey: 'pk_xxx' });

await api.auth.init();`}</CodeBlock>
        <p className={`mt-4 ${theme.body}`}>
          That's it. No Clerk setup. No Stripe setup. Just your key from the dashboard.
        </p>
      </section>

      {/* React */}
      <section id="react">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>React</h2>
        <CodeBlock theme={theme} title="Setup">{`import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY
});

// Call once on app load
useEffect(() => {
  api.auth.init();
}, []);`}</CodeBlock>

        <CodeBlock theme={theme} title="Auth">{`// Sign up / Sign in (just URLs)
<a href={api.auth.getSignUpUrl({ redirect: '/dashboard' })}>Sign Up</a>
<a href={api.auth.getSignInUrl({ redirect: '/dashboard' })}>Sign In</a>

// Check auth
if (api.auth.isSignedIn()) {
  const user = api.auth.getUser(); // { email, plan }
}

// Sign out
await api.auth.signOut();`}</CodeBlock>

        <CodeBlock theme={theme} title="Usage Tracking">{`// Track when user does a billable action
const result = await api.usage.track();

if (!result.success) {
  // Limit reached - show upgrade prompt
}

// Check usage without incrementing
const usage = await api.usage.check();
// { usageCount, limit, remaining, plan }`}</CodeBlock>

        <CodeBlock theme={theme} title="Billing">{`// Get tiers for pricing page
const { tiers } = await api.products.listTiers();

// Create checkout
const { url } = await api.billing.createCheckout({
  tier: 'pro',
  successUrl: '/dashboard',
  cancelUrl: '/pricing'
});
window.location.href = url;

// Open billing portal
const { url } = await api.billing.openPortal();
window.location.href = url;`}</CodeBlock>

        <TemplateLink
          href={`${GITHUB_BASE}/tree/main/dream-saas-basic`}
          theme={theme}
          accent={accent}
        >
          React Template → dream-saas-basic
        </TemplateLink>
      </section>

      {/* Next.js */}
      <section id="nextjs">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Next.js</h2>
        <CodeBlock theme={theme} title="lib/api.ts">{`import { DreamAPI } from '@dream-api/sdk';

export const api = new DreamAPI({
  publishableKey: process.env.NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY!
});`}</CodeBlock>

        <CodeBlock theme={theme} title="app/providers.tsx">{`'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

export function Providers({ children }) {
  useEffect(() => {
    api.auth.init();
  }, []);

  return children;
}`}</CodeBlock>

        <CodeBlock theme={theme} title="Usage in components">{`'use client';

import { api } from '@/lib/api';

export default function Dashboard() {
  async function handleAction() {
    const result = await api.usage.track();
    if (!result.success) {
      // show upgrade modal
    }
  }

  return <button onClick={handleAction}>Do Action</button>;
}`}</CodeBlock>

        <TemplateLink
          href={`${GITHUB_BASE}/tree/main/dream-saas-next`}
          theme={theme}
          accent={accent}
        >
          Next.js Template → coming soon
        </TemplateLink>
      </section>

      {/* Vue */}
      <section id="vue">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Vue</h2>
        <CodeBlock theme={theme} title="composables/useApi.ts">{`import { ref, onMounted } from 'vue';
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY
});

const ready = ref(false);

export function useApi() {
  onMounted(async () => {
    if (!ready.value) {
      await api.auth.init();
      ready.value = true;
    }
  });

  return { api, ready };
}`}</CodeBlock>

        <CodeBlock theme={theme} title="Usage in components">{`<script setup>
import { useApi } from '@/composables/useApi';

const { api } = useApi();

async function handleAction() {
  const result = await api.usage.track();
  if (!result.success) {
    // show upgrade modal
  }
}
</script>

<template>
  <button @click="handleAction">Do Action</button>
</template>`}</CodeBlock>

        <TemplateLink
          href={`${GITHUB_BASE}/tree/main/dream-saas-vue`}
          theme={theme}
          accent={accent}
        >
          Vue Template → coming soon
        </TemplateLink>
      </section>
    </div>
  );
}

// =============================================================================
// Store Content
// =============================================================================

function StoreContent({ theme, accent }: { theme: any; accent: any }) {
  return (
    <div className="space-y-12">
      {/* Quick Start */}
      <section id="quick-start">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Quick Start</h2>
        <CodeBlock theme={theme}>{`npm install @dream-api/sdk`}</CodeBlock>
        <CodeBlock theme={theme}>{`import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({ publishableKey: 'pk_xxx' });

// No auth.init() needed for guest checkout`}</CodeBlock>
        <p className={`mt-4 ${theme.body}`}>
          Products come from your dashboard. Guest checkout - Stripe handles payment.
        </p>
      </section>

      {/* React */}
      <section id="react">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>React</h2>
        <CodeBlock theme={theme} title="Load Products">{`import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY
});

// Get products from your dashboard
const { products } = await api.products.list();

// Each product: { name, displayName, price, priceId, imageUrl, soldOut }`}</CodeBlock>

        <CodeBlock theme={theme} title="Cart Checkout">{`// Guest checkout - no auth needed
const { url } = await api.products.cartCheckout({
  items: [
    { priceId: 'price_xxx', quantity: 2 },
    { priceId: 'price_yyy', quantity: 1 }
  ],
  successUrl: '/thank-you',
  cancelUrl: '/cart'
});

window.location.href = url;`}</CodeBlock>

        <TemplateLink
          href={`${GITHUB_BASE}/tree/main/dream-store-basic`}
          theme={theme}
          accent={accent}
        >
          React Template → dream-store-basic
        </TemplateLink>
      </section>

      {/* Next.js */}
      <section id="nextjs">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Next.js</h2>
        <CodeBlock theme={theme} title="Server Component">{`// app/page.tsx
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: process.env.NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY!
});

export default async function Home() {
  const { products } = await api.products.list();

  return (
    <div>
      {products.map(p => (
        <ProductCard key={p.priceId} product={p} />
      ))}
    </div>
  );
}`}</CodeBlock>

        <CodeBlock theme={theme} title="Client Checkout">{`'use client';

import { api } from '@/lib/api';

export function CheckoutButton({ items }) {
  async function checkout() {
    const { url } = await api.products.cartCheckout({
      items,
      successUrl: '/thank-you',
      cancelUrl: '/cart'
    });
    window.location.href = url;
  }

  return <button onClick={checkout}>Checkout</button>;
}`}</CodeBlock>

        <TemplateLink
          href={`${GITHUB_BASE}/tree/main/dream-store-next`}
          theme={theme}
          accent={accent}
        >
          Next.js Template → coming soon
        </TemplateLink>
      </section>

      {/* Vue */}
      <section id="vue">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Vue</h2>
        <CodeBlock theme={theme} title="Load Products">{`<script setup>
import { ref, onMounted } from 'vue';
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY
});

const products = ref([]);

onMounted(async () => {
  const res = await api.products.list();
  products.value = res.products;
});
</script>`}</CodeBlock>

        <CodeBlock theme={theme} title="Checkout">{`async function checkout(cart) {
  const { url } = await api.products.cartCheckout({
    items: cart,
    successUrl: '/thank-you',
    cancelUrl: '/cart'
  });
  window.location.href = url;
}`}</CodeBlock>

        <TemplateLink
          href={`${GITHUB_BASE}/tree/main/dream-store-vue`}
          theme={theme}
          accent={accent}
        >
          Vue Template → coming soon
        </TemplateLink>
      </section>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function SidebarLink({ href, theme, children }: { href: string; theme: any; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`block py-1.5 text-sm ${theme.muted} hover:${theme.heading} transition-colors`}
    >
      {children}
    </a>
  );
}

function TabButton({ active, onClick, theme, accent, children }: {
  active: boolean;
  onClick: () => void;
  theme: any;
  accent: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? `${accent.bg} text-white`
          : `${theme.muted} hover:${theme.heading}`
      }`}
    >
      {children}
    </button>
  );
}

function CodeBlock({ theme, title, children }: { theme: any; title?: string; children: string }) {
  return (
    <div className="mb-4">
      {title && (
        <div className={`text-xs font-mono ${theme.muted} mb-1`}>{title}</div>
      )}
      <pre className={`p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function TemplateLink({ href, theme, accent, children }: {
  href: string;
  theme: any;
  accent: any;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg ${theme.cardBg} ${theme.heading} hover:${accent.text} transition-colors text-sm`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
      {children}
    </a>
  );
}

function Gotcha({ theme, title, children }: { theme: any; title: string; children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-lg ${theme.cardBg}`}>
      <h3 className={`font-medium ${theme.heading} mb-1`}>{title}</h3>
      <p className={`text-sm ${theme.body}`}>{children}</p>
    </div>
  );
}
