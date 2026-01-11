import { useState } from 'react'
import { CONFIG, getAccentClasses, getThemeClasses } from '../config'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const theme = getThemeClasses()
  const accent = getAccentClasses()
  const { contact } = CONFIG

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would send to an API
    console.log('Form submitted:', formData)
    setSubmitted(true)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className={`font-serif text-3xl md:text-4xl font-medium ${theme.heading} mb-4`}>{contact.headline}</h1>
        <p className={theme.body}>
          Questions, feedback, or just want to say hello? We'd love to hear from you.
        </p>
      </div>

      {submitted ? (
        <div className="text-center py-12">
          <p className={`${theme.heading} mb-4`}>Thanks for reaching out.</p>
          <p className={`${theme.body} text-sm mb-6`}>{contact.response}</p>
          <button
            onClick={() => {
              setSubmitted(false)
              setFormData({ name: '', email: '', message: '' })
            }}
            className={`${theme.link} text-sm transition-colors`}
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm ${theme.body} mb-2`}>Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 ${theme.inputBg} rounded ${theme.heading} ${theme.inputPlaceholder} focus:outline-none ${theme.inputFocus} transition-colors`}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className={`block text-sm ${theme.body} mb-2`}>Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-3 ${theme.inputBg} rounded ${theme.heading} ${theme.inputPlaceholder} focus:outline-none ${theme.inputFocus} transition-colors`}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className={`block text-sm ${theme.body} mb-2`}>Message</label>
            <textarea
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className={`w-full px-4 py-3 ${theme.inputBg} rounded ${theme.heading} ${theme.inputPlaceholder} focus:outline-none ${theme.inputFocus} transition-colors resize-none`}
              placeholder="How can we help?"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 ${accent.bg} ${accent.buttonText} rounded font-medium ${accent.bgHover} transition-colors`}
          >
            Send Message
          </button>
        </form>
      )}

      {/* Contact Info */}
      <div className={`mt-12 pt-10 border-t ${theme.divider}`}>
        <p className={`${theme.body} text-sm`}>
          You can also email us directly at{' '}
          <a href={`mailto:${contact.email}`} className={`${theme.link} transition-colors`}>
            {contact.email}
          </a>
        </p>
      </div>
    </div>
  )
}
