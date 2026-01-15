/**
 * Public Documentation Page
 *
 * Tabs: SaaS | Store
 * Sticky sidebar TOC
 * Framework examples with GitHub links
 */

import { useState } from 'react';
import { getTheme, getAccent, CONFIG } from '../config';

type Tab = 'saas' | 'store' | 'api' | 'ai';

// Links now in CONFIG.links

// AI Prompt for copy/paste into Claude Code, Cursor, Windsurf, etc.
const AI_PROMPT = `I'm building with Dream API SDK. Here's the complete reference:

## Installation
npm install @dream-api/sdk

## Setup
import { DreamAPI } from '@dream-api/sdk';
const api = new DreamAPI({ publishableKey: 'pk_xxx' });

## SaaS Methods (5 core)
api.auth.init()                                    // Call once on load, client-side only
api.auth.getSignUpUrl({ redirect: '/dashboard' })  // Returns URL string for new users
api.auth.getSignInUrl({ redirect: '/dashboard' })  // Returns URL string for returning users
api.usage.track()                                  // Returns { success, usage: { usageCount, limit, remaining } }
api.usage.check()                                  // Read usage without incrementing
api.billing.createCheckout({ tier, successUrl, cancelUrl })  // Returns { url }
api.billing.openPortal()                           // Returns { url } for billing management
api.products.listTiers()                           // Returns { tiers } for pricing page

## Store Methods (2 core)
api.products.list()                                // Returns { products } with price, imageUrl, soldOut
api.products.cartCheckout({ items, successUrl, cancelUrl })  // Returns { url }, items = [{ priceId, quantity }]

## Environment Variables
VITE_DREAM_PUBLISHABLE_KEY=pk_xxx          (Vite/React)
NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY=pk_xxx   (Next.js)

## Key Rules
- Publishable key is safe for frontend (like Stripe)
- auth.init() is client-side only - call in useEffect/onMounted
- features is an array, not a string - use .map() not .split()
- Prices, tiers, products are controlled in Dream API dashboard
- price is in cents - divide by 100 for display

## User Object
const user = api.auth.getUser();  // { id, email, plan, publishableKey } or null
api.auth.isSignedIn()             // boolean

Help me build my app using this SDK.`;

