/**
 * Pro Tips / Trust Page
 *
 * Why trust us, routing tips, data policies
 */

import { getTheme, getAccent, CONFIG } from '../config';

export default function ProTips() {
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
            <a href="/docs" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Docs</a>
            <a href="/pro-tips" className={`${accent.text} font-medium`}>Pro Tips</a>
            <a href="/templates" className={`${theme.muted} hover:${theme.heading} transition-colors`}>Templates</a>
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
            <SidebarLink href="#built-on-titans" theme={theme}>Built on Titans</SidebarLink>
            <SidebarLink href="#why-trust-us" theme={theme}>Why Trust Us</SidebarLink>
            <SidebarLink href="#your-control" theme={theme}>You Stay in Control</SidebarLink>
            <SidebarLink href="#disconnect" theme={theme}>Disconnect Anytime</SidebarLink>
            <SidebarLink href="#routing-tips" theme={theme}>Routing Tips</SidebarLink>
            <SidebarLink href="#trial-days" theme={theme}>Trial Days</SidebarLink>
            <SidebarLink href="#data-policy" theme={theme}>Data Policy</SidebarLink>
            <SidebarLink href="#delete-data" theme={theme}>Delete Your Data</SidebarLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-12">
          {/* Title */}
          <h1 className={`text-4xl font-bold ${theme.heading} mb-4`}>Pro Tips</h1>
          <p className={`text-lg ${theme.body} mb-8`}>
            Everything you need to know about trust, control, and getting the most out of Dream API.
          </p>

          {/* Built on Titans */}
          <section id="built-on-titans" className="mb-16">
            <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Built on Titans</h2>
            <p className={`${theme.body} mb-6`}>
              Don't trust us — trust the infrastructure. We're built on three industry leaders:
            </p>

            {/* Three Titans */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className={`p-5 rounded-xl ${theme.cardBg} text-center`}>
                <div className="text-3xl mb-2">💳</div>
                <h3 className={`font-bold ${theme.heading} mb-1`}>Stripe</h3>
                <p className={`text-sm ${theme.muted}`}>Payments & Billing</p>
              </div>
              <div className={`p-5 rounded-xl ${theme.cardBg} text-center`}>
                <div className="text-3xl mb-2">🔐</div>
                <h3 className={`font-bold ${theme.heading} mb-1`}>Clerk</h3>
                <p className={`text-sm ${theme.muted}`}>Authentication</p>
              </div>
              <div className={`p-5 rounded-xl ${theme.cardBg} text-center`}>
                <div className="text-3xl mb-2">⚡</div>
                <h3 className={`font-bold ${theme.heading} mb-1`}>Cloudflare</h3>
                <p className={`text-sm ${theme.muted}`}>Edge Computing</p>
              </div>
            </div>

            {/* Security Features */}
            <div className={`p-6 rounded-xl border-2 ${accent.border}`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>Security by Default</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>Zero Cold Starts</strong> — Cloudflare Workers are always warm
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>No SSH Access</strong> — Serverless = smaller attack surface
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>HTTPS Everywhere</strong> — All requests encrypted by default
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>Built-in DDoS Protection</strong> — Cloudflare handles it at the edge
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>Bot Protection</strong> — Automated threat blocking
                  </TrustPoint>
                </div>
                <div className="space-y-3">
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>Webhook Signatures</strong> — Every Stripe event verified
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>Idempotency</strong> — Duplicate webhooks handled, no double charges
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>JWT Enforced</strong> — Plans verified by signature, unspoofable
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>PK/SK Separation</strong> — Public key safe for frontend, secret key for backend
                  </TrustPoint>
                  <TrustPoint theme={theme} accent={accent}>
                    <strong>Key Rotation</strong> — Rotate keys anytime without breaking your app
                  </TrustPoint>
                </div>
              </div>
            </div>
          </section>

          {/* Why Trust Us */}
          <section id="why-trust-us" className="mb-16">
            <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Why Trust Us</h2>

            <div className={`p-6 rounded-xl ${theme.cardBg} mb-6`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>You Keep Total Control</h3>
              <div className="space-y-4">
                <TrustPoint theme={theme} accent={accent}>
                  <strong>Your Stripe Account</strong> - You connect YOUR Stripe account via Stripe Connect.
                  All revenue goes directly to you. We never touch your money.
                </TrustPoint>
                <TrustPoint theme={theme} accent={accent}>
                  <strong>Limited Access</strong> - We can only create products/prices on your behalf.
                  That's it. We cannot access your balance, payouts, or customer payment methods.
                </TrustPoint>
                <TrustPoint theme={theme} accent={accent}>
                  <strong>Easy Dashboard Access</strong> - Go to your Stripe Dashboard → Connected Accounts →
                  find "Panacea" → click to see exactly what we can access.
                </TrustPoint>
              </div>
            </div>

            <div id="your-control" className={`p-6 rounded-xl ${theme.cardBg} mb-6`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>What We Can vs Can't Do</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className={`text-sm font-semibold ${accent.text} mb-3`}>✓ We CAN</p>
                  <ul className={`space-y-2 ${theme.body} text-sm`}>
                    <li>• Create products and prices</li>
                    <li>• Create checkout sessions</li>
                    <li>• Create billing portal sessions</li>
                    <li>• Read subscription status</li>
                  </ul>
                </div>
                <div>
                  <p className={`text-sm font-semibold text-red-400 mb-3`}>✗ We CANNOT</p>
                  <ul className={`space-y-2 ${theme.body} text-sm`}>
                    <li>• Access your Stripe balance</li>
                    <li>• Initiate payouts</li>
                    <li>• See customer payment methods</li>
                    <li>• Transfer funds anywhere</li>
                    <li>• Access your bank details</li>
                  </ul>
                </div>
              </div>
            </div>

            <div id="disconnect" className={`p-6 rounded-xl border-2 border-dashed ${theme.divider}`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-3`}>Disconnect Anytime</h3>
              <p className={`${theme.body} mb-4`}>
                Remove us from your Stripe account in seconds:
              </p>
              <ol className={`space-y-2 ${theme.body} text-sm`}>
                <li>1. Go to <a href="https://dashboard.stripe.com/settings/connect" target="_blank" rel="noopener noreferrer" className={`${accent.text} hover:underline`}>Stripe Dashboard → Settings → Connected Accounts</a></li>
                <li>2. Find "Panacea" in the list</li>
                <li>3. Click → Remove</li>
                <li>4. Done. We're disconnected immediately.</li>
              </ol>
              <p className={`mt-4 text-sm ${theme.muted}`}>
                Your existing products/prices remain. Your customers are unaffected.
              </p>
            </div>
          </section>

          {/* Routing Tips */}
          <section id="routing-tips" className={`mb-16 pt-8 border-t ${theme.divider}`}>
            <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Routing Tips</h2>

            <div className={`p-6 rounded-xl ${theme.cardBg} mb-6`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>After Sign Up: Choose Plan vs Dashboard</h3>
              <p className={`${theme.body} mb-4`}>
                Where should users go after signing up? Depends on your flow:
              </p>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme.pageBg}`}>
                  <p className={`font-medium ${theme.heading} mb-2`}>Multiple Tiers? → /choose-plan</p>
                  <p className={`text-sm ${theme.body}`}>
                    If you have Free, Pro, Enterprise - send them to choose-plan so they can pick.
                    Free users can start using, paid users go through checkout.
                  </p>
                  <code className={`block mt-2 text-xs ${theme.muted}`}>
                    redirect: '/choose-plan'
                  </code>
                </div>

                <div className={`p-4 rounded-lg ${theme.pageBg}`}>
                  <p className={`font-medium ${theme.heading} mb-2`}>Single Paid Tier? → /dashboard</p>
                  <p className={`text-sm ${theme.body}`}>
                    For membership sites with one tier, go straight to dashboard.
                    Dashboard auto-redirects free users to checkout.
                  </p>
                  <code className={`block mt-2 text-xs ${theme.muted}`}>
                    redirect: '/dashboard'
                  </code>
                </div>
              </div>
            </div>

            <div id="trial-days" className={`p-6 rounded-xl ${theme.cardBg}`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>Trial Days</h3>
              <p className={`${theme.body} mb-4`}>
                Set trial days in your tier configuration. The system handles everything:
              </p>
              <ul className={`space-y-2 ${theme.body} text-sm`}>
                <li>• <strong>Automatic trial period</strong> - Stripe manages the trial countdown</li>
                <li>• <strong>Dunning emails</strong> - Stripe handles failed payment retries</li>
                <li>• <strong>Grace periods</strong> - 7-day grace after cancellation</li>
                <li>• <strong>Plan enforcement</strong> - SDK automatically checks subscription status</li>
              </ul>
              <p className={`mt-4 text-sm ${theme.muted}`}>
                You don't need to build any of this. Just set trial_days in your tier config and it works.
              </p>
            </div>
          </section>

          {/* Data Policy */}
          <section id="data-policy" className={`mb-16 pt-8 border-t ${theme.divider}`}>
            <h2 className={`text-2xl font-bold ${theme.heading} mb-6`}>Data Policy</h2>

            <div className={`p-6 rounded-xl ${theme.cardBg} mb-6`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>What We Store</h3>
              <ul className={`space-y-2 ${theme.body} text-sm`}>
                <li>• <strong>End-user emails</strong> - For authentication (via Clerk)</li>
                <li>• <strong>Usage counts</strong> - For billing enforcement</li>
                <li>• <strong>Subscription status</strong> - Cached from Stripe webhooks</li>
                <li>• <strong>Project configuration</strong> - Tiers, products, settings</li>
              </ul>
              <p className={`mt-4 text-sm ${theme.muted}`}>
                We do NOT store payment methods, bank details, or sensitive financial data.
                That stays with Stripe.
              </p>
            </div>

            <div className={`p-6 rounded-xl ${theme.cardBg} mb-6`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-4`}>Retention Policy</h3>
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${theme.body}`}>
                  <thead>
                    <tr className={`border-b ${theme.divider}`}>
                      <th className={`text-left py-2 ${theme.heading}`}>Status</th>
                      <th className={`text-left py-2 ${theme.heading}`}>Data Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`border-b ${theme.divider}`}>
                      <td className="py-2">Active subscription</td>
                      <td className="py-2">Retained</td>
                    </tr>
                    <tr className={`border-b ${theme.divider}`}>
                      <td className="py-2">Canceled (0-30 days)</td>
                      <td className="py-2">Retained (can reactivate)</td>
                    </tr>
                    <tr>
                      <td className="py-2">Canceled (30+ days)</td>
                      <td className="py-2">Automatically deleted</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div id="delete-data" className={`p-6 rounded-xl border-2 ${accent.border}`}>
              <h3 className={`text-lg font-semibold ${theme.heading} mb-3`}>Delete Your Data Instantly</h3>
              <div className="space-y-4">
                <ProTip theme={theme} title="Delete a Project">
                  Go to project settings → Delete Project.
                  <strong> All end-users for that project are immediately deleted.</strong> No waiting period.
                </ProTip>
                <ProTip theme={theme} title="Delete Your Account">
                  Developer Portal → Account Settings → Delete Account.
                  All projects, all end-users, all data - gone immediately.
                </ProTip>
                <ProTip theme={theme} title="Cancel Subscription">
                  Manage Billing → Cancel. You keep access until period ends.
                  After 30 days of cancellation, data auto-deletes.
                </ProTip>
              </div>
              <p className={`mt-4 text-sm ${theme.muted}`}>
                We don't make it hard to leave. Your data, your choice.
              </p>
            </div>
          </section>

          {/* Footer CTA */}
          <section className={`p-8 rounded-xl ${theme.cardBg} text-center`}>
            <h2 className={`text-xl font-semibold ${theme.heading} mb-3`}>Ready to Build?</h2>
            <p className={`${theme.body} mb-6`}>
              Get started in under 5 minutes. Full control, transparent pricing, no lock-in.
            </p>
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
                View Templates
              </a>
            </div>
          </section>
        </main>
      </div>
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

function TrustPoint({ theme, accent, children }: { theme: any; accent: any; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className={`flex-shrink-0 w-5 h-5 rounded-full ${accent.bg} flex items-center justify-center mt-0.5`}>
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <p className={`${theme.body} text-sm`}>{children}</p>
    </div>
  );
}

function ProTip({ theme, title, children }: { theme: any; title: string; children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-lg ${theme.pageBg}`}>
      <p className={`font-medium ${theme.heading} mb-1`}>{title}</p>
      <p className={`text-sm ${theme.body}`}>{children}</p>
    </div>
  );
}
