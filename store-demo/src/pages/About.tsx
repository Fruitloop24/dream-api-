import { CONFIG, getThemeClasses, getAccentClasses } from '../config'

export default function About() {
  const theme = getThemeClasses()
  const accent = getAccentClasses()
  const { about, mission } = CONFIG

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Hero Header */}
      <div className="text-center mb-16">
        <p className={`text-xs uppercase tracking-wider ${accent.text} mb-4`}>Est. 2024</p>
        <h1 className={`font-serif text-4xl md:text-5xl font-medium ${theme.heading} mb-6`}>
          {about.headline}
        </h1>
        <p className={`text-lg ${theme.body} max-w-xl mx-auto`}>
          The story behind what we do.
        </p>
      </div>

      {/* Story Section */}
      <div className={`${theme.cardBg} rounded-2xl p-8 md:p-12 mb-16`}>
        <div className="max-w-2xl mx-auto">
          <h2 className={`font-serif text-2xl font-medium ${theme.heading} mb-6 text-center`}>How It Started</h2>
          <p className={`${theme.body} leading-relaxed whitespace-pre-line text-sm md:text-base text-center`}>
            {about.content}
          </p>
        </div>
      </div>

      {/* Process Section - Visual Timeline */}
      <div className="mb-16">
        <h2 className={`font-serif text-2xl font-medium ${theme.heading} mb-10 text-center`}>From Wax to Wick</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className={`${theme.cardBg} rounded-xl p-6 text-center relative`}>
            <div className="text-4xl mb-4">🌱</div>
            <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Source</h3>
            <p className={`text-sm ${theme.body}`}>Natural soy wax & premium fragrance oils</p>
            <div className={`hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 ${theme.divider} bg-current`}></div>
          </div>
          <div className={`${theme.cardBg} rounded-xl p-6 text-center relative`}>
            <div className="text-4xl mb-4">🔥</div>
            <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Melt</h3>
            <p className={`text-sm ${theme.body}`}>Heated to the perfect temperature</p>
            <div className={`hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 ${theme.divider} bg-current`}></div>
          </div>
          <div className={`${theme.cardBg} rounded-xl p-6 text-center relative`}>
            <div className="text-4xl mb-4">✨</div>
            <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Pour</h3>
            <p className={`text-sm ${theme.body}`}>Hand-poured in small batches</p>
            <div className={`hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 ${theme.divider} bg-current`}></div>
          </div>
          <div className={`${theme.cardBg} rounded-xl p-6 text-center`}>
            <div className="text-4xl mb-4">⏳</div>
            <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>Cure</h3>
            <p className={`text-sm ${theme.body}`}>2 weeks for the perfect scent throw</p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mb-16">
        <h2 className={`font-serif text-2xl font-medium ${theme.heading} mb-8 text-center`}>What We Believe</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {mission.values.map((value, index) => (
            <div key={value.title} className={`${theme.cardBg} rounded-xl p-6`}>
              <div className={`text-3xl mb-4`}>{['✨', '🌿', '🔍'][index]}</div>
              <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-2`}>{value.title}</h3>
              <p className={`text-sm ${theme.body}`}>{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className={`text-center ${theme.cardBg} rounded-2xl p-8 md:p-12`}>
        <h3 className={`font-serif text-xl font-medium ${theme.heading} mb-4`}>
          Have questions? We'd love to hear from you.
        </h3>
        <a
          href="/contact"
          className={`inline-block px-8 py-3 rounded-lg ${accent.bg} ${accent.buttonText} ${accent.bgHover} transition-colors font-medium`}
        >
          Get in Touch
        </a>
      </div>
    </div>
  )
}
