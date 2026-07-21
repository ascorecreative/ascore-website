import { useState } from 'react'
import { Send, Phone, Mail, MapPin } from 'lucide-react'

const COUNTRY_CODES = [
  { code: '+971', flag: '🇦🇪', label: 'UAE (+971)' },
  { code: '+966', flag: '🇸🇦', label: 'KSA (+966)' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar (+974)' },
  { code: '+965', flag: '🇰🇼', label: 'Kuwait (+965)' },
  { code: '+968', flag: '🇴🇲', label: 'Oman (+968)' },
  { code: '+973', flag: '🇧🇭', label: 'Bahrain (+973)' },
  { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)' },
  { code: '+1', flag: '🇺🇸', label: 'US/CA (+1)' },
]

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+971',
    phone: '',
    service: 'Digital Growth & Web App Engineering',
    message: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)

    const fullPhoneNumber = `${formData.countryCode} ${formData.phone}`

    // Format clean message for WhatsApp (No emoji artifacts)
    const textMsg = 
      `Hello Ascore Creative Team!\n\n` +
      `I would like to start a project inquiry.\n\n` +
      `• Name: ${formData.name}\n` +
      `• Email: ${formData.email}\n` +
      `• Phone: ${fullPhoneNumber}\n` +
      `• Service Needed: ${formData.service}\n` +
      `• Project Brief: ${formData.message}\n\n` +
      `Please get back to me.`

    const whatsappUrl = `https://wa.me/971568555626?text=${encodeURIComponent(textMsg)}`

    setTimeout(() => {
      window.open(whatsappUrl, '_blank')
      setSubmitted(false)
    }, 1000)
  }

  return (
    <section
      id="contact"
      className="section-gap"
      style={{
        background: 'linear-gradient(180deg, #04030a 0%, #09071c 50%, #04030a 100%)',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
      }}
    >
      <div className="site-container">
        {/* Badge & Title */}
        <div style={{ marginBottom: '3.5rem' }}>
          <span
            className="label-text"
            style={{
              background: 'rgba(157, 78, 221, 0.15)',
              border: '1px solid rgba(157, 78, 221, 0.35)',
              padding: '0.4rem 1.25rem',
              borderRadius: '100px',
              color: '#00F5D4',
              fontFamily: 'Jost, sans-serif',
            }}
          >
            Let's Build Together
          </span>
          <h2
            className="section-title"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(2.5rem, 5vw, 5rem)',
              fontWeight: 300,
              marginTop: '1rem',
            }}
          >
            Start Your{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
              }}
            >
              Project
            </span>
          </h2>
        </div>

        <div className="grid-2">
          {/* Form */}
          <div
            style={{
              background: 'rgba(15, 12, 35, 0.65)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(157, 78, 221, 0.25)',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#00F5D4',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    boxShadow: '0 0 30px rgba(0, 245, 212, 0.6)',
                  }}
                >
                  ✓
                </div>
                <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                  Opening WhatsApp...
                </h3>
                <p style={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.7)' }}>
                  Redirecting project brief directly to our specialist chat.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      width: '100%',
                      padding: '0.85rem 1.1rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(157, 78, 221, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="info@ascore.ae"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        fontFamily: 'Jost, sans-serif',
                        width: '100%',
                        padding: '0.85rem 1.1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(157, 78, 221, 0.3)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.9375rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Phone / WhatsApp
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select
                        value={formData.countryCode}
                        onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          width: '100px',
                          padding: '0.85rem 0.4rem',
                          background: 'rgba(15, 12, 35, 0.95)',
                          border: '1px solid rgba(157, 78, 221, 0.3)',
                          borderRadius: '10px',
                          color: '#00F5D4',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="50 123 4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          flex: 1,
                          padding: '0.85rem 1.1rem',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(157, 78, 221, 0.3)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '0.9375rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Service Required
                  </label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      width: '100%',
                      padding: '0.85rem 1.1rem',
                      background: 'rgba(15, 12, 35, 0.95)',
                      border: '1px solid rgba(157, 78, 221, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Digital Growth & Web App Engineering">Digital Growth & Web App Engineering</option>
                    <option value="UAE Corporate Tax & VAT Compliance">UAE Corporate Tax & VAT Compliance</option>
                    <option value="Branding & 3D Spatial Design">Branding & 3D Spatial Design</option>
                    <option value="AI Integration & Automation">AI Integration & Automation</option>
                    <option value="Full Agency Advisory">Full Agency Advisory</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Project Brief
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about your project goals..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      width: '100%',
                      padding: '0.85rem 1.1rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(157, 78, 221, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                    color: '#000',
                    fontSize: '1rem',
                    fontWeight: 700,
                    padding: '1rem',
                    borderRadius: '100px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 20px rgba(0, 245, 212, 0.4)',
                    marginTop: '0.5rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 245, 212, 0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 245, 212, 0.4)'
                  }}
                >
                  Send via WhatsApp
                  <Send size={18} />
                </button>
              </form>
            )}
          </div>

          {/* Contact Direct Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2rem' }}>
            <div
              style={{
                background: 'rgba(15, 12, 35, 0.65)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(157, 78, 221, 0.25)',
                borderRadius: '20px',
                padding: '2rem',
              }}
            >
              <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>
                Direct Contact
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <a
                  href="tel:+971543878726"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    color: '#00F5D4',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={22} />
                  +971 54 387 8726
                </a>

                <a
                  href="mailto:info@ascore.ae"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '1rem',
                    textDecoration: 'none',
                  }}
                >
                  <Mail size={22} style={{ color: '#00F5D4' }} />
                  info@ascore.ae
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255, 255, 255, 0.85)', fontSize: '1rem' }}>
                  <MapPin size={22} style={{ color: '#00F5D4' }} />
                  Dubai & Abu Dhabi, United Arab Emirates
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(114, 9, 183, 0.2) 0%, rgba(0, 119, 255, 0.2) 100%)',
                border: '1px solid rgba(0, 245, 212, 0.3)',
                borderRadius: '20px',
                padding: '2rem',
              }}
            >
              <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Instant WhatsApp Consultation
              </h4>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.25rem' }}>
                Speak directly with an Ascore specialist for immediate project estimates or tax guidance.
              </p>
              <a
                href="https://wa.me/971568555626"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: '#00F5D4',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '100px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Chat on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
