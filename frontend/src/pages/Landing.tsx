import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">FACT-SaaS</div>
          <div className="flex items-center gap-8">
            <a href="https://clerk-frontend.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900 no-underline">Live Demo</a>
            <a href="https://github.com/Fruitloop24/plug-saas" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900 no-underline">Docs</a>
            <button onClick={() => navigate('/builder')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 border-none cursor-pointer">
              Try Free →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full mb-6">
            Deploy in 48 seconds • $0 hosting until 10k users
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Skip the boilerplate.<br/>Ship your SaaS today.
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Complete SaaS template with auth, payments, and usage tracking.<br/>
            No database required. Deploy to 300+ cities in under a minute.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button onClick={() => navigate('/builder')} className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 shadow-lg border-none cursor-pointer">
              Deploy Free Preview →
            </button>
            <a href="https://clerk-frontend.pages.dev/" target="_blank" rel="noopener noreferrer" className="px-8 py-4 border-2 border-gray-300 text-gray-800 text-lg font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 no-underline inline-flex items-center justify-center">
              See Live Example
            </a>
          </div>

          <p className="text-sm text-gray-500">
            No credit card • Preview deployed to <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">your-app.pages.dev</span> instantly
          </p>
        </div>

        {/* Screenshot/Demo */}
        <div className="rounded-xl shadow-2xl overflow-hidden border border-gray-200 max-w-5xl mx-auto">
          <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500 font-mono">
              https://your-saas.pages.dev
            </div>
          </div>
          <div className="bg-white p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard</h2>
              <p className="text-sm text-gray-600">Fully functional with auth, billing, and usage metering</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200 text-center">
                <div className="text-3xl font-bold text-blue-900">247</div>
                <div className="text-xs text-blue-700 mt-1">Active Users</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border border-green-200 text-center">
                <div className="text-3xl font-bold text-green-900">$3,429</div>
                <div className="text-xs text-green-700 mt-1">MRR</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg border border-purple-200 text-center">
                <div className="text-3xl font-bold text-purple-900">89%</div>
                <div className="text-xs text-purple-700 mt-1">Conversion</div>
              </div>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <div className="flex justify-between mb-3 text-sm">
                <span className="font-medium text-gray-700">API Usage This Month</span>
                <span className="text-gray-600">750 / 1,000 requests</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <div className="flex justify-between mt-3 text-xs">
                <span className="text-gray-500">Current Plan: Pro ($29/mo)</span>
                <button className="text-blue-600 font-semibold hover:text-blue-700">Manage Billing →</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why FACT-SaaS */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why developers choose FACT-SaaS</h2>
            <p className="text-xl text-gray-600">Stop building infrastructure. Start shipping product.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No Database Required</h3>
              <p className="text-gray-600 leading-relaxed">
                Auth via Clerk, payments via Stripe, usage in KV. Zero schema migrations. Zero ops overhead.
                Add a DB only when your product needs it.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">$0 Until You Scale</h3>
              <p className="text-gray-600 leading-relaxed">
                Free hosting on Cloudflare for up to 10,000 users. Traditional stacks cost $75-150/month before your first customer.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">48-Second Deploys</h3>
              <p className="text-gray-600 leading-relaxed">
                From config to live URL in under a minute. Auth works. Payments work. Usage tracking works.
                No webpack hell. No Docker nightmares.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need, already built</h2>
            <p className="text-xl text-gray-600">Production-ready SaaS infrastructure out of the box</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-600 transition-colors">
              <h3 className="text-lg font-bold text-gray-900 mb-3">🔐 Authentication & Identity</h3>
              <p className="text-gray-600 mb-4">Clerk-powered auth with email, OAuth, JWT sessions, and user management. Signup flow tested and working.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Email + password signup</li>
                <li>• Google OAuth integration</li>
                <li>• JWT token validation at edge</li>
                <li>• User profile management UI</li>
              </ul>
            </div>

            <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-600 transition-colors">
              <h3 className="text-lg font-bold text-gray-900 mb-3">💳 Payments & Subscriptions</h3>
              <p className="text-gray-600 mb-4">Stripe checkout, subscription management, customer portal, and webhook handling. Revenue-ready.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Multi-tier pricing (Free/Pro/Enterprise)</li>
                <li>• Stripe Checkout integration</li>
                <li>• Customer billing portal</li>
                <li>• Webhook-based plan updates</li>
              </ul>
            </div>

            <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-600 transition-colors">
              <h3 className="text-lg font-bold text-gray-900 mb-3">📊 Usage Tracking & Limits</h3>
              <p className="text-gray-600 mb-4">Per-user metering with automatic tier enforcement. Monthly resets. No database queries.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Real-time usage counters</li>
                <li>• Plan-based limits (100/month → unlimited)</li>
                <li>• Automatic monthly resets</li>
                <li>• Rate limiting (100 req/min)</li>
              </ul>
            </div>

            <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-600 transition-colors">
              <h3 className="text-lg font-bold text-gray-900 mb-3">🌍 Global Edge Deployment</h3>
              <p className="text-gray-600 mb-4">Cloudflare Workers + Pages. 300+ cities worldwide. Zero cold starts. Infinite scalability.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Sub-50ms response times globally</li>
                <li>• GitHub Actions CI/CD included</li>
                <li>• Stateless KV-based architecture</li>
                <li>• Zero server maintenance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Used by developers who ship</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-blue-700 bg-opacity-50 p-6 rounded-lg">
              <p className="italic mb-4">"Saved me 2 weeks of auth and billing setup. Just deployed my SaaS idea in a weekend."</p>
              <p className="font-semibold">— Indie Hacker</p>
            </div>
            <div className="bg-blue-700 bg-opacity-50 p-6 rounded-lg">
              <p className="italic mb-4">"The no-database architecture is genius. Finally a template that doesn't force Postgres on day 1."</p>
              <p className="font-semibold">— Full-Stack Dev</p>
            </div>
            <div className="bg-blue-700 bg-opacity-50 p-6 rounded-lg">
              <p className="italic mb-4">"$0 hosting until 10k users is a game-changer for bootstrapped startups."</p>
              <p className="font-semibold">— Startup Founder</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Try free, upgrade when ready</h2>
            <p className="text-xl text-gray-600">Preview deployment is 100% free. Go production when you're ready to scale.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Preview */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
              <p className="text-sm text-gray-600 mb-6">Test everything free</p>
              <ul className="space-y-3 mb-8 text-sm text-gray-700">
                <li>✓ 48-second deployment</li>
                <li>✓ All features working</li>
                <li>✓ 7-day preview site</li>
                <li>✓ Stripe test mode</li>
              </ul>
              <button onClick={() => navigate('/builder')} className="w-full px-4 py-3 border-2 border-gray-300 text-gray-800 font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 cursor-pointer bg-white">
                Deploy Preview
              </button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-8 relative shadow-xl transform scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full">
                RECOMMENDED
              </div>
              <h3 className="text-lg font-semibold mb-2">Production</h3>
              <div className="text-sm mb-1">$99 setup +</div>
              <div className="text-4xl font-bold mb-1">$15<span className="text-xl">/mo</span></div>
              <p className="text-sm text-blue-100 mb-6">Unlimited users & sites</p>
              <ul className="space-y-3 mb-8 text-sm">
                <li>✓ Your own Stripe account</li>
                <li>✓ Custom domain setup</li>
                <li>✓ Production deployment</li>
                <li>✓ Priority support</li>
              </ul>
              <button onClick={() => navigate('/builder')} className="w-full px-4 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-50 cursor-pointer border-none">
                Go Production
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">Custom</div>
              <p className="text-sm text-gray-600 mb-6">Volume pricing</p>
              <ul className="space-y-3 mb-8 text-sm text-gray-700">
                <li>✓ White-label solution</li>
                <li>✓ Custom integrations</li>
                <li>✓ Dedicated support</li>
                <li>✓ SLA guarantees</li>
              </ul>
              <button onClick={() => window.location.href = 'mailto:contact@fact-saas.com'} className="w-full px-4 py-3 border-2 border-gray-300 text-gray-800 font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 cursor-pointer bg-white">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to ship your SaaS?</h2>
          <p className="text-xl text-gray-300 mb-8">Deploy a fully functional preview in the next 60 seconds. No credit card required.</p>
          <button onClick={() => navigate('/builder')} className="px-10 py-5 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 shadow-xl cursor-pointer border-none">
            Deploy Free Preview Now →
          </button>
          <p className="text-sm text-gray-400 mt-6">
            Or <a href="https://clerk-frontend.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">see the live demo</a> •
            <a href="https://github.com/Fruitloop24/plug-saas" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300"> view source code</a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          <p className="mb-2">Built with Cloudflare Workers • Clerk Auth • Stripe Billing</p>
          <p>Open source • Production ready • <a href="https://github.com/Fruitloop24/plug-saas" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">View on GitHub</a></p>
        </div>
      </footer>
    </div>
  );
}
