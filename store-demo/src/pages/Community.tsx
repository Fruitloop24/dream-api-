import { CONFIG, getThemeClasses, getAccentClasses } from '../config'

export default function Community() {
  const theme = getThemeClasses()
  const accent = getAccentClasses()

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className={`font-serif text-3xl md:text-4xl font-medium ${theme.heading} mb-4`}>The Candle Corner</h1>
        <p className={`text-lg ${theme.body} max-w-xl mx-auto`}>
          Join fellow candle enthusiasts. Share your setups, get scent recommendations, and be first to know about new releases.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        <div className={`${theme.cardBg} rounded-lg p-8 text-center`}>
          <div className="text-4xl mb-4">📸</div>
          <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Share Your Space</h3>
          <p className={`text-sm ${theme.body} mb-4`}>
            Tag us @emberandwick and show off how you style your candles. Best setups get featured.
          </p>
          <span className={`text-sm ${theme.muted}`}>Coming soon</span>
        </div>

        <div className={`${theme.cardBg} rounded-lg p-8 text-center`}>
          <div className="text-4xl mb-4">🎁</div>
          <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Early Access</h3>
          <p className={`text-sm ${theme.body} mb-4`}>
            Community members get first dibs on limited releases and seasonal scents.
          </p>
          <span className={`text-sm ${theme.muted}`}>Coming soon</span>
        </div>

        <div className={`${theme.cardBg} rounded-lg p-8 text-center`}>
          <div className="text-4xl mb-4">💬</div>
          <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Scent Chat</h3>
          <p className={`text-sm ${theme.body} mb-4`}>
            Not sure which candle to try? Our community has opinions. Good ones.
          </p>
          <span className={`text-sm ${theme.muted}`}>Coming soon</span>
        </div>

        <div className={`${theme.cardBg} rounded-lg p-8 text-center`}>
          <div className="text-4xl mb-4">🔔</div>
          <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Restock Alerts</h3>
          <p className={`text-sm ${theme.body} mb-4`}>
            Your favorite sold out? We'll ping you the moment it's back.
          </p>
          <span className={`text-sm ${theme.muted}`}>Coming soon</span>
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className={`${theme.cardBg} rounded-lg p-8 text-center`}>
        <h3 className={`font-serif text-xl font-medium ${theme.heading} mb-2`}>Stay in the Loop</h3>
        <p className={`${theme.body} text-sm mb-6`}>
          New scents, restocks, and behind-the-scenes. No spam, ever.
        </p>
        <div className="flex max-w-md mx-auto gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            className={`flex-1 px-4 py-2 rounded ${theme.inputBg} ${theme.heading} ${theme.inputPlaceholder} ${theme.inputFocus} outline-none`}
          />
          <button className={`px-6 py-2 rounded ${accent.bg} ${accent.buttonText} ${accent.bgHover} transition-colors font-medium`}>
            Join
          </button>
        </div>
      </div>

      {/* Template Callout */}
      {CONFIG.demoMode && (
        <div className={`mt-16 p-6 rounded-lg border-2 border-dashed ${theme.divider} text-center`}>
          <p className={`text-xs uppercase tracking-wider ${theme.muted} mb-2`}>This store is powered by</p>
          <h3 className={`font-serif text-xl font-medium ${theme.heading} mb-3`}>Dream API</h3>
          <p className={`${theme.body} text-sm max-w-lg mx-auto mb-4`}>
            This community page is a template placeholder. Customize everything - or swap in your own community platform.
          </p>
          <a
            href="https://dream-api.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block px-6 py-2 rounded-lg ${accent.bg} ${accent.buttonText} ${accent.bgHover} transition-colors text-sm font-medium`}
          >
            Build Your Store →
          </a>
        </div>
      )}
    </div>
  )
}