export default function Docs() {
  const theme = getTheme();
  const accent = getAccent();
  const [activeTab, setActiveTab] = useState<Tab>('saas');

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${theme.navBg} border-b ${theme.divider}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            {CONFIG.logo && <img src={CONFIG.logo} alt={CONFIG.appName} className="h-8 w-auto rounded-lg" />}
            <span className={`text-xl font-semibold ${theme.heading}`}>{CONFIG.appName}</span>
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
            {(activeTab === 'saas' || activeTab === 'store') && (
              <>
                <SidebarLink href="#quick-start" theme={theme}>Quick Start</SidebarLink>
                <SidebarLink href="#react" theme={theme}>React</SidebarLink>
                <SidebarLink href="#nextjs" theme={theme}>Next.js</SidebarLink>
                <SidebarLink href="#gotchas" theme={theme}>Quick Tips</SidebarLink>
              </>
            )}
            {activeTab === 'api' && (
              <>
                <SidebarLink href="#install" theme={theme}>Installation</SidebarLink>
                <SidebarLink href="#auth" theme={theme}>Auth</SidebarLink>
                <SidebarLink href="#usage" theme={theme}>Usage Tracking</SidebarLink>
                <SidebarLink href="#billing" theme={theme}>Billing</SidebarLink>
                <SidebarLink href="#products" theme={theme}>Products</SidebarLink>
                <SidebarLink href="#backend" theme={theme}>Backend (Admin)</SidebarLink>
                <SidebarLink href="#types" theme={theme}>Types</SidebarLink>
              </>
            )}
            {activeTab === 'ai' && (
              <>
                <SidebarLink href="#" theme={theme}>Copy Prompt</SidebarLink>
                <SidebarLink href="/templates" theme={theme}>Templates</SidebarLink>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-12">
          {/* Title */}
          <h1 className={`text-4xl font-bold ${theme.heading} mb-4`}>Documentation</h1>
          <p className={`text-lg ${theme.body} mb-8`}>
            {activeTab === 'ai' && 'Give your AI editor everything it needs to build with Dream API.'}
            {activeTab === 'api' && 'Complete SDK reference. Every method, type, and return value.'}
            {activeTab === 'saas' && 'One SDK. One key. Auth, billing, and usage tracking included.'}
            {activeTab === 'store' && 'One SDK. One key. Auth, billing, and checkout included.'}
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
            <TabButton
              active={activeTab === 'api'}
              onClick={() => setActiveTab('api')}
              theme={theme}
              accent={accent}
            >
              API Reference
            </TabButton>
            <TabButton
              active={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              theme={theme}
              accent={accent}
            >
              AI Prompt
            </TabButton>
          </div>

          {/* Content */}
          {activeTab === 'saas' && <SaasContent theme={theme} accent={accent} />}
          {activeTab === 'store' && <StoreContent theme={theme} accent={accent} />}
          {activeTab === 'api' && <ApiReferenceContent theme={theme} accent={accent} />}
          {activeTab === 'ai' && <AiContent theme={theme} accent={accent} />}

          {/* Gotchas - shared (only show for saas/store tabs) */}
          {(activeTab === 'saas' || activeTab === 'store') && (
            <section id="gotchas" className={`mt-16 pt-8 border-t ${theme.divider}`}>
              <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Quick Tips</h2>
              <div className="space-y-4">
                <Gotcha theme={theme} title="auth.init() is client-side only">
                  Call in useEffect or onMounted. SSR-safe but does nothing server-side.
                </Gotcha>
                <Gotcha theme={theme} title="Dashboard controls everything">
                  Prices, limits, features - change in dashboard, app updates automatically.
                </Gotcha>
              </div>
            </section>
          )}
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
          href={CONFIG.links.saasBasic}
          theme={theme}
          accent={accent}
        >
          React Template → dream-saas-basic
        </TemplateLink>
      </section>

      {/* Next.js */}
      <section id="nextjs">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Next.js</h2>
        <p className={`${theme.body} mb-4`}>
          Server components, app router, SEO-friendly. Best for production apps that need SSR.
        </p>
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
          href={CONFIG.links.saasNext}
          theme={theme}
          accent={accent}
        >
          Next.js Template → dream-saas-next
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
          href={CONFIG.links.storeBasic}
          theme={theme}
          accent={accent}
        >
          React Template → dream-store-basic
        </TemplateLink>
      </section>

      {/* Next.js */}
      <section id="nextjs">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Next.js</h2>
        <p className={`${theme.body} mb-4`}>
          Server components, app router, SEO-friendly. Best for production stores that need SSR.
        </p>
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
          href={CONFIG.links.storeNext}
          theme={theme}
          accent={accent}
        >
          Next.js Template → dream-store-next
        </TemplateLink>
      </section>
    </div>
  );
}

// =============================================================================
// AI Content
// =============================================================================

function AiContent({ theme, accent }: { theme: any; accent: any }) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Intro */}
      <section>
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Build with AI</h2>
        <p className={`${theme.body} mb-6`}>
          Copy this prompt into Claude Code, Cursor, Windsurf, or any AI coding assistant.
          It contains the complete SDK reference - everything the AI needs to help you build.
        </p>

        {/* Copy Button */}
        <button
          onClick={copyPrompt}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg ${accent.bg} text-white ${accent.bgHover} transition-colors font-medium`}
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy AI Prompt
            </>
          )}
        </button>
      </section>

      {/* Preview */}
      <section>
        <h3 className={`text-lg font-semibold ${theme.heading} mb-3`}>What the AI Gets</h3>
        <pre className={`p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto max-h-96 overflow-y-auto`}>
          <code>{AI_PROMPT}</code>
        </pre>
      </section>

      {/* How to Use */}
      <section className={`p-6 rounded-lg ${theme.cardBg}`}>
        <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>How to Use</h3>
        <ol className={`space-y-3 ${theme.body}`}>
          <li className="flex gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full ${accent.bg} text-white text-sm flex items-center justify-center`}>1</span>
            <span>Copy the prompt above</span>
          </li>
          <li className="flex gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full ${accent.bg} text-white text-sm flex items-center justify-center`}>2</span>
            <span>Paste into your AI editor (Claude Code, Cursor, Windsurf)</span>
          </li>
          <li className="flex gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full ${accent.bg} text-white text-sm flex items-center justify-center`}>3</span>
            <span>Ask it to build - "Add a pricing page" or "Set up auth"</span>
          </li>
        </ol>
      </section>

      {/* Templates Link */}
      <section className={`p-6 rounded-lg border-2 border-dashed ${theme.divider}`}>
        <h3 className={`text-lg font-semibold ${theme.heading} mb-2`}>Start Faster with Templates</h3>
        <p className={`${theme.muted} mb-4`}>
          Templates come with CLAUDE.md files - drop into any AI editor and run /setup.
        </p>
        <a
          href="/templates"
          className={`inline-flex items-center gap-2 ${accent.text} hover:underline`}
        >
          View Templates
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </section>
    </div>
  );
}

