import { useEffect, useState } from 'react'
import { DreamAPI } from '@dream-api/sdk'
import './index.css'

// Initialize the SDK with keys from environment variables
const api = new DreamAPI({
  secretKey: import.meta.env.VITE_DREAM_SECRET_KEY,
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
})

interface Product {
  name: string
  price: number
  priceId: string
  productId: string
  imageUrl?: string  // Fixed: API returns imageUrl not image
  inventory?: number | null
  soldOut?: boolean
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

  // Fixed: prices are already in dollars, no need to divide by 100
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
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
        customerEmail: 'test@example.com', // In real app, collect this
        successUrl: window.location.href + '?success=true',
        cancelUrl: window.location.href + '?canceled=true',
      })

      if (result.url) {
        window.location.href = result.url
      }
    } catch (err: any) {
      alert('Checkout failed: ' + (err.message || 'Unknown error'))
    } finally {
      setCheckingOut(false)
    }
  }

  // Check for success/cancel in URL
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">✨</span>
            Dream Store
          </h1>
          <div className="relative">
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all">
              <span className="text-xl">🛒</span>
              <span className="font-medium">${cartTotal.toFixed(2)}</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Welcome to the Future
          </h2>
          <p className="text-xl text-purple-200">
            Powered by <code className="bg-white/10 px-2 py-1 rounded">@dream-api/sdk</code>
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {products.map((product) => (
              <div
                key={product.priceId}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10 group"
              >
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📦
                    </div>
                  )}
                  {product.soldOut && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
                        SOLD OUT
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-bold text-purple-400">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.inventory !== null && product.inventory !== undefined && (
                      <span className="text-sm text-gray-400">
                        {product.inventory} left
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.soldOut}
                    className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 rounded-xl transition-all disabled:cursor-not-allowed"
                  >
                    {product.soldOut ? 'Sold Out' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>🛒</span> Your Cart
            </h3>
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.priceId}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-4"
                >
                  <div className="flex items-center gap-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center text-2xl">
                        📦
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-semibold">{item.name}</h4>
                      <p className="text-purple-300">${item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.priceId, -1)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.priceId, 1)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-white font-bold w-24 text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.priceId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Total & Checkout */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl text-gray-300">Total</span>
                <span className="text-3xl font-bold text-white">${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <span>💳</span> Checkout
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-2xl font-bold text-white mb-2">No products yet</h3>
            <p className="text-gray-400">Check back soon!</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/30 border-t border-white/10 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Built with <span className="text-purple-400 font-mono">@dream-api/sdk</span>
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Auth, Billing, Usage - All in one API
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
