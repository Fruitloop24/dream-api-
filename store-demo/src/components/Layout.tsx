import { Link, useLocation } from 'react-router-dom'
import { CONFIG, getAccentClasses, getThemeClasses } from '../config'

interface LayoutProps {
  children: React.ReactNode
  cartCount: number
  cartTotal: number
  onCartClick: () => void
}

const NAV_LINKS = [
  { path: '/', label: 'Shop' },
  { path: '/about', label: 'About' },
  { path: '/team', label: 'Team' },
  { path: '/community', label: 'Community' },
  { path: '/contact', label: 'Contact' },
]

export default function Layout({ children, cartCount, cartTotal, onCartClick }: LayoutProps) {
  const location = useLocation()
  const { storeName, footer } = CONFIG
  const theme = getThemeClasses()
  const accent = getAccentClasses()

  return (
    <div className={`min-h-screen ${theme.pageBg} flex flex-col`}>
      {/* Header */}
      <header className={`${theme.headerBg} sticky top-0 z-40`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <span className="text-2xl">🕯️</span>
              <span className={`font-serif text-2xl md:text-3xl font-medium ${theme.heading} tracking-tight group-hover:opacity-80 transition-opacity`}>
                {storeName}
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm transition-colors ${
                      isActive ? theme.heading : theme.link
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className={`flex items-center gap-3 ${theme.link} transition-colors`}
            >
              <span className="text-sm">${cartTotal.toFixed(2)}</span>
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className={`absolute -top-2 -right-2 ${accent.bg} ${accent.buttonText} text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium`}>
                    {cartCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex md:hidden gap-6 pb-3 -mt-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm transition-colors ${
                    isActive ? theme.heading : theme.link
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className={`${theme.footerBg} mt-auto`}>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <h3 className={`text-lg font-medium ${theme.heading} mb-3`}>{storeName}</h3>
              <p className={`${theme.body} text-sm leading-relaxed max-w-sm`}>
                {footer.tagline}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className={`text-xs font-medium ${theme.muted} uppercase tracking-wider mb-4`}>Shop</h4>
              <ul className="space-y-2">
                <li><Link to="/" className={`${theme.link} text-sm transition-colors`}>All Products</Link></li>
                <li><Link to="/about" className={`${theme.link} text-sm transition-colors`}>About</Link></li>
                <li><Link to="/team" className={`${theme.link} text-sm transition-colors`}>Team</Link></li>
                <li><Link to="/community" className={`${theme.link} text-sm transition-colors`}>Community</Link></li>
                <li><Link to="/contact" className={`${theme.link} text-sm transition-colors`}>Contact</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className={`text-xs font-medium ${theme.muted} uppercase tracking-wider mb-4`}>Support</h4>
              <ul className="space-y-2">
                {footer.links.support.map((link, i) => (
                  <li key={i}><a href={link.href} className={`${theme.link} text-sm transition-colors`}>{link.label}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className={`border-t ${theme.divider} mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4`}>
            <p className={`${theme.muted} text-xs`}>
              &copy; {new Date().getFullYear()} {storeName}
            </p>
            <a
              href="https://dream-frontend-dyn.pages.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme.muted} text-xs opacity-60 hover:opacity-100 transition-opacity`}
            >
              ⚡ Powered by Dream API
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
