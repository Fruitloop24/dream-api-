/**
 * Privacy Policy & Data Retention
 */

import { getTheme, getAccent, CONFIG } from '../config';

export default function Privacy() {
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
            <a href="/docs" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Quickstart</a>
            <a href="/why-trust-us" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Why Trust Us</a>
            <a href="/templates" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Templates</a>
            <a href="/sign-in" className={`px-4 py-2 rounded ${accent.bg} text-white ${accent.bgHover} transition-colors`}>
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-12 px-6">
        <h1 className={`text-4xl font-bold ${theme.heading} mb-4`}>Privacy Policy & Data Retention</h1>
        <p className={`text-lg ${theme.muted} mb-8`}>
          Last updated: January 2026 | {CONFIG.company.name}
        </p>

        {/* TL;DR Box */}
        <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6 mb-12`}>
          <h2 className={`text-xl font-bold ${accent.text} mb-4`}>TL;DR - The Short Version</h2>
          <ul className={`space-y-2 ${theme.body}`}>
            <li className="flex items-start gap-3">
              <span className={accent.text}>✓</span>
              <span><strong>Your Stripe stays yours.</strong> We connect via OAuth but never store your Stripe credentials, products, or customer payment info.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className={accent.text}>✓</span>
              <span><strong>Export everything.</strong> Full data export available anytime. Your users, usage data, configuration - all of it.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className={accent.text}>✓</span>
              <span><strong>Built on open source.</strong> Our foundation (plug-saas) is MIT-licensed. CSV export anytime. Your data stays portable.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className={accent.text}>✓</span>
              <span><strong>We don't sell data.</strong> Ever. Your data is yours.</span>
            </li>
          </ul>
        </div>

        {/* What We Store */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>What We Store</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>When you use Dream API, we store the minimum data needed to provide the service:</p>

            <h3 className={`text-lg font-semibold ${theme.heading} mt-6`}>For You (The Developer)</h3>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li>Email address (via Clerk authentication)</li>
              <li>Project configuration (tier names, prices, limits you set)</li>
              <li>API keys (publishable and secret keys we generate)</li>
              <li>Stripe Connect account ID (to link your Stripe, not your credentials)</li>
            </ul>

            <h3 className={`text-lg font-semibold ${theme.heading} mt-6`}>For Your End Users</h3>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li>Clerk user ID and email</li>
              <li>Which plan they're on</li>
              <li>Usage counts (if you use metered billing)</li>
              <li>Subscription status from Stripe webhooks</li>
            </ul>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 mt-6`}>
              <p className={`${theme.muted} text-sm`}>
                <strong className={theme.heading}>What we DON'T store:</strong> Credit card numbers, bank accounts, Stripe API keys,
                product catalog details, transaction histories, or any payment information. That all lives in Stripe where it belongs.
              </p>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Data Export</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              You can export all your data at any time from the dashboard. This includes:
            </p>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li>All end-user records (IDs, emails, plans, usage)</li>
              <li>Project configuration and tier settings</li>
              <li>Usage history and analytics</li>
              <li>Webhook event logs</li>
            </ul>
            <p className={theme.muted}>
              Export format is CSV. Your data should be portable. If you decide to leave,
              you take everything with you.
            </p>
          </div>
        </section>

        {/* Immediate Deletion */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Immediate Deletion</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              Want your data gone <em>right now</em>? You have full control:
            </p>
            <div className={`${theme.cardBgAlt} border-2 ${accent.border} rounded-lg p-6`}>
              <h3 className={`text-lg font-bold ${theme.heading} mb-3`}>Delete Project = Instant Wipe</h3>
              <p className={theme.muted}>
                Go to your project settings and click "Delete Project." That's it. All end-user data,
                usage records, configuration - everything associated with that project is
                <strong className={theme.heading}> permanently and immediately deleted</strong>.
                No waiting period. No "we'll get to it." Gone.
              </p>
              <p className={`${theme.muted} mt-3 text-sm`}>
                Export your data first if you need it - this action is irreversible.
              </p>
            </div>
            <p className={theme.muted}>
              We don't keep backups of your data "just in case." We don't sell it. We don't analyze it
              for trends. When you delete, it's deleted. That's how it should work.
            </p>
          </div>
        </section>

        {/* Your Data, Your Control */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Your Data, Your Control</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I'm a developer building for developers. I know the frustration of platforms that hold your data hostage
              or make it hard to leave. Dream API is designed with you in control:
            </p>

            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-lg p-6 my-6`}>
              <h3 className={`text-lg font-bold ${accent.text} mb-3`}>Open Source Foundation</h3>
              <p className={theme.muted}>
                Dream API is built on{' '}
                <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>
                  plug-saas
                </a>
                , our MIT-licensed open source project. It's a single-site SaaS backend you can run yourself.
                Dream API adds multi-tenant architecture, D1 database, dashboard, and more - but the foundation is open.
              </p>
            </div>

            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-lg p-6 my-6`}>
              <h3 className={`text-lg font-bold ${accent.text} mb-3`}>Your Stripe, Your Products</h3>
              <p className={theme.muted}>
                Products, prices, and subscriptions live in YOUR Stripe account. If you leave Dream API,
                nothing changes for your customers. Their subscriptions continue. Your revenue continues.
                You just need a new way to check auth and track usage.
              </p>
            </div>

            <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-lg p-6 my-6`}>
              <h3 className={`text-lg font-bold ${accent.text} mb-3`}>Why Store Isn't Separate</h3>
              <p className={theme.muted}>
                I intentionally didn't build the store functionality as a separate, locked-in service.
                It uses the same SDK, same patterns, same export capabilities. No artificial barriers
                between "store" and "SaaS" features. It's all just your product.
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Data Retention</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>Here's what happens to your data in different scenarios:</p>

            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${theme.muted}`}>
                <thead>
                  <tr className={`border-b ${theme.divider}`}>
                    <th className={`text-left py-3 ${theme.heading}`}>Scenario</th>
                    <th className={`text-left py-3 ${theme.heading}`}>What Happens</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.divider}`}>
                  <tr>
                    <td className="py-3">Active subscription</td>
                    <td className="py-3">Data retained indefinitely</td>
                  </tr>
                  <tr>
                    <td className="py-3">Cancel subscription</td>
                    <td className="py-3">7-day grace period (API still works), then API access stops</td>
                  </tr>
                  <tr>
                    <td className="py-3">30 days after cancellation</td>
                    <td className="py-3">Data permanently deleted (export first!)</td>
                  </tr>
                  <tr>
                    <td className="py-3">Request deletion</td>
                    <td className="py-3">Email us, we delete within 48 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Cookies & Analytics</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>We use minimal cookies:</p>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li><strong>Clerk session cookies</strong> - Required for authentication</li>
              <li><strong>Cloudflare cookies</strong> - Security and performance (DDoS protection)</li>
            </ul>
            <p className={theme.muted}>
              We don't use Google Analytics, Facebook pixels, or any third-party tracking.
              We have internal metrics for things like "how many users signed up today" but we don't
              track individual behavior or sell data to advertisers.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Contact</h2>
          <div className={`${theme.body} space-y-2`}>
            <p>Questions about privacy or data? Reach out:</p>
            <p className={theme.muted}>
              Email: <a href={`mailto:${CONFIG.company.email.founder}`} className={`${accent.text} hover:underline`}>{CONFIG.company.email.founder}</a>
            </p>
            <p className={theme.muted}>
              {CONFIG.company.name}<br />
              {CONFIG.company.address}
            </p>
          </div>
        </section>

        {/* Open Source Foundation */}
        <section className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Built on Open Source</h2>
          <p className={`${theme.body} mb-4`}>
            Dream API is built on plug-saas, our MIT-licensed foundation. It's a single-site SaaS backend
            you can inspect, learn from, or run yourself. Dream API adds the multi-tenant architecture,
            dashboard, and store functionality - but the core patterns are open for everyone.
          </p>
          <a
            href={CONFIG.links.plugSaas}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-6 py-3 ${accent.bg} text-white rounded-lg ${accent.bgHover} transition-colors`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View plug-saas on GitHub
          </a>
        </section>
      </div>

      {/* Simple Footer */}
      <footer className={`py-8 px-4 border-t ${theme.footerBorder} ${theme.footerBg}`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${theme.mutedMore} text-sm`}>{CONFIG.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
