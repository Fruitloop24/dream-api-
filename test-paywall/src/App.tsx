import { useEffect, useState } from 'react'
import { DreamAPI } from '@dream-api/sdk'
import './index.css'

// Initialize SDK with publishable key only (frontend-safe mode)
// Secret key should NEVER be in frontend code - it stays on your backend
const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
})

interface Tier {
  name: string
  displayName: string
  price: number
  limit: number
  priceId: string
  productId: string
  features?: string[] | string
  popular?: boolean
  billingMode?: string
  description?: string
  imageUrl?: string
}

// Simulated premium content
const PREMIUM_CONTENT = [
  {
    id: 1,
    title: 'Advanced TypeScript Patterns',
    description: 'Master generics, conditional types, and mapped types',
    duration: '2h 30m',
    tier: 'pro',
    preview: 'Learn how to leverage TypeScript\'s type system to write safer, more maintainable code...',
  },
  {
    id: 2,
    title: 'Building Production APIs',
    description: 'Authentication, rate limiting, and error handling at scale',
    duration: '4h 15m',
    tier: 'pro',
    preview: 'Discover the patterns used by top companies to build reliable API infrastructure...',
  },
  {
    id: 3,
    title: 'System Design Masterclass',
    description: 'Design scalable distributed systems from scratch',
    duration: '6h 45m',
    tier: 'enterprise',
    preview: 'From load balancers to message queues, learn how to architect systems that scale...',
  },
  {
    id: 4,
    title: 'AI Integration Guide',
    description: 'Integrate LLMs and AI into your applications',
    duration: '3h 20m',
    tier: 'enterprise',
    preview: 'Build intelligent applications with OpenAI, Claude, and other AI providers...',
  },
]

const FREE_CONTENT = [
  {
    id: 0,
    title: 'Getting Started with React',
    description: 'Introduction to React fundamentals',
    duration: '45m',
    tier: 'free',
  },
]

// Simulated user state (in real app, this comes from Clerk JWT)
type UserPlan = 'free' | 'pro' | 'enterprise' | null

