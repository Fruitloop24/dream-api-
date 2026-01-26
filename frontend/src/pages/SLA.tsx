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
            We're not reinventing the wheel - we're making it spin faster. Our job is to return 200s on four API calls.
            That's it. The complex stuff (payments, auth, edge compute) is handled by billion-dollar infrastructure
            we orchestrate on your behalf.
          </p>
          <p className={`${theme.body} mb-4`}>
            We built Dream API on <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>plug-saas</a>,
            our open source foundation. We're committed to transparency and we're here for the long haul.
          </p>
          <p className={`${theme.muted} text-sm`}>
            Questions? Reach out directly to{' '}
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
                <span className="text-2xl font-bold text-[#635BFF]">stripe</span>
                <h3 className={`text-lg font-bold ${theme.heading}`}>Stripe</h3>
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
                <p className={theme.muted}>Email, Telegram, whatever. If you're stuck, we'll help. We won't leave you hanging.</p>
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
                <p className={`font-semibold ${theme.heading}`}>Your data stays yours</p>
                <p className={theme.muted}>CSV export anytime. Your Stripe products stay in your Stripe. Delete a project and it's gone immediately - we don't hoard your data.</p>
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
                <span><strong>Instant support</strong> - We'll get back to you within 24 hours, not 24 seconds.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <span><strong>Enterprise SLAs</strong> - If you need 99.999% uptime guarantees with financial penalties, that's not our focus. We're built for indie devs and small teams shipping fast.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Built for How You Work Today */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Built for How You Work Today</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I'm a developer building tools for developers. I use AI coding assistants every day -
              Claude Code, Cursor, Windsurf. Dream API is built for that workflow:
            </p>
            <ul className={`space-y-2 ${theme.muted}`}>
              <li className="flex items-start gap-3">
                <span className={accent.text}>•</span>
                <span><strong className={theme.heading}>CLAUDE.md in every project</strong> - Context files that tell AI assistants exactly how the codebase works</span>
              </li>
              <li className="flex items-start gap-3">
                <span className={accent.text}>•</span>
                <span><strong className={theme.heading}>/setup and /pwa commands</strong> - AI-executable slash commands in templates. Run them, answer questions, ship.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className={accent.text}>•</span>
                <span><strong className={theme.heading}>Copy-paste AI prompts in docs</strong> - Tested prompts that actually work with today's AI tools</span>
              </li>
            </ul>
            <p className={theme.muted}>
              The goal: prototype fast, test fast, go live, make money. No PhD in auth systems required.
            </p>
          </div>
        </section>

        {/* Open Source Foundation */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Built on Open Source</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              Dream API is built on <strong className={theme.heading}>plug-saas</strong>, our MIT-licensed open source project.
              It's the foundation we started from - well documented, battle-tested, and free to use.
            </p>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 my-4`}>
              <p className={`text-sm ${theme.muted} mb-2`}>
                <strong className={theme.heading}>plug-saas (OSS):</strong> Single-site SaaS backend using KV storage.
                Great for learning, prototypes, or running your own instance. No dashboard, no stores - just the core auth + billing flow.
              </p>
              <p className={`text-sm ${theme.muted}`}>
                <strong className={theme.heading}>Dream API (this service):</strong> Multi-tenant platform with D1 database,
                full dashboard, store mode, templates, and support. Built for production at scale.
              </p>
            </div>
            <p className={theme.muted}>
              Check out plug-saas if you want to learn how it works under the hood or run your own single-site instance.
              The documentation explains everything, including its limitations and how to upgrade when you're ready.
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
                View plug-saas on GitHub
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
