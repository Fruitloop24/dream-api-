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
            {/* Photo Placeholder */}
            <div className={`w-48 h-48 rounded-xl ${theme.cardBg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
              {/* TODO: Replace with actual photo */}
              <div className="text-center">
                <span className={`text-6xl`}>👨‍💻</span>
                <p className={`text-xs ${theme.mutedMore} mt-2`}>Photo coming soon</p>
              </div>
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${theme.heading} mb-2`}>Hey, I'm KC</h1>
              <p className={`${accent.text} mb-4`}>Founder, Panacea Tech</p>
              <p className={`${theme.body} text-lg`}>
                I built Dream API to make it easy to deploy auth, billing, and usage tracking.
                One SDK, one dashboard, and you're live. No infrastructure headaches.
              </p>
            </div>
          </div>
        </div>

        {/* About Me */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>About Me</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I spent <strong className={theme.heading}>15 years in education and education administration</strong>,
              earning a <strong className={theme.heading}>Master's degree in Education</strong> along the way.
              I loved the work, but I always had a passion for technology and building things.
            </p>
            <p>
              To chase that dream, I completed <strong className={theme.heading}>five CompTIA certifications</strong> and
              founded <strong className={theme.heading}>Panacea Tech, LLC</strong>. Dream API is our first
              software product - built to solve a problem I kept running into myself.
            </p>
          </div>
        </section>

        {/* Why I Built Dream API */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Why I Built Dream API</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              When I started building my own software ideas, I hit the same wall every indie dev knows:
            </p>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-6 my-6`}>
              <p className={`${theme.muted} italic`}>
                "Before I could test if anyone wanted my product, I needed auth, billing,
                usage tracking, a database, webhooks... $50-75/month in infrastructure costs
                just to prototype. That's backwards."
              </p>
            </div>
            <p>
              So I built <a href={CONFIG.links.plugSaas} target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>plug-saas</a> -
              an open source template to solve it for myself. KV storage, simple auth + billing, one Cloudflare account.
            </p>
            <p>
              Then I thought: what if I made this even easier? What if you didn't need to deploy anything?
              Just an API key and an SDK. That's how <strong className={theme.heading}>Dream API</strong> was born.
            </p>
          </div>
        </section>

        {/* What Dream API Gives You */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>What Dream API Gives You</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              Everything you need to ship, all in one place:
            </p>
            <div className="grid md:grid-cols-2 gap-4 my-6">
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>Unlimited Projects</p>
                <p className={`text-sm ${theme.muted}`}>
                  Create as many projects as you need. SaaS apps, stores, membership sites - no limits.
                </p>
              </div>
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>Test → Live Promotion</p>
                <p className={`text-sm ${theme.muted}`}>
                  Build in test mode with test Stripe keys. One click to go live when you're ready.
                </p>
              </div>
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>One Dashboard</p>
                <p className={`text-sm ${theme.muted}`}>
                  All your metrics in one place. Users, revenue, usage, subscriptions - see everything.
                </p>
              </div>
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>Your Stripe, Your Money</p>
                <p className={`text-sm ${theme.muted}`}>
                  Payments go directly to your Stripe account. We never touch your revenue.
                </p>
              </div>
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>Free Templates</p>
                <p className={`text-sm ${theme.muted}`}>
                  SaaS, Store, and Membership templates. Clone, customize, deploy.
                </p>
              </div>
              <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4`}>
                <p className={`font-semibold ${theme.heading} mb-2`}>No Code Changes to Scale</p>
                <p className={`text-sm ${theme.muted}`}>
                  Add tiers, change prices, update limits - all from the dashboard. No redeploy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Mission */}
        <section className={`${theme.cardBgAlt} border-2 ${accent.border} rounded-xl p-8 mb-12`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>The Mission</h2>
          <div className={`${theme.body} space-y-4`}>
            <p className="text-lg">
              <strong className={accent.text}>Make great ideas easy to ship.</strong>
            </p>
            <p>
              You focus on building something people want. We handle the boring infrastructure -
              auth, billing, usage tracking, webhooks, subscription management. The stuff that takes
              weeks to build right and seconds to get wrong.
            </p>
            <p>
              Dream API is my bet that there's a better way to help indie devs and small teams ship faster.
              Lower the barrier. Remove the infrastructure tax. Let people test their ideas without
              spending months on plumbing.
            </p>
          </div>
        </section>

        {/* Built for AI Development */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Built for AI-Native Development</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              We build with AI tools (Claude Code, Cursor, Windsurf) and we built Dream API to work the same way:
            </p>
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-6 my-6`}>
              <div className="space-y-4">
                <div>
                  <p className={`font-semibold ${theme.heading}`}>CLAUDE.md in Every Repo</p>
                  <p className={`text-sm ${theme.muted}`}>
                    Complete context for AI assistants. Architecture, patterns, conventions - everything
                    an AI needs to help you ship faster.
                  </p>
                </div>
                <div>
                  <p className={`font-semibold ${theme.heading}`}>/setup Command</p>
                  <p className={`text-sm ${theme.muted}`}>
                    Tell the AI to run /setup and describe your app. It reads the CLAUDE.md, understands
                    the config system, and customizes everything for you.
                  </p>
                </div>
                <div>
                  <p className={`font-semibold ${theme.heading}`}>AI-Friendly Architecture</p>
                  <p className={`text-sm ${theme.muted}`}>
                    Single config files, clear patterns, well-documented code. Built so AI can help you
                    customize without breaking things.
                  </p>
                </div>
              </div>
            </div>
            <p>
              This is how software gets built now. We're not fighting it - we're embracing it.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-8`}>
          <h2 className={`text-2xl font-bold ${theme.heading} mb-4`}>Let's Talk</h2>
          <div className={`${theme.body} space-y-4`}>
            <p>
              I read every email. I respond to every message. If you have questions, feedback,
              or just want to chat about what you're building - reach out.
            </p>
            <p className={`${accent.text} font-medium`}>
              I genuinely want your feedback - good, bad, or brutal. Tell me what's broken.
              Tell me what's missing. Tell me if this is useful.
            </p>
            <div className={`space-y-2 ${theme.muted} mt-6`}>
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
