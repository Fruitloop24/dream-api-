import { CONFIG, getThemeClasses, getAccentClasses } from '../config'

export default function Team() {
  const theme = getThemeClasses()
  const accent = getAccentClasses()
  const { team, mission } = CONFIG

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Team Section */}
      <div className="text-center mb-12">
        <h1 className={`font-serif text-3xl md:text-4xl font-medium ${theme.heading} mb-3`}>
          {team.headline}
        </h1>
        <p className={`${theme.body} max-w-lg mx-auto`}>
          {team.subheadline}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-20">
        {team.members.map((member) => (
          <div key={member.name} className={`${theme.cardBg} card-hover rounded-xl overflow-hidden text-center`}>
            <div className="aspect-square overflow-hidden">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5">
              <h3 className={`font-serif text-lg font-medium ${theme.heading} mb-1`}>{member.name}</h3>
              <p className={`text-xs ${accent.text} uppercase tracking-wider mb-3`}>{member.role}</p>
              <p className={`text-sm ${theme.body} leading-relaxed`}>{member.bio}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mission Section */}
      <div className={`${theme.cardBg} rounded-xl p-8 md:p-12 text-center mb-12`}>
        <h2 className={`font-serif text-2xl font-medium ${theme.heading} mb-4`}>
          {mission.headline}
        </h2>
        <p className={`font-serif text-xl md:text-2xl ${theme.body} italic mb-8 max-w-xl mx-auto`}>
          "{mission.statement}"
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {mission.values.map((value) => (
            <div key={value.title}>
              <h4 className={`font-medium ${theme.heading} mb-2`}>{value.title}</h4>
              <p className={`text-sm ${theme.muted}`}>{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Template Callout */}
      {CONFIG.demoMode && (
        <div className={`p-6 rounded-lg border-2 border-dashed ${theme.divider} text-center`}>
          <p className={`text-xs uppercase tracking-wider ${theme.muted} mb-2`}>This store is powered by</p>
          <h3 className={`font-serif text-xl font-medium ${theme.heading} mb-3`}>Dream API</h3>
          <p className={`${theme.body} text-sm max-w-lg mx-auto mb-4`}>
            Launch your own store in minutes. Products, checkout, and inventory - all from one dashboard.
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
