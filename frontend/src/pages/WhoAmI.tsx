/**
 * Who Am I - Personal story and trust building
 * The human behind Dream API
 */

import { getTheme, getAccent, CONFIG } from '../config';

export default function WhoAmI() {
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
            <a href="/who-am-i" className={`${accent.text} font-medium`}>Who Am I</a>
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
        {/* Hero Section with Photo */}
        <div className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-8 mb-12`}>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Photo Placeholder - Replace with actual photo */}
            <div className={`w-48 h-48 rounded-xl ${theme.cardBg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
              {/* TODO: Replace with actual photo of KC and Blue */}
              <div className="text-center">
                <span className={`text-6xl`}>👨‍💻</span>
                <p className={`text-xs ${theme.mutedMore} mt-2`}>Photo coming soon</p>
              </div>
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${theme.heading} mb-2`}>Hey, I'm KC</h1>
              <p className={`${accent.text} mb-4`}>Founder, Panacea Tech</p>
              <p className={`${theme.body} text-lg`}>
                I'm a developer from Georgia who got tired of the same problem every indie dev faces:
                spending $25-75/month on infrastructure before you can even test an idea.
              </p>
            </div>
          </div>
        </div>

        {/* The Journey */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>The Long Road Here</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I've worn a lot of hats. Started as a <strong className={theme.heading}>timber man</strong> -
              real work, good money, hard on the body. Then I opened a <strong className={theme.heading}>car lot</strong>,
              learned sales, learned people. Sold the land and went into <strong className={theme.heading}>teaching</strong>.
            </p>
            <p>
              Worked my way up to <strong className={theme.heading}>education administration</strong>.
              Thought that was the path. Then life happened - family emergency meant I needed to move
              closer to home. Plans change.
            </p>
            <p>
              That's when I started <strong className={theme.heading}>Panacea Tech</strong>. Finally had the
              time to build things I'd been thinking about for years. Started working on my own SaaS ideas,
              and immediately hit the wall every indie dev knows:
            </p>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-6 my-6`}>
              <p className={`${theme.muted} italic`}>
                "Before I could even test if anyone wanted my product, I needed to set up auth, billing,
                usage tracking, a database, webhooks... $50-75/month in infrastructure costs just to
                prototype. That's backwards."
              </p>
            </div>
            <p>
              So I built <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>plug-saas</a> -
              an open source template to solve it for myself. KV storage, simple auth + billing, one Cloudflare account.
              Free tier friendly.
            </p>
            <p>
              Then I thought: what if I made this even easier? What if you didn't need to deploy anything?
              Just an API key and an SDK. That's how <strong className={theme.heading}>Dream API</strong> was born.
            </p>
          </div>
        </section>

        {/* What Dream API Solves */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>What Dream API Actually Solves</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              If you've ever tried to add auth and billing to a project, you know the pain:
            </p>
            <div className="grid md:grid-cols-2 gap-4 my-6">
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>Auth Headaches</p>
                <ul className={`text-sm ${theme.muted} space-y-1`}>
                  <li>• JWT verification on every request</li>
                  <li>• Session management</li>
                  <li>• Token refresh logic</li>
                  <li>• Security audits</li>
                </ul>
              </div>
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>Billing Nightmares</p>
                <ul className={`text-sm ${theme.muted} space-y-1`}>
                  <li>• Webhook signature verification</li>
                  <li>• Idempotency handling</li>
                  <li>• Subscription state sync</li>
                  <li>• Usage metering & limits</li>
                </ul>
              </div>
            </div>
            <p>
              Dream API handles all of this. Your job is to return 200s on four API calls.
              The billion-dollar infrastructure (Stripe, Clerk, Cloudflare) does the heavy lifting.
              We just orchestrate it with one SDK and one publishable key.
            </p>
          </div>
        </section>

        {/* Why Cloudflare */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Why We Built on Cloudflare</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I looked at AWS, Vercel, Railway - all good platforms. But Cloudflare Workers hit different
              for this use case:
            </p>
            <div className={`${theme.cardBgAlt} border-2 ${accent.border} rounded-xl p-6 my-6`}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className={`font-semibold ${theme.heading}`}>Zero Cold Starts</p>
                    <p className={`text-sm ${theme.muted}`}>Workers are always warm. No 500ms Lambda spinups.</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${theme.heading}`}>True Edge Computing</p>
                    <p className={`text-sm ${theme.muted}`}>&lt;50ms latency worldwide. Your API is fast everywhere.</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${theme.heading}`}>No SSH, Low Attack Surface</p>
                    <p className={`text-sm ${theme.muted}`}>Serverless = no servers to compromise. Smaller target.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className={`font-semibold ${theme.heading}`}>DDoS Protection Built-In</p>
                    <p className={`text-sm ${theme.muted}`}>Enterprise-grade protection. One toggle in the dashboard.</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${theme.heading}`}>IP Blocking at Infrastructure</p>
                    <p className={`text-sm ${theme.muted}`}>Block bad actors at the edge, before they hit your code.</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${theme.heading}`}>Everything Signed & Verified</p>
                    <p className={`text-sm ${theme.muted}`}>Webhook signatures, JWT verification, secrets management.</p>
                  </div>
                </div>
              </div>
            </div>
            <p>
              We also follow <strong className={theme.heading}>Stripe's proven key model</strong>:
              publishable keys for frontend (safe to expose), secret keys for backend (never expose).
              If it's good enough for Stripe, it's good enough for us.
            </p>
          </div>
        </section>

        {/* This Matters To Me */}
        <section className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8 mb-12`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>This Project Means a Lot to Me</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I'm not a VC-backed startup trying to hit growth metrics. I'm a developer who built
              something I needed, and I think other developers need it too.
            </p>
            <p>
              Dream API is my bet that there's a better way to help indie devs ship. Lower the barrier.
              Remove the infrastructure tax. Let people test their ideas without spending $50/month
              before they have a single customer.
            </p>
            <p className={`${accent.text} font-medium`}>
              I would genuinely love your feedback - good, bad, or brutal. Tell me what's broken.
              Tell me what's missing. Tell me if this is useful or if I'm solving the wrong problem.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className={`${theme.cardBgAlt} border ${theme.cardBorder} rounded-xl p-8`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Let's Talk</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I read every email. I respond to every message. If you have questions, feedback,
              or just want to chat about what you're building - reach out.
            </p>
            <div className={`space-y-2 ${theme.muted}`}>
              <p>
                <strong className={theme.heading}>Email:</strong>{' '}
                <a href={`mailto:${CONFIG.company.email.founder}`} className={`${accent.text} hover:underline`}>
                  {CONFIG.company.email.founder}
                </a>
              </p>
              <p>
                <strong className={theme.heading}>Telegram:</strong>{' '}
                <a href={CONFIG.company.telegram} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>
                  Quick questions welcome
                </a>
              </p>
              <p className="text-sm mt-4">
                {CONFIG.company.name} · {CONFIG.company.address}
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className={`${theme.muted} mb-6`}>Ready to see what Dream API can do?</p>
          <div className="flex gap-4 justify-center">
            <a
              href="/docs"
              className={`px-6 py-3 rounded-lg ${accent.bg} text-white ${accent.bgHover} transition-colors font-medium`}
            >
              Read the Docs
            </a>
            <a
              href="/templates"
              className={`px-6 py-3 rounded-lg ${theme.buttonSecondary} transition-colors font-medium`}
            >
              Try a Template
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-8 px-4 border-t ${theme.footerBorder} ${theme.footerBg} mt-12`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${theme.mutedMore} text-sm`}>{CONFIG.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
