/**
 * Service Level Agreement
 * Honest about what we are: glue between titans
 */

import { getTheme, getAccent, CONFIG } from '../config';

export default function SLA() {
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
        <h1 className={`text-4xl font-bold ${theme.heading} mb-4`}>Service Level Agreement</h1>
        <p className={`text-lg ${theme.muted} mb-8`}>
          What we promise, what we depend on, and what you can expect.
        </p>

        {/* The Honest Truth */}
        <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-8 mb-12`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Let's Be Real</h2>
          <p className={`${theme.body} mb-4`}>
            Dream API is glue. Really good glue. We connect three industry titans - Stripe, Clerk, and Cloudflare -
            into a single, simple SDK that handles auth, billing, and usage tracking.
          </p>
          <p className={`${theme.body} mb-4`}>
            We're a small team. Scrappy. But we're committed to making this the best damn glue in the business.
            Our entire backend is <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>open source</a>.
            We're not hiding anything. We're not going anywhere.
          </p>
          <p className={`${theme.muted} text-sm`}>
            If you have questions, concerns, or just want to chat - reach out directly to{' '}
            <a href={`mailto:${CONFIG.company.email.founder}`} className={`${accent.text} hover:underline`}>{CONFIG.company.email.founder}</a>.
            I read every email.
          </p>
        </div>

        {/* The Stack */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>The Stack We Depend On</h2>
          <p className={`${theme.body} mb-6`}>
            Our uptime is only as good as theirs. Here's who we're built on and their track records:
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Cloudflare */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <svg className="h-8" viewBox="0 0 130 43" fill="none">
                  <path d="M26.9 30.6l.8-2.6c.6-1.8.4-3.5-.6-4.7-1-1.1-2.5-1.8-4.3-1.8H6.5c-.2 0-.4-.1-.5-.2-.1-.2-.1-.4 0-.6.7-2.2 2.8-3.8 5.2-3.8h.5c.3 0 .6-.2.7-.5 1.7-5.1 6.5-8.5 11.9-8.5 5.8 0 10.8 3.9 12.3 9.3.1.3.4.5.7.5 3.7.3 6.7 3.1 7.2 6.8 0 .3.3.6.6.6h2.3c2.1 0 4 1.3 4.8 3.2.1.2.1.5 0 .7-.1.2-.3.3-.6.3l-24.1.1c-.3 0-.5-.3-.6-.5l-.1-.3z" fill="#F6821F"/>
                  <path d="M31.6 30.7c.2.2.1.5-.1.6l-.3.1h-5.4c-.2 0-.5-.1-.6-.3-.7-1.9.2-4 2.1-4.7.5-.2 1-.3 1.5-.3 1.1 0 2.1.5 2.8 1.4.1.2.2.4.1.6l-.1 2.6z" fill="#FAAD3F"/>
                </svg>
                <h3 className={`text-lg font-bold ${theme.heading}`}>Cloudflare</h3>
              </div>
              <p className={`${theme.muted} text-sm mb-3`}>
                Workers, D1, KV, R2. Our entire backend runs on Cloudflare's edge network.
              </p>
              <p className={`${accent.text} text-sm font-medium`}>99.99% uptime SLA</p>
              <a href="https://www.cloudflarestatus.com/" target="_blank" rel="noopener noreferrer" className={`text-xs ${theme.mutedMore} hover:underline`}>
                Status page →
              </a>
            </div>

            {/* Clerk */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-[#6C47FF]">clerk</span>
              </div>
              <p className={`${theme.muted} text-sm mb-3`}>
                Authentication, user management, JWTs. Every auth call goes through Clerk.
              </p>
              <p className={`${accent.text} text-sm font-medium`}>99.99% uptime SLA</p>
              <a href="https://status.clerk.com/" target="_blank" rel="noopener noreferrer" className={`text-xs ${theme.mutedMore} hover:underline`}>
                Status page →
              </a>
            </div>

            {/* Stripe */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <svg className="h-8" viewBox="0 0 468 222.5" fill="#635BFF">
                  <path d="M414 113.4c0-25.6-12.4-45.8-36.1-45.8-23.8 0-38.2 20.2-38.2 45.6 0 30.1 17 45.3 41.4 45.3 11.9 0 20.9-2.7 27.7-6.5v-20c-6.8 3.4-14.6 5.5-24.5 5.5-9.7 0-18.3-3.4-19.4-15.2h48.9c0-1.3.2-6.5.2-8.9zm-49.4-9.5c0-11.3 6.9-16 13.2-16 6.1 0 12.6 4.7 12.6 16h-25.8z"/>
                </svg>
              </div>
              <p className={`${theme.muted} text-sm mb-3`}>
                Payments, subscriptions, Connect. Your money flows through Stripe, not us.
              </p>
              <p className={`${accent.text} text-sm font-medium`}>99.99%+ uptime</p>
              <a href="https://status.stripe.com/" target="_blank" rel="noopener noreferrer" className={`text-xs ${theme.mutedMore} hover:underline`}>
                Status page →
              </a>
            </div>
          </div>
        </section>

        {/* Our Commitment */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>What We Commit To</h2>
          <div className={`${theme.body} space-y-4`}>
            <div className={`flex items-start gap-4`}>
              <span className={`${accent.text} text-xl`}>1.</span>
              <div>
                <p className={`font-semibold ${theme.heading}`}>Keep the glue working</p>
                <p className={theme.muted}>Our code is the integration layer. If Stripe, Clerk, and Cloudflare are up, we should be up. If we're not, that's on us and we'll fix it fast.</p>
              </div>
            </div>
            <div className={`flex items-start gap-4`}>
              <span className={`${accent.text} text-xl`}>2.</span>
              <div>
                <p className={`font-semibold ${theme.heading}`}>Respond within 24 hours</p>
                <p className={theme.muted}>Email, Telegram, whatever. If you're stuck, we'll help. We're a small team so we can't promise instant responses, but we won't leave you hanging.</p>
              </div>
            </div>
            <div className={`flex items-start gap-4`}>
              <span className={`${accent.text} text-xl`}>3.</span>
              <div>
                <p className={`font-semibold ${theme.heading}`}>No surprise changes</p>
                <p className={theme.muted}>30 days notice for any pricing or API changes. We know you're building on us. We won't pull the rug.</p>
              </div>
            </div>
            <div className={`flex items-start gap-4`}>
              <span className={`${accent.text} text-xl`}>4.</span>
              <div>
                <p className={`font-semibold ${theme.heading}`}>Keep the exit door open</p>
                <p className={theme.muted}>Full data export. Open source backend. Your Stripe products stay yours. If you outgrow us or want to self-host, go for it. No hard feelings.</p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Don't Promise */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>What We Can't Promise</h2>
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6`}>
            <ul className={`space-y-3 ${theme.muted}`}>
              <li className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <span><strong>100% uptime</strong> - Nobody can. We depend on three other services. Outages happen.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <span><strong>Instant support</strong> - We're small. We'll get back to you, but it might take a few hours.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <span><strong>Enterprise SLAs</strong> - If you need 99.999% uptime guarantees with financial penalties, you need a bigger company. We're not there yet.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Open Source */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Open Source = Insurance</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              The entire Dream API backend is open source. Not "source available" - actually open source.
              MIT licensed. Fork it. Self-host it. Run it on your own Cloudflare account.
            </p>
            <p className={theme.muted}>
              This is intentional. If we disappear tomorrow (we won't, but hypothetically), you're not stuck.
              Clone the repo, deploy to your own account, update your API keys. Done.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href={CONFIG.links.plugSaas}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-6 py-3 ${accent.bg} text-white rounded-lg ${accent.bgHover} transition-colors`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View Backend Source
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-8`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Questions? Let's Talk.</h2>
          <p className={`${theme.body} mb-6`}>
            I'm KC, the founder. I built this because I needed it for my own projects and figured others might too.
            If you have questions, feedback, or just want to see if we're a good fit - reach out.
          </p>
          <div className={`space-y-2 ${theme.muted}`}>
            <p>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${CONFIG.company.email.founder}`} className={`${accent.text} hover:underline`}>{CONFIG.company.email.founder}</a>
            </p>
            <p>
              <strong>Telegram:</strong> Best for quick questions
            </p>
            <p className="text-sm mt-4">
              {CONFIG.company.name} · {CONFIG.company.address}
            </p>
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
