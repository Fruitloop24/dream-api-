import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DreamAPI } from '@dream-api/sdk'
import Layout from './components/Layout'
import About from './pages/About'
import Contact from './pages/Contact'
import Team from './pages/Team'
import Community from './pages/Community'
import { CONFIG, getAccentClasses, getThemeClasses } from './config'
import './index.css'

// Initialize SDK with publishable key only (frontend-safe mode)
const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
})

interface Product {
  name: string
  displayName?: string
  description?: string
  price: number
  priceId: string
  productId: string
  imageUrl?: string
  inventory?: number | null
  soldOut?: boolean
  features?: string[]
}

interface CartItem extends Product {
  quantity: number
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const { tagline, description, heroImage } = CONFIG
  const theme = getThemeClasses()
  const accent = getAccentClasses()

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const response = await api.products.list()
      setProducts(response.products || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.priceId === product.priceId)
      if (existing) {
        return prev.map(item =>
          item.priceId === product.priceId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setCartOpen(true)
  }

  function removeFromCart(priceId: string) {
    setCart(prev => prev.filter(item => item.priceId !== priceId))
  }

  function updateQuantity(priceId: string, delta: number) {
    setCart(prev =>
      prev
        .map(item =>
          item.priceId === priceId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) / 100
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  async function handleCheckout() {
    if (cart.length === 0) return

    setCheckingOut(true)
    try {
      const items = cart.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity,
      }))

      const result = await api.products.cartCheckout({
        items,
        successUrl: window.location.origin + '?success=true',
        cancelUrl: window.location.origin + '?canceled=true',
      })

      if (result.url) {
        window.location.href = result.url
      }
    } catch (err: any) {
      const msg = err?.response?.error || err?.message || 'Something went wrong'
      alert('Checkout failed: ' + msg)
      console.error('Checkout error:', err)
    } finally {
      setCheckingOut(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setCart([])
      alert('Payment successful! Thank you for your order.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('canceled') === 'true') {
      alert('Payment was canceled.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ============================================================================
  // HOME PAGE
  // ============================================================================
  function HomePage() {
    return (
      <>
        {/* Hero Banner with Image */}
        {heroImage && (
          <div className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
            <img
              src={heroImage}
              alt="Artisan candles"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 text-center px-4 max-w-2xl">
              <h1 className="font-serif text-4xl md:text-5xl font-medium text-white mb-4 tracking-tight">
                {tagline}
              </h1>
              <p className="text-stone-200 text-sm md:text-base mb-6 max-w-lg mx-auto">
                {description}
              </p>
              <a href="#products" className={`inline-block px-6 py-2.5 rounded-lg ${accent.bg} ${accent.buttonText} ${accent.bgHover} font-medium text-sm transition-colors`}>
                Shop Collection
              </a>
            </div>
          </div>
        )}

        <div id="products" className="max-w-6xl mx-auto px-4 py-12">
          {/* Demo Banner - Compact */}
          {CONFIG.demoMode && (
            <div className="mb-8 p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <p className="text-amber-800 text-sm">
                <span className="font-medium">🧪 Live Demo</span> — Try checkout with card <code className="bg-amber-100 px-2 py-0.5 rounded text-xs font-mono">4242 4242 4242 4242</code>
                <span className="mx-2 text-amber-300">|</span>
                <a href="https://dream-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">Powered by Dream API</a>
              </p>
            </div>
          )}

          {/* Social Proof */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className={`${theme.cardBg} rounded-xl p-6`}>
              <div className="flex gap-1 mb-3 text-amber-400">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className={`${theme.body} text-sm mb-4 italic`}>
                "The scent throw is incredible. My whole apartment smells amazing within minutes."
              </p>
              <p className={`${theme.heading} text-sm font-medium`}>— Sarah M.</p>
            </div>
            <div className={`${theme.cardBg} rounded-xl p-6`}>
              <div className="flex gap-1 mb-3 text-amber-400">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className={`${theme.body} text-sm mb-4 italic`}>
                "Finally, candles that actually smell like their description. Will be ordering more."
              </p>
              <p className={`${theme.heading} text-sm font-medium`}>— James K.</p>
            </div>
            <div className={`${theme.cardBg} rounded-xl p-6`}>
              <div className="flex gap-1 mb-3 text-amber-400">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className={`${theme.body} text-sm mb-4 italic`}>
                "Beautiful packaging, long burn time, and the perfect gift. 10/10 recommend."
              </p>
              <p className={`${theme.heading} text-sm font-medium`}>— Michelle T.</p>
            </div>
          </div>

          {/* Section Title */}
          <div className="text-center mb-10">
            <h2 className={`font-serif text-2xl font-medium ${theme.heading}`}>Our Collection</h2>
          </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className={`w-8 h-8 border-2 ${theme.divider} border-t-current rounded-full animate-spin ${theme.body}`}></div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-900 text-red-400 px-6 py-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.priceId}
                className={`product-card group ${theme.cardBg} card-hover rounded-lg overflow-hidden cursor-pointer`}
                onClick={() => setSelectedProduct(product)}
              >
                {/* Product Image - Smaller */}
                <div className={`aspect-square ${theme.imagePlaceholder} relative overflow-hidden`}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="product-image w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${theme.imagePlaceholder}`}>
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  {product.soldOut && (
                    <div className={`absolute inset-0 ${theme.soldOutOverlay} flex items-center justify-center`}>
                      <span className={`${theme.soldOutText} text-xs font-medium tracking-wide uppercase`}>
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info - Compact */}
                <div className="p-3">
                  <h3 className={`font-serif text-sm font-medium ${theme.heading} mb-1 line-clamp-1`}>
                    {product.displayName || product.name}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${theme.price}`}>
                      ${(product.price / 100).toFixed(2)}
                    </span>
                    {product.inventory !== null && product.inventory !== undefined && product.inventory <= 5 && product.inventory > 0 && (
                      <span className="text-xs text-amber-600">
                        Only {product.inventory} left
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <p className={theme.muted}>No products available yet.</p>
          </div>
        )}

        {/* Install App Card */}
        <div className={`mt-12 ${theme.cardBg} rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8`}>
          <div className="flex-shrink-0">
            <img
              src="/qr-install.png"
              alt="Scan to install app"
              className="w-32 h-32 rounded-lg"
            />
          </div>
          <div className="text-center md:text-left">
            <h3 className={`font-serif text-xl font-medium ${theme.heading} mb-2`}>
              Shop From Your Phone
            </h3>
            <p className={`${theme.body} text-sm mb-3`}>
              Scan the QR code to install our app. No app store needed - opens right from your home screen.
            </p>
            <p className={`${theme.muted} text-xs`}>
              Works on iPhone, Android, and tablets
            </p>
          </div>
        </div>

        {/* Social Proof + CTA Section */}
        {CONFIG.demoMode && (
          <div className={`mt-20 pt-12 border-t ${theme.divider}`}>
            {/* Socials */}
            <div className="text-center mb-12">
              <p className={`text-xs uppercase tracking-wider ${theme.muted} mb-6`}>Follow the flame</p>
              <div className="flex justify-center gap-6">
                <a href="#" className={`${theme.body} hover:${theme.heading} transition-colors`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className={`${theme.body} hover:${theme.heading} transition-colors`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className={`${theme.body} hover:${theme.heading} transition-colors`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                </a>
                <a href="#" className={`${theme.body} hover:${theme.heading} transition-colors`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>
                </a>
              </div>
            </div>

            {/* Dream API CTA */}
            <div className={`${theme.cardBg} rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Live Demo
              </div>
              <h3 className={`font-serif text-2xl md:text-3xl font-medium ${theme.heading} mb-4`}>
                Build This in Minutes
              </h3>
              <p className={`${theme.body} mb-8 max-w-md mx-auto`}>
                One API key. One config file. Then customize everything with your favorite AI coding tool.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://dream-frontend-dyn.pages.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-6 py-3 rounded-lg ${accent.bg} ${accent.buttonText} ${accent.bgHover} font-medium transition-colors`}
                >
                  Get Your API Key →
                </a>
                <a
                  href="https://github.com/Fruitloop24/dream-store-basic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-6 py-3 rounded-lg ${theme.buttonSecondary} font-medium transition-colors`}
                >
                  View Template
                </a>
              </div>
              <p className={`${theme.muted} text-xs mt-6`}>
                Works with Claude Code, Cursor, Windsurf & more
              </p>
            </div>
          </div>
        )}
        </div>
      </>
    )
  }

  return (
    <BrowserRouter>
      {/* QR Code Card - Fixed position above demo card (hidden on mobile) */}
      {CONFIG.demoMode && (
        <div className="hidden md:block fixed bottom-44 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl max-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-amber-400 text-xs font-semibold">PWA Ready</span>
          </div>
          <img src="/qr-install.png" alt="Scan to visit" className="w-full rounded mb-3" />
          <div className="space-y-1 text-xs">
            <p className="text-white font-medium">Install on Phone</p>
            <p className="text-zinc-400">1. Scan → 2. Tap Share</p>
            <p className="text-zinc-400">3. "Add to Home Screen"</p>
          </div>
        </div>
      )}

      {/* Demo Card - Fixed position (hidden on mobile) */}
      {CONFIG.demoMode && (
        <div className="hidden md:block fixed bottom-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">Live Demo</span>
          </div>
          <p className="text-zinc-400 text-xs mb-2">Test credit card for checkout:</p>
          <code className="block bg-zinc-800 text-amber-400 px-3 py-2 rounded text-sm font-mono">
            4242 4242 4242 4242
          </code>
          <p className="text-zinc-500 text-xs mt-2">Any future date, any CVC</p>
        </div>
      )}

      {/* Product Detail Modal - Clean & Elegant */}
      {selectedProduct && (
        <>
          <div
            className={`fixed inset-0 ${theme.modalOverlay} backdrop-blur-sm z-[60]`}
            onClick={() => setSelectedProduct(null)}
          />
          <div className={`fixed inset-4 md:inset-y-10 md:inset-x-20 lg:inset-y-16 lg:inset-x-40 ${theme.modalBg} rounded-xl z-[60] overflow-hidden flex flex-col md:flex-row shadow-2xl`}>
            {/* Image Side */}
            <div className={`md:w-1/2 ${theme.imagePlaceholder} flex items-center justify-center`}>
              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className={`w-24 h-24 ${theme.muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            </div>

            {/* Info Side */}
            <div className="md:w-1/2 p-8 flex flex-col overflow-y-auto">
              <button
                onClick={() => setSelectedProduct(null)}
                className={`fixed md:absolute top-6 right-6 md:top-4 md:right-4 w-10 h-10 md:w-8 md:h-8 rounded-full ${theme.modalBg} shadow-lg flex items-center justify-center ${theme.muted} hover:${theme.heading} transition-colors z-10`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className={`font-serif text-2xl md:text-3xl font-medium ${theme.heading} mb-2`}>
                {selectedProduct.displayName || selectedProduct.name}
              </h2>

              <div className={`text-2xl font-medium ${accent.text} mb-6`}>
                ${(selectedProduct.price / 100).toFixed(2)}
              </div>

              {selectedProduct.description && (
                <p className={`${theme.body} text-sm leading-relaxed mb-6`}>
                  {selectedProduct.description}
                </p>
              )}

              {selectedProduct.features && selectedProduct.features.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.features
                      .flatMap(f => f.split(',').map(s => s.trim()))
                      .filter(f => f.length > 0)
                      .slice(0, 4)
                      .map((feature, i) => (
                        <span key={i} className={`px-3 py-1.5 text-xs rounded-full border ${theme.divider} ${theme.body}`}>
                          {feature}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {selectedProduct.inventory !== null && selectedProduct.inventory !== undefined && (
                <p className={`text-xs ${selectedProduct.inventory <= 5 ? 'text-amber-600' : theme.muted} mb-6`}>
                  {selectedProduct.inventory > 0 ? (
                    selectedProduct.inventory <= 5 ? `Only ${selectedProduct.inventory} left in stock` : `${selectedProduct.inventory} in stock`
                  ) : 'Out of stock'}
                </p>
              )}

              <div className="mt-auto">
                <button
                  onClick={() => {
                    addToCart(selectedProduct)
                    setSelectedProduct(null)
                  }}
                  disabled={selectedProduct.soldOut}
                  className={`w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accent.bg} ${accent.buttonText} ${accent.bgHover}`}
                >
                  {selectedProduct.soldOut ? 'Sold Out' : 'Add to Cart — $' + (selectedProduct.price / 100).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div
          className={`fixed inset-0 ${theme.modalOverlay} backdrop-blur-sm z-50`}
          onClick={() => setCartOpen(false)}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-full max-w-md ${theme.drawerBg} z-50 transform transition-transform duration-300 ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className={`flex justify-between items-center p-6 border-b ${theme.divider}`}>
            <h2 className={`text-lg font-medium ${theme.heading}`}>
              Cart {cartCount > 0 && <span className={`${theme.muted} font-normal`}>({cartCount})</span>}
            </h2>
            <button
              onClick={() => setCartOpen(false)}
              className={`${theme.muted} ${theme.link} transition-colors`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <p className={`${theme.muted} mb-4`}>Your cart is empty</p>
                <button
                  onClick={() => setCartOpen(false)}
                  className={`${theme.link} text-sm transition-colors`}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.priceId}
                    className={`flex gap-4 p-4 ${theme.cartItemBg} rounded`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-16 h-16 rounded ${theme.imagePlaceholder} flex items-center justify-center flex-shrink-0`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className={`${theme.heading} font-medium text-sm truncate`}>
                        {item.displayName || item.name}
                      </h4>
                      <p className={`${theme.muted} text-sm`}>${(item.price / 100).toFixed(2)}</p>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => updateQuantity(item.priceId, -1)}
                          className={`w-6 h-6 rounded ${theme.quantityButton} flex items-center justify-center text-sm transition-colors`}
                        >
                          -
                        </button>
                        <span className={`${theme.heading} text-sm w-4 text-center`}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.priceId, 1)}
                          className={`w-6 h-6 rounded ${theme.quantityButton} flex items-center justify-center text-sm transition-colors`}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.priceId)}
                          className="ml-auto text-red-500 hover:text-red-400 text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className={`${theme.heading} font-medium text-sm`}>
                      ${(item.price * item.quantity / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className={`p-6 border-t ${theme.divider}`}>
              <div className="flex justify-between items-center mb-4">
                <span className={theme.muted}>Subtotal</span>
                <span className={`text-xl font-medium ${theme.heading}`}>${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className={`w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${accent.bg} ${accent.buttonText} ${accent.bgHover}`}
              >
                {checkingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Checkout'
                )}
              </button>
              <p className={`text-center ${theme.muted} text-xs mt-3`}>
                Secure checkout via Stripe
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Routes with Layout */}
      <Layout cartCount={cartCount} cartTotal={cartTotal} onCartClick={() => setCartOpen(true)}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<About />} />
          <Route path="/team" element={<Team />} />
          <Route path="/community" element={<Community />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