function App() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<UserPlan>('free')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [showPricing, setShowPricing] = useState(false)

  useEffect(() => {
    loadTiers()
    checkUrlParams()
  }, [])

  async function loadTiers() {
    try {
      setLoading(true)
      const response = await api.products.listTiers()
      setTiers(response.tiers || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing')
    } finally {
      setLoading(false)
    }
  }

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      // In real app, check JWT for new plan
      alert('Subscription successful! Your content is now unlocked.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('canceled') === 'true') {
      alert('Subscription was canceled.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  function canAccess(contentTier: string): boolean {
    if (contentTier === 'free') return true
    if (userPlan === 'enterprise') return true
    if (userPlan === 'pro' && contentTier === 'pro') return true
    return false
  }

  function getTierRank(tier: string): number {
    const ranks: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }
    return ranks[tier] || 0
  }

  async function handleSubscribe(tier: Tier) {
    setCheckingOut(tier.name)
    try {
      // Note: In real app, user must be authenticated first
      // api.setUserToken(clerkJWT) would be called after sign-in

      // For demo, we'll use the billing checkout
      // This requires user auth in production
      const result = await api.billing.createCheckout({
        tier: tier.name,
        priceId: tier.priceId,
        successUrl: window.location.href + '?success=true',
        cancelUrl: window.location.href + '?canceled=true',
      })

      if (result.url) {
        window.location.href = result.url
      }
    } catch (err: any) {
      // Expected: requires user auth in production
      alert('Subscription checkout: ' + (err.message || 'Requires user authentication'))
    } finally {
      setCheckingOut(null)
    }
  }

  const sortedTiers = [...tiers].sort((a, b) => a.price - b.price)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎓</span>
            CodeMaster Pro
          </h1>
          <div className="flex items-center gap-4">
            <select
              value={userPlan || 'free'}
              onChange={(e) => setUserPlan(e.target.value as UserPlan)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
            >
              <option value="free">Free User</option>
              <option value="pro">Pro Subscriber</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              onClick={() => setShowPricing(!showPricing)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
            >
              {showPricing ? 'View Content' : 'Upgrade'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            {showPricing ? 'Choose Your Plan' : 'Premium Courses'}
          </h2>
          <p className="text-xl text-blue-200">
            {showPricing
              ? 'Unlock all content with a subscription'
              : `Currently viewing as: ${userPlan === 'free' ? 'Free User' : userPlan === 'pro' ? 'Pro Subscriber' : 'Enterprise'}`
            }
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-xl text-center mb-8">
            {error}
          </div>
        )}

        {/* Pricing Section */}
        {!loading && showPricing && (
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {sortedTiers.length === 0 ? (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-400">No subscription tiers configured yet.</p>
                <p className="text-gray-500 text-sm mt-2">Add tiers with billingMode='subscription' in your dashboard.</p>
              </div>
            ) : (
              sortedTiers.map((tier, index) => (
                <div
                  key={tier.priceId}
                  className={`relative bg-white/5 backdrop-blur-sm border rounded-2xl p-8 transition-all hover:scale-105 ${
                    tier.popular || index === 1
                      ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                      : 'border-white/10'
                  }`}
                >
                  {(tier.popular || index === 1) && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {tier.displayName || tier.name}
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">${tier.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-gray-400 mb-6">
                    {tier.limit === -1 ? 'Unlimited' : tier.limit.toLocaleString()} API calls/month
                  </p>
                  {tier.features && (
                    <ul className="space-y-3 mb-8">
                      {(Array.isArray(tier.features) ? tier.features : tier.features.split(',')).filter(f => f).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-300">
                          <span className="text-green-400">✓</span>
                          {typeof feature === 'string' ? feature.trim() : feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  {tier.description && (
                    <p className="text-gray-400 mb-6">{tier.description}</p>
                  )}
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={checkingOut === tier.name || userPlan === tier.name.toLowerCase()}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      userPlan === tier.name.toLowerCase()
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50 cursor-default'
                        : tier.popular || index === 1
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                    } disabled:opacity-50`}
                  >
                    {checkingOut === tier.name ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </span>
                    ) : userPlan === tier.name.toLowerCase() ? (
                      'Current Plan'
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Content Section */}
        {!loading && !showPricing && (
          <>
            {/* Free Content */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-green-400">🆓</span> Free Content
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {FREE_CONTENT.map((content) => (
                  <div
                    key={content.id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-xl font-semibold text-white">{content.title}</h4>
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
                        FREE
                      </span>
                    </div>
                    <p className="text-gray-400 mb-4">{content.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>⏱️ {content.duration}</span>
                      <button className="ml-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all">
                        Watch Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Content */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-yellow-400">⭐</span> Premium Content
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {PREMIUM_CONTENT.map((content) => {
                  const hasAccess = canAccess(content.tier)
                  const tierLabel = content.tier === 'pro' ? 'PRO' : 'ENTERPRISE'
                  const tierColor = content.tier === 'pro' ? 'blue' : 'purple'

                  return (
                    <div
                      key={content.id}
                      className={`relative bg-white/5 backdrop-blur-sm border rounded-xl p-6 transition-all ${
                        hasAccess
                          ? 'border-white/10 hover:border-blue-500/50 cursor-pointer'
                          : 'border-white/5'
                      }`}
                    >
                      {/* Lock Overlay */}
                      {!hasAccess && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
                          <span className="text-4xl mb-2">🔒</span>
                          <p className="text-white font-medium mb-1">
                            {tierLabel} Content
                          </p>
                          <p className="text-gray-400 text-sm mb-4">
                            Upgrade to unlock
                          </p>
                          <button
                            onClick={() => setShowPricing(true)}
                            className={`bg-${tierColor}-500 hover:bg-${tierColor}-600 text-white px-4 py-2 rounded-lg text-sm transition-all`}
                          >
                            View Plans
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xl font-semibold text-white">{content.title}</h4>
                        <span className={`bg-${tierColor}-500/20 text-${tierColor}-400 px-2 py-1 rounded text-xs font-medium`}>
                          {tierLabel}
                        </span>
                      </div>
                      <p className="text-gray-400 mb-4">{content.description}</p>
                      {content.preview && (
                        <p className="text-gray-500 text-sm italic mb-4 line-clamp-2">
                          "{content.preview}"
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>⏱️ {content.duration}</span>
                        {hasAccess && (
                          <button className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all">
                            Watch Now
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upgrade CTA */}
            {userPlan === 'free' && (
              <div className="mt-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-8 text-center">
                <h3 className="text-3xl font-bold text-white mb-4">
                  Ready to unlock everything?
                </h3>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Get instant access to all premium courses, exclusive content, and priority support with a Pro or Enterprise subscription.
                </p>
                <button
                  onClick={() => setShowPricing(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all"
                >
                  View Pricing
                </button>
              </div>
            )}
          </>
        )}

        {/* API Info */}
        <div className="mt-16 bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">SDK Methods Used</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-black/30 rounded-lg p-4">
              <code className="text-blue-400">api.products.listTiers()</code>
              <p className="text-gray-400 mt-1">Fetches subscription tiers for pricing page</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <code className="text-blue-400">api.billing.createCheckout(&#123; tier &#125;)</code>
              <p className="text-gray-400 mt-1">Creates Stripe subscription checkout</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <code className="text-green-400">api.usage.check()</code>
              <p className="text-gray-400 mt-1">Check user's current usage (requires auth)</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <code className="text-green-400">api.billing.openPortal()</code>
              <p className="text-gray-400 mt-1">Open Stripe customer portal (requires auth)</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/30 border-t border-white/10 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Digital Paywall Demo - <span className="text-blue-400 font-mono">@dream-api/sdk</span>
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Subscription billing with gated content
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
