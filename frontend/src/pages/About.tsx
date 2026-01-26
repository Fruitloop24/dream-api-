/**
 * About Page - Placeholder
 * TODO: KC to fill in personal story
 */

import { getTheme, getAccent, CONFIG } from '../config';

export default function About() {
  const theme = getTheme();
  const accent = getAccent();

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
            <a href="/who-am-i" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Who Am I</a>
            <a href="/why-trust-us" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Why Trust Us</a>
            <a href="/docs" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Quickstart</a>
            <a href="/templates" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Templates</a>
            <a href="/sign-in" className={`px-4 py-2 rounded ${accent.bg} text-white ${accent.bgHover} transition-colors`}>
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-12 px-6">
        <h1 className={`text-4xl font-bold ${theme.heading} mb-8`}>About</h1>

        {/* The Story */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>The Story</h2>
          <div className={`${theme.body} space-y-4`}>
            {/* TODO: KC - Fill in your story here */}
            <p>
              Dream API was born out of frustration. Every time I started a new project, I'd spend weeks
              wiring up auth, billing, and usage tracking. The same code, slightly different each time.
              Copy-paste from the last project, fix the bugs I'd already fixed before.
            </p>
            <p>
              I wanted something simple. One SDK. One dashboard. Auth, billing, usage - done.
              Connect your Stripe, drop in a key, and get back to building the actual product.
            </p>
            <p>
              That's Dream API.
            </p>
          </div>
        </section>

        {/* The Person */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>The Person</h2>
          <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-8`}>
            <div className="flex items-start gap-6">
              {/* Photo placeholder */}
              <div className={`w-24 h-24 rounded-xl ${theme.cardBg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-4xl ${theme.mutedMore}`}>KC</span>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${theme.heading} mb-2`}>KC Sheffield</h3>
                <p className={`${accent.text} text-sm mb-4`}>Founder, {CONFIG.company.name}</p>
                <div className={`${theme.muted} space-y-3`}>
                  {/* TODO: KC - Add your bio here */}
                  <p>
                    Developer based in Georgia. Building tools I wish existed.
                  </p>
                  <p>
                    Committed to open source. The entire backend is MIT licensed because
                    I believe you should be able to see what you're depending on.
                  </p>
                  <p>
                    If you want to chat - about Dream API or just dev stuff in general -
                    hit me up at{' '}
                    <a href={`mailto:${CONFIG.company.email.founder}`} className={`${accent.text} hover:underline`}>
                      {CONFIG.company.email.founder}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Company */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>The Company</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              <strong className={theme.heading}>{CONFIG.company.name}</strong> is a small software company
              focused on developer tools. Dream API is our main product.
            </p>
            <div className={`${theme.muted} text-sm`}>
              <p>{CONFIG.company.address}</p>
              <p className="mt-2">
                <a href={`mailto:${CONFIG.company.email.sales}`} className={`${accent.text} hover:underline`}>
                  {CONFIG.company.email.sales}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Open Source Foundation */}
        <section className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8`}>
          <h2 className={`text-xl font-bold ${theme.heading} mb-4`}>Built on Open Source</h2>
          <p className={`${theme.muted} mb-4`}>
            Dream API is built on <strong className={theme.heading}>plug-saas</strong>, our open source foundation.
            It's a single-site SaaS backend using KV storage - great for learning or running your own instance.
          </p>
          <p className={`${theme.muted} mb-6 text-sm`}>
            Dream API adds the multi-tenant architecture, D1 database, dashboard, store mode, and templates.
            But if you want to understand how it works under the hood, plug-saas is fully documented.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={CONFIG.links.plugSaas}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2 ${theme.cardBgAlt} border ${theme.cardBorder} rounded-lg hover:border-gray-500 transition-colors`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              plug-saas (OSS Foundation)
            </a>
            <a
              href={CONFIG.links.saasBasic}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2 ${theme.cardBgAlt} border ${theme.cardBorder} rounded-lg hover:border-gray-500 transition-colors`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Templates
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className={`py-8 px-4 border-t ${theme.footerBorder} ${theme.footerBg}`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${theme.mutedMore} text-sm`}>{CONFIG.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
