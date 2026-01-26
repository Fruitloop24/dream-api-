/**
 * Terms of Service
 */

import { getTheme, getAccent, CONFIG } from '../config';

export default function Terms() {
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
        <h1 className={`text-4xl font-bold ${theme.heading} mb-4`}>Terms of Service</h1>
        <p className={`text-lg ${theme.muted} mb-8`}>
          Last updated: January 2026 | {CONFIG.company.name}
        </p>

        {/* Plain English Summary */}
        <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-6 mb-12`}>
          <h2 className={`text-xl font-bold ${accent.text} mb-4`}>Plain English Version</h2>
          <ul className={`space-y-2 ${theme.body}`}>
            <li>• You pay $19/mo after a 14-day trial. We charge overage if you exceed 2,000 SaaS users.</li>
            <li>• You need a verified Stripe account to use the service.</li>
            <li>• Don't use it for illegal stuff.</li>
            <li>• We can terminate accounts that abuse the service or don't pay.</li>
            <li>• You own your data and can export it anytime.</li>
            <li>• We're not liable if Stripe, Clerk, or Cloudflare have issues (we depend on them too).</li>
          </ul>
        </div>

        {/* Service Description */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>1. Service Description</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>
              Dream API ("{CONFIG.appName}") is an API-as-a-Service platform that provides authentication,
              billing, and usage tracking infrastructure for developers building SaaS applications,
              e-commerce stores, and membership sites.
            </p>
            <p className={theme.muted}>
              The service is provided by {CONFIG.company.name}, located at {CONFIG.company.address}.
            </p>
          </div>
        </section>

        {/* Account Requirements */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>2. Account Requirements</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>To use Dream API, you must:</p>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li>Be at least 18 years old or the legal age of majority in your jurisdiction</li>
              <li>Have a verified Stripe account in good standing</li>
              <li>Provide accurate account information</li>
              <li>Maintain the security of your API keys</li>
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>3. Pricing & Payment</h2>
          <div className={`${theme.body} space-y-3`}>
            <p><strong>Trial:</strong> 14-day free trial with full access. Credit card required to start.</p>
            <p><strong>Subscription:</strong> $19/month after trial ends.</p>
            <p><strong>SaaS Overage:</strong> $0.03 per end-user per month after 2,000 live users.</p>
            <p><strong>Store Mode:</strong> No per-user fees for guest checkout.</p>
            <p className={theme.muted}>
              All prices are in USD. You will receive an invoice before each charge. Payments are processed
              via Stripe. We do not store your payment information.
            </p>
          </div>
        </section>

        {/* Cancellation */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>4. Cancellation & Refunds</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>
              You may cancel your subscription at any time from the billing portal. Upon cancellation:
            </p>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li>Your API access continues for 7 days (grace period)</li>
              <li>After 7 days, API calls will be rejected</li>
              <li>After 30 days, your data will be permanently deleted</li>
              <li>Export your data before the 30-day mark</li>
            </ul>
            <p className={theme.muted}>
              We do not offer refunds for partial months. If you cancel mid-cycle, you retain access
              until the end of your billing period plus the 7-day grace period.
            </p>
          </div>
        </section>

        {/* Acceptable Use */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>5. Acceptable Use</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>You agree NOT to use Dream API for:</p>
            <ul className={`list-disc list-inside space-y-1 ${theme.muted} ml-4`}>
              <li>Any illegal activity</li>
              <li>Fraud, scams, or deceptive practices</li>
              <li>Distribution of malware or harmful content</li>
              <li>Harassment or abuse of others</li>
              <li>Circumventing usage limits or billing</li>
              <li>Reselling the service without authorization</li>
            </ul>
            <p className={theme.muted}>
              We reserve the right to terminate accounts that violate these terms without refund.
            </p>
          </div>
        </section>

        {/* Data Ownership */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>6. Data Ownership</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>
              <strong>Your data is yours.</strong> You retain all rights to the data you and your users
              create through the service. We do not claim ownership of your content, user data, or
              business information.
            </p>
            <p className={theme.muted}>
              See our <a href="/privacy" className={`${accent.text} hover:underline`}>Privacy Policy</a> for
              details on what data we store and how you can export it.
            </p>
          </div>
        </section>

        {/* Service Availability */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>7. Service Availability</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>
              We strive for high availability but do not guarantee 100% uptime. Dream API depends on
              third-party services (Cloudflare, Clerk, Stripe) that may experience their own outages.
            </p>
            <p className={theme.muted}>
              We are not liable for damages resulting from service interruptions, whether caused by
              us or our infrastructure providers.
            </p>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>8. Limitation of Liability</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {CONFIG.company.name.toUpperCase()} SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.
            </p>
            <p className={theme.muted}>
              Our total liability shall not exceed the amount you paid us in the 12 months preceding
              the claim.
            </p>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>9. Changes to Terms</h2>
          <div className={`${theme.body} space-y-3`}>
            <p>
              We may update these terms from time to time. We will notify you of material changes via
              email or dashboard notification at least 30 days before they take effect.
            </p>
            <p className={theme.muted}>
              Continued use of the service after changes take effect constitutes acceptance of the
              new terms.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>10. Contact</h2>
          <div className={`${theme.body} space-y-2`}>
            <p>Questions about these terms? Contact us:</p>
            <p className={theme.muted}>
              Email: <a href={`mailto:${CONFIG.company.email.founder}`} className={`${accent.text} hover:underline`}>{CONFIG.company.email.founder}</a>
            </p>
            <p className={theme.muted}>
              {CONFIG.company.name}<br />
              {CONFIG.company.address}
            </p>
          </div>
        </section>

        {/* Governing Law */}
        <section className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
          <h2 className={`text-lg font-bold ${theme.heading} mb-2`}>Governing Law</h2>
          <p className={theme.muted}>
            These terms are governed by the laws of the State of Georgia, United States, without regard
            to conflict of law principles. Any disputes shall be resolved in the courts of Dodge County, Georgia.
          </p>
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
