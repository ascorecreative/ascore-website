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

    const fullPhoneNumber = `${formData.countryCode} ${formData.phone}`

    // Format clean message for WhatsApp (No encoding artifacts)
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

    // DIRECT INSTANT REDIRECT (Prevents mobile browser popup blocking)
    window.location.href = whatsappUrl
  }

  return (
    <section
      id="contact"
      className="section-gap"
      style={{
        background: '#04030a',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
        paddingTop: '6rem',
        paddingBottom: '6rem',
      }}
    >
      <div className="site-container">
        {/* Badge & Title */}
        <div style={{ marginBottom: '3rem' }}>
          <span
            className="label-text"
            style={{
              background: 'rgba(139, 248, 37, 0.08)',
              border: '1px solid rgba(139, 248, 37, 0.25)',
              padding: '0.4rem 1.25rem',
              borderRadius: '100px',
              color: '#8bf825',
              fontFamily: 'Jost, sans-serif',
            }}
          >
            Let's Build Together
          </span>
          <h2
            className="section-title"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(2.2rem, 4.8vw, 4.8rem)',
              fontWeight: 300,
              marginTop: '1rem',
            }}
          >
            Start Your{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #8bf825 0%, #00F5D4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
              }}
            >
              Project
            </span>
          </h2>
        </div>

        <div className="contact-grid">
          {/* Form Box */}
          <div
            style={{
              background: 'rgba(12, 10, 25, 0.85)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
            className="contact-card-box"
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                    padding: '0.9rem 1.1rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div className="form-two-col">
                <div>
                  <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      padding: '0.9rem 1.1rem',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Phone / WhatsApp
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      style={{
                        fontFamily: 'Jost, sans-serif',
                        width: '105px',
                        padding: '0.9rem 0.4rem',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#8bf825',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
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
                        padding: '0.9rem 1.1rem',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Service Required
                </label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    width: '100%',
                    padding: '0.9rem 1.1rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '1rem',
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
                <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                    padding: '0.9rem 1.1rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: '#8bf825',
                  color: '#04030a',
                  fontSize: '1rem',
                  fontWeight: 700,
                  padding: '1.05rem',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 22px rgba(139, 248, 37, 0.35)',
                  marginTop: '0.5rem',
                }}
              >
                Send via WhatsApp
                <Send size={18} />
              </button>
            </form>
          </div>

          {/* Contact Direct Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
            <div
              style={{
                background: 'rgba(12, 10, 25, 0.85)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '2rem',
              }}
            >
              <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.25rem' }}>
                Direct Contact
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <a
                  href="tel:+971543878726"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    color: '#8bf825',
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
                  <Mail size={22} style={{ color: '#8bf825' }} />
                  info@ascore.ae
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255, 255, 255, 0.85)', fontSize: '1rem' }}>
                  <MapPin size={22} style={{ color: '#8bf825' }} />
                  Dubai & Abu Dhabi, United Arab Emirates
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(139, 248, 37, 0.06)',
                border: '1px solid rgba(139, 248, 37, 0.2)',
                borderRadius: '20px',
                padding: '2rem',
              }}
            >
              <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Instant WhatsApp Consultation
              </h4>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '1.25rem' }}>
                Speak directly with an Ascore specialist for immediate project estimates or tax guidance.
              </p>
              <a
                href="https://wa.me/971568555626"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: '#8bf825',
                  color: '#04030a',
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

      <style>{`
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
        }
        .form-two-col {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 1.25rem;
        }
        @media (max-width: 900px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .form-two-col {
            grid-template-columns: 1fr !important;
          }
          .contact-card-box {
            padding: 1.5rem 1.25rem !important;
          }
        }
      `}</style>
    </section>
  )
}
