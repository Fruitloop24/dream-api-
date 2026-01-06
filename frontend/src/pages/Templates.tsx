/**
 * Templates Page - Showcase free templates with download links
 * Uses config.ts for consistent branding
 */

import { getTheme, getAccent, CONFIG, getPrimaryButtonClasses, getSecondaryButtonClasses } from '../config';

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

  const templates = [
    {
      name: 'SaaS Basic',
      icon: '📊',
      description: 'Perfect for AI tools, APIs, developer tools, or any subscription-based app.',
      features: [
        'React + TypeScript + Vite',
        'Auth fully wired (sign up, sign in, sign out)',
        'Billing integrated (checkout, portal)',
        'Usage tracking with tier limits',
        'Dashboard with usage display',
        'Responsive landing page',
      ],
      aiCommands: [
        { cmd: '/setup', desc: 'AI-guided configuration wizard' },
        { cmd: '/pwa', desc: 'Make your app installable' },
      ],
      demoUrl: CONFIG.links.saasDemo,
      githubUrl: CONFIG.links.saasRepo,
      downloadUrl: 'https://github.com/panacea-tech/dream-saas-basic/archive/refs/heads/main.zip',
    },
    {
      name: 'Store Basic',
      icon: '🛒',
      description: 'Perfect for digital products, merchandise, courses, or any e-commerce site.',
      features: [
        'React + TypeScript + Vite',
        'Product catalog from dashboard',
        'Shopping cart functionality',
        'Guest checkout (no auth required)',
        'Order confirmation flow',
        'Responsive product grid',
      ],
      aiCommands: [
        { cmd: '/setup', desc: 'AI-guided configuration wizard' },
        { cmd: '/pwa', desc: 'Make your app installable' },
      ],
      demoUrl: CONFIG.links.storeDemo,
      githubUrl: CONFIG.links.storeRepo,
      downloadUrl: 'https://github.com/panacea-tech/dream-store-basic/archive/refs/heads/main.zip',
    },
  ];

  return (
    <div className={`min-h-screen ${theme.pageBg} ${theme.heading}`}>
      {/* Nav */}
      <nav className={`${theme.navBg} border-b ${theme.navBorder}`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className={`text-xl font-bold ${theme.heading}`}>{CONFIG.appName}</a>
            <div className={`hidden md:flex items-center gap-6 text-sm ${theme.navText}`}>
              <a href="/#dashboard" className={theme.navTextHover}>Dashboard</a>
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
          <p className={`text-xl ${theme.muted} max-w-2xl mx-auto`}>
            Production-ready React templates with auth, billing, and usage tracking already wired up.
            Clone, customize with AI, and ship.
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
                Interactive wizard that configures your entire app. Set your brand name, colors,
                publishable key, and content - all through conversation with AI.
              </p>
            </div>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
              <code className={`${accent.text} text-lg font-bold`}>/pwa</code>
              <p className={`${theme.muted} mt-2`}>
                Make your app installable on any device. Adds service worker, manifest,
                and offline support. One command, full PWA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Templates List */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {templates.map((template) => (
              <div key={template.name} className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden`}>
                <div className="p-8">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* Left: Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">{template.icon}</span>
                        <h3 className="text-2xl font-bold">{template.name}</h3>
                      </div>
                      <p className={`${theme.muted} mb-6`}>{template.description}</p>

                      {/* Features */}
                      <div className="grid sm:grid-cols-2 gap-2 mb-6">
                        {template.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckIcon className={accent.text} />
                            <span className={theme.body}>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* AI Commands */}
                      <div className={`${theme.cardBgAlt} rounded-lg p-4 mb-6`}>
                        <p className={`text-sm font-medium mb-2 ${theme.muted}`}>AI Commands:</p>
                        <div className="flex flex-wrap gap-4">
                          {template.aiCommands.map((cmd) => (
                            <div key={cmd.cmd} className="text-sm">
                              <code className={accent.text}>{cmd.cmd}</code>
                              <span className={theme.mutedMore}> - {cmd.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="md:w-64 space-y-3">
                      <a
                        href={template.downloadUrl}
                        className={`flex items-center justify-center gap-2 w-full py-3 ${primaryBtn}`}
                      >
                        <DownloadIcon />
                        Download ZIP
                      </a>
                      <a
                        href={template.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 w-full py-3 ${secondaryBtn}`}
                      >
                        <GithubIcon />
                        View on GitHub
                      </a>
                      {template.demoUrl !== '#' && (
                        <a
                          href={template.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block w-full py-3 text-center ${theme.muted} ${theme.navTextHover} text-sm`}
                        >
                          Try Live Demo →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
                <span className={theme.mutedMore}># 1. Download or clone</span>{'\n'}
                <span className={accent.text}>git clone</span> https://github.com/panacea-tech/dream-saas-basic{'\n\n'}
                <span className={theme.mutedMore}># 2. Install dependencies</span>{'\n'}
                <span className={accent.text}>npm install</span>{'\n\n'}
                <span className={theme.mutedMore}># 3. Run AI setup (in Claude Code, Cursor, etc.)</span>{'\n'}
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

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to build?</h2>
          <p className={`${theme.muted} mb-8`}>
            Get your API keys from the dashboard, download a template, and ship your product today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/sign-up" className={`px-8 py-4 ${primaryBtn} text-lg`}>Get API Keys</a>
            <a href="/" className={`px-8 py-4 ${secondaryBtn} text-lg`}>Learn More</a>
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
              <a href={CONFIG.links.docs} className={theme.navTextHover}>Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
