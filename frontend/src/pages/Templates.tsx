/**
 * Templates Page - Showcase all free templates
 * React + Next.js versions for SaaS, Store, Membership
 */

import { getTheme, getAccent, CONFIG, getPrimaryButtonClasses, getSecondaryButtonClasses } from '../config';

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function Templates() {
  const theme = getTheme();
  const accent = getAccent();
  const primaryBtn = getPrimaryButtonClasses();
  const secondaryBtn = getSecondaryButtonClasses();

  const reactTemplates = [
    {
      name: 'SaaS Basic',
      icon: '📊',
      description: 'Usage-metered apps with subscription tiers. Perfect for AI tools, APIs, developer tools.',
      features: ['Auth (sign up, sign in, sign out)', 'Usage tracking with limits', 'Subscription billing', 'Dashboard with usage display'],
      demoUrl: CONFIG.links.saasDemo,
      githubUrl: CONFIG.links.saasBasic,
      downloadUrl: 'https://github.com/Fruitloop24/dream-saas-basic/archive/refs/heads/master.zip',
    },
    {
      name: 'Store Basic',
      icon: '🛒',
      description: 'E-commerce with guest checkout. Perfect for digital products, merch, courses.',
      features: ['Product catalog from dashboard', 'Shopping cart', 'Guest checkout (no auth)', 'Inventory management'],
      demoUrl: CONFIG.links.storeDemo,
      githubUrl: CONFIG.links.storeBasic,
      downloadUrl: 'https://github.com/Fruitloop24/dream-store-basic/archive/refs/heads/master.zip',
    },
    {
      name: 'Membership Basic',
      icon: '🔐',
      description: 'Gated content with paid access. Perfect for courses, communities, premium content.',
      features: ['Content gating (free vs paid)', 'Member dashboard', 'Auto-checkout flow', 'Upgrade prompts'],
      demoUrl: CONFIG.links.membershipDemo,
      githubUrl: CONFIG.links.membershipBasic,
      downloadUrl: 'https://github.com/Fruitloop24/dream-membership-basic/archive/refs/heads/master.zip',
    },
  ];

  const nextTemplates = [
    {
      name: 'SaaS Next',
      icon: '📊',
      description: 'Same features as SaaS Basic, built with Next.js App Router.',
      features: ['Server components', 'SEO optimized', 'Edge-ready', 'App Router'],
      demoUrl: '', // No Next.js demo yet
      githubUrl: CONFIG.links.saasNext,
      downloadUrl: 'https://github.com/Fruitloop24/dream-saas-next/archive/refs/heads/master.zip',
    },
    {
      name: 'Store Next',
      icon: '🛒',
      description: 'Same features as Store Basic, built with Next.js App Router.',
      features: ['Server components', 'SEO optimized', 'Edge-ready', 'App Router'],
      demoUrl: '', // No Next.js demo yet
      githubUrl: CONFIG.links.storeNext,
      downloadUrl: 'https://github.com/Fruitloop24/dream-store-next/archive/refs/heads/master.zip',
    },
    {
      name: 'Membership Next',
      icon: '🔐',
      description: 'Same features as Membership Basic, built with Next.js App Router.',
      features: ['Server components', 'SEO optimized', 'Edge-ready', 'App Router'],
      demoUrl: '', // No Next.js demo yet
      githubUrl: CONFIG.links.membershipNext,
      downloadUrl: 'https://github.com/Fruitloop24/dream-membership-next/archive/refs/heads/master.zip',
    },
  ];

  return (
    <div className={`min-h-screen ${theme.pageBg} ${theme.heading}`}>
      {/* Nav */}
      <nav className={`${theme.navBg} border-b ${theme.navBorder}`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              {CONFIG.logo && <img src={CONFIG.logo} alt={CONFIG.appName} className="h-8 w-auto rounded-lg" />}
              <span className={`text-xl font-bold ${theme.heading}`}>{CONFIG.appName}</span>
            </a>
            <div className={`hidden md:flex items-center gap-6 text-sm ${theme.navText}`}>
              <a href="/docs" className={theme.navTextHover}>Quickstart</a>
              <a href="/why-trust-us" className={theme.navTextHover}>Why Trust Us</a>
              <a href="/templates" className={`${accent.text} font-medium`}>Templates</a>
              <a href="/#pricing" className={theme.navTextHover}>Pricing</a>
              <a href={CONFIG.links.github} target="_blank" rel="noopener noreferrer" className={theme.navTextHover}>GitHub</a>
            </div>
            <div className="flex items-center gap-3">
              <a href="/sign-in" className={`text-sm ${theme.navText} ${theme.navTextHover}`}>Sign In</a>
              <a href="/sign-up" className={`px-4 py-2 ${primaryBtn} text-sm`}>Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Free Templates</h1>
          <p className={`text-xl ${theme.muted} max-w-2xl mx-auto mb-4`}>
            Production-ready apps with auth, billing, and usage tracking wired up.
            Clone, run <code className={accent.text}>/setup</code>, and ship.
          </p>
          <p className={`${theme.mutedMore} text-sm`}>
            Try demos with test card: <code className={`${accent.text} bg-gray-800 px-2 py-1 rounded`}>4242 4242 4242 4242</code>
          </p>
        </div>
      </section>

      {/* AI Commands Highlight */}
      <section className={`py-12 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">AI-Powered Customization</h2>
            <p className={theme.muted}>Works with Claude Code, Cursor, Windsurf, and other AI editors</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
              <code className={`${accent.text} text-lg font-bold`}>/setup</code>
              <p className={`${theme.muted} mt-2`}>
                Interactive wizard that configures everything. Brand name, colors,
                API key, content - all through conversation with AI.
              </p>
            </div>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
              <code className={`${accent.text} text-lg font-bold`}>/pwa</code>
              <p className={`${theme.muted} mt-2`}>
                Make your app installable. Adds service worker, manifest,
                and offline support. One command, full PWA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PWA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8`}>
            <div className="flex items-start gap-4">
              <span className="text-4xl">📱</span>
              <div>
                <h3 className="text-2xl font-bold mb-2">PWA Support (React Templates)</h3>
                <p className={`${theme.muted} mb-4`}>
                  Turn your web app into a native-like experience. Users can install it on their phone,
                  access it from their home screen, and use it offline.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <CheckIcon className={accent.text} />
                    <span className={theme.body}>Install on any device</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className={accent.text} />
                    <span className={theme.body}>Works offline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className={accent.text} />
                    <span className={theme.body}>Home screen icon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className={accent.text} />
                    <span className={theme.body}>Push notifications (coming)</span>
                  </div>
                </div>
                <p className={`${theme.mutedMore} text-sm mt-4`}>
                  Just run <code className={accent.text}>/pwa</code> in your AI editor after setup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* React Templates */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">React Templates</h2>
          <p className={`${theme.muted} mb-8`}>
            Vite + React + TypeScript. Fast dev server, instant HMR. Best for getting started quickly.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {reactTemplates.map((template) => (
              <TemplateCard key={template.name} template={template} theme={theme} accent={accent} primaryBtn={primaryBtn} secondaryBtn={secondaryBtn} />
            ))}
          </div>
        </div>
      </section>

      {/* Next.js Advantages */}
      <section className={`py-16 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Why Next.js?</h2>
            <p className={theme.muted}>For production apps that need more</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 text-center`}>
              <span className="text-2xl">⚡</span>
              <h4 className="font-semibold mt-2">Server Components</h4>
              <p className={`${theme.mutedMore} text-sm mt-1`}>Less JS shipped to client</p>
            </div>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 text-center`}>
              <span className="text-2xl">🔍</span>
              <h4 className="font-semibold mt-2">SEO Optimized</h4>
              <p className={`${theme.mutedMore} text-sm mt-1`}>Server-rendered HTML</p>
            </div>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 text-center`}>
              <span className="text-2xl">🌐</span>
              <h4 className="font-semibold mt-2">Edge Ready</h4>
              <p className={`${theme.mutedMore} text-sm mt-1`}>Deploy to Vercel Edge</p>
            </div>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 text-center`}>
              <span className="text-2xl">📁</span>
              <h4 className="font-semibold mt-2">App Router</h4>
              <p className={`${theme.mutedMore} text-sm mt-1`}>Modern routing patterns</p>
            </div>
          </div>
        </div>
      </section>

      {/* Next.js Templates */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Next.js Templates</h2>
          <p className={`${theme.muted} mb-8`}>
            Next.js 14 + App Router + TypeScript. Server components, SEO, edge deployment.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {nextTemplates.map((template) => (
              <TemplateCard key={template.name} template={template} theme={theme} accent={accent} primaryBtn={primaryBtn} secondaryBtn={secondaryBtn} />
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className={`py-16 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Quick Start</h2>
          <div className={`${theme.codeBg} rounded-xl p-6 overflow-x-auto`}>
            <pre className="text-sm">
              <code>
                <span className={theme.mutedMore}># 1. Clone any template</span>{'\n'}
                <span className={accent.text}>git clone</span> https://github.com/Fruitloop24/dream-saas-basic{'\n\n'}
                <span className={theme.mutedMore}># 2. Install dependencies</span>{'\n'}
                <span className={accent.text}>npm install</span>{'\n\n'}
                <span className={theme.mutedMore}># 3. Run AI setup (Claude Code, Cursor, Windsurf)</span>{'\n'}
                <span className="text-amber-400">/setup</span>{'\n\n'}
                <span className={theme.mutedMore}># 4. Start dev server</span>{'\n'}
                <span className={accent.text}>npm run dev</span>{'\n\n'}
                <span className={theme.mutedMore}># 5. (Optional) Add PWA support</span>{'\n'}
                <span className="text-amber-400">/pwa</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Self-Host Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8 text-center`}>
            <span className="text-4xl mb-4 block">🔧</span>
            <h2 className="text-2xl font-bold mb-2">Self-Host the Backend</h2>
            <p className={`${theme.muted} mb-6 max-w-lg mx-auto`}>
              Want to run your own Dream API instance? <strong>plug-saas</strong> is the open-source backend.
              Deploy your own auth + billing infrastructure on Cloudflare Workers.
            </p>
            <a
              href={CONFIG.links.plugSaas}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-6 py-3 ${secondaryBtn}`}
            >
              <GithubIcon />
              View plug-saas on GitHub
            </a>
            <p className={`${theme.mutedMore} text-sm mt-4`}>
              MIT License - Do whatever you want with it.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-16 px-4 ${theme.sectionAlt}`}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to build?</h2>
          <p className={`${theme.muted} mb-8`}>
            Get your API keys, download a template, and ship your product today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/sign-up" className={`px-8 py-4 ${primaryBtn} text-lg`}>Get API Keys</a>
            <a href="/docs" className={`px-8 py-4 ${secondaryBtn} text-lg`}>Read the Docs</a>
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
              <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={theme.navTextHover}>plug-saas</a>
              <a href={CONFIG.links.docs} className={theme.navTextHover}>Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Template Card Component
function TemplateCard({ template, theme, accent, primaryBtn, secondaryBtn }: {
  template: { name: string; icon: string; description: string; features: string[]; demoUrl?: string; githubUrl: string; downloadUrl: string };
  theme: any;
  accent: any;
  primaryBtn: string;
  secondaryBtn: string;
}) {
  return (
    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 flex flex-col`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{template.icon}</span>
        <h3 className="text-xl font-bold">{template.name}</h3>
      </div>
      <p className={`${theme.muted} text-sm mb-4`}>{template.description}</p>
      <div className="space-y-2 mb-6 flex-1">
        {template.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckIcon className={accent.text} />
            <span className={theme.body}>{feature}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {template.demoUrl && (
          <a
            href={template.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 w-full py-2.5 ${primaryBtn} text-sm`}
          >
            Try Demo
          </a>
        )}
        <div className="flex gap-2">
          <a
            href={template.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 flex-1 py-2.5 ${secondaryBtn} text-sm`}
          >
            <GithubIcon />
            GitHub
          </a>
          <a
            href={template.downloadUrl}
            className={`flex items-center justify-center gap-2 flex-1 py-2.5 ${secondaryBtn} text-sm`}
          >
            ZIP
          </a>
        </div>
      </div>
    </div>
  );
}