// =============================================================================
// API Reference Content
// =============================================================================

function ApiReferenceContent({ theme, accent }: { theme: any; accent: any }) {
  return (
    <div className="space-y-12">
      {/* Installation */}
      <section id="install">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Installation</h2>
        <CodeBlock theme={theme}>{`npm install @dream-api/sdk`}</CodeBlock>
        <CodeBlock theme={theme} title="Frontend (PK only)">{`import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: 'pk_test_xxx'
});`}</CodeBlock>
        <CodeBlock theme={theme} title="Backend (SK + PK)">{`import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx'
});`}</CodeBlock>
      </section>

      {/* Auth */}
      <section id="auth">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Auth</h2>
        <p className={`${theme.body} mb-4`}>Frontend only. Initialize once on app load.</p>
        <CodeBlock theme={theme}>{`// Initialize (call once in useEffect/onMounted)
await api.auth.init();

// Get auth URLs
api.auth.getSignUpUrl({ redirect: '/dashboard' })  // → URL string
api.auth.getSignInUrl({ redirect: '/dashboard' })  // → URL string
api.auth.getCustomerPortalUrl()                    // → URL string (account settings)

// Check auth state
api.auth.isSignedIn()  // → boolean
api.auth.getUser()     // → { id, email, plan } or null

// Sign out
await api.auth.signOut()`}</CodeBlock>
      </section>

      {/* Usage */}
      <section id="usage">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Usage Tracking</h2>
        <p className={`${theme.body} mb-4`}>Track billable actions. Requires signed-in user.</p>
        <CodeBlock theme={theme}>{`// Track a usage event (increments counter)
const result = await api.usage.track();
// → { success: true, usage: { usageCount, limit, remaining, plan } }

if (!result.success) {
  // User hit their limit - show upgrade prompt
}

// Check usage without incrementing
const usage = await api.usage.check();
// → { usageCount, limit, remaining, plan, periodStart, periodEnd }`}</CodeBlock>
      </section>

      {/* Billing */}
      <section id="billing">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Billing</h2>
        <p className={`${theme.body} mb-4`}>Subscription checkout and management. Requires signed-in user.</p>
        <CodeBlock theme={theme}>{`// Create checkout session for upgrade
const { url } = await api.billing.createCheckout({
  tier: 'pro',              // or priceId: 'price_xxx'
  successUrl: '/dashboard',
  cancelUrl: '/pricing'
});
window.location.href = url;

// Open billing portal (manage subscription)
const { url } = await api.billing.openPortal({
  returnUrl: '/dashboard'
});
window.location.href = url;`}</CodeBlock>
      </section>

      {/* Products */}
      <section id="products">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Products</h2>
        <p className={`${theme.body} mb-4`}>Public endpoints. No auth required.</p>
        <CodeBlock theme={theme}>{`// List subscription tiers (SaaS)
const { tiers } = await api.products.listTiers();
// → [{ name, displayName, price, limit, priceId, features, popular }]

// List products (Store)
const { products } = await api.products.list();
// → [{ name, displayName, price, priceId, imageUrl, inventory, soldOut, features }]

// Guest checkout (Store - no auth needed)
const { url } = await api.products.cartCheckout({
  items: [
    { priceId: 'price_xxx', quantity: 2 },
    { priceId: 'price_yyy', quantity: 1 }
  ],
  customerEmail: 'customer@example.com',  // optional
  successUrl: '/thank-you',
  cancelUrl: '/cart'
});
window.location.href = url;`}</CodeBlock>
        <div className={`mt-4 p-4 rounded-lg ${theme.cardBg}`}>
          <p className={`text-sm ${theme.muted}`}>
            <strong>Note:</strong> <code>price</code> is in cents. Divide by 100 for display: <code>${`{(product.price / 100).toFixed(2)}`}</code>
          </p>
        </div>
      </section>

      {/* Backend / Admin */}
      <section id="backend">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Backend (Admin)</h2>
        <p className={`${theme.body} mb-4`}>Requires secret key. Server-side only.</p>

        <h3 className={`text-lg font-semibold ${theme.heading} mt-6 mb-3`}>Customers</h3>
        <CodeBlock theme={theme}>{`// Create customer
const { customer } = await api.customers.create({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  plan: 'free'
});

// Get customer
const { customer } = await api.customers.get('user_xxx');

// Update customer plan
const { customer } = await api.customers.update('user_xxx', {
  plan: 'pro'
});

// Delete customer
const { success } = await api.customers.delete('user_xxx');`}</CodeBlock>

        <h3 className={`text-lg font-semibold ${theme.heading} mt-6 mb-3`}>Dashboard</h3>
        <CodeBlock theme={theme}>{`// Get dashboard metrics
const dashboard = await api.dashboard.get();
// → {
//   activeSubscriptions, cancelingSubscriptions, mrr,
//   usageThisPeriod, customers, tiers, webhookStatus
// }

// Get totals across all projects
const totals = await api.dashboard.getTotals();
// → { totalRevenue, totalCustomers, totalMRR }`}</CodeBlock>
      </section>

      {/* Types */}
      <section id="types">
        <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Types</h2>
        <CodeBlock theme={theme}>{`interface Tier {
  name: string;
  displayName: string;
  price: number;        // cents
  limit: number;
  priceId: string;
  productId: string;
  features?: string[];
  popular?: boolean;
}

interface Product {
  name: string;
  displayName?: string;
  description?: string;
  price: number;        // cents
  priceId: string;
  productId: string;
  imageUrl?: string;
  inventory?: number;
  soldOut?: boolean;
  features?: string[];
}

interface Usage {
  userId: string;
  plan: string;
  usageCount: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  periodStart: string;
  periodEnd: string;
}`}</CodeBlock>
      </section>

      {/* Templates */}
      <section className={`p-6 rounded-lg ${theme.cardBg}`}>
        <h3 className={`text-lg font-semibold ${theme.heading} mb-2`}>Templates</h3>
        <p className={`${theme.muted} mb-4`}>
          Production-ready apps with everything wired up. Clone and customize with AI.
        </p>
        <div className="space-y-3">
          <div>
            <p className={`text-xs font-semibold ${theme.muted} mb-2`}>React (Vite)</p>
            <div className="flex flex-wrap gap-4">
              <a href={CONFIG.links.saasBasic} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline text-sm`}>dream-saas-basic →</a>
              <a href={CONFIG.links.storeBasic} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline text-sm`}>dream-store-basic →</a>
              <a href={CONFIG.links.membershipBasic} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline text-sm`}>dream-membership-basic →</a>
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold ${theme.muted} mb-2`}>Next.js</p>
            <div className="flex flex-wrap gap-4">
              <a href={CONFIG.links.saasNext} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline text-sm`}>dream-saas-next →</a>
              <a href={CONFIG.links.storeNext} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline text-sm`}>dream-store-next →</a>
              <a href={CONFIG.links.membershipNext} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline text-sm`}>dream-membership-next →</a>
            </div>
          </div>
        </div>
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
