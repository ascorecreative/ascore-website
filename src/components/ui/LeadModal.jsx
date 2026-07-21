import { useState } from 'react'
import { X, Send, Phone, User, CheckCircle2, Sparkles } from 'lucide-react'

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

export default function LeadModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+971',
    phone: '',
    service: 'Digital Growth & Web App Engineering',
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    sessionStorage.setItem('ascore_lead_modal_seen', 'true')

    const fullPhoneNumber = `${formData.countryCode} ${formData.phone}`

    // Format clean message for WhatsApp (No emoji artifacts)
    const textMsg = 
      `Hello Ascore Creative Team!\n\n` +
      `I would like to request an immediate callback.\n\n` +
      `• Name: ${formData.name}\n` +
      `• Phone / WhatsApp: ${fullPhoneNumber}\n` +
      `• Service Needed: ${formData.service}\n\n` +
      `Please contact me as soon as possible.`

    const whatsappUrl = `https://wa.me/971568555626?text=${encodeURIComponent(textMsg)}`

    setTimeout(() => {
      window.open(whatsappUrl, '_blank')
      setSubmitted(false)
      onClose()
    }, 1000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(4, 3, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        animation: 'modalFadeIn 0.35s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(145deg, rgba(20, 15, 45, 0.95) 0%, rgba(8, 6, 22, 0.98) 100%)',
          border: '1.5px solid rgba(0, 245, 212, 0.55)',
          borderRadius: '24px',
          padding: '2.25rem 2rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 245, 212, 0.3)',
          fontFamily: 'Jost, sans-serif',
          color: '#fff',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#00F5D4',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 35px rgba(0, 245, 212, 0.7)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.6rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              Opening WhatsApp...
            </h3>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: '1.6' }}>
              Redirecting details directly to our specialist chat.
            </p>
          </div>
        ) : (
          <div>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <Sparkles size={18} style={{ color: '#00F5D4' }} />
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#00F5D4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Quick Contact
              </span>
            </div>

            <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.65rem', fontWeight: 500, lineHeight: '1.25', marginBottom: '0.5rem' }}>
              Talk to an{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 700,
                }}
              >
                Ascore Expert
              </span>
            </h3>

            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Enter your details to open a direct WhatsApp consultation with our team.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.8rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(157, 78, 221, 0.35)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Country Code & Phone Input Group */}
              <div>
                <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Mobile / WhatsApp Number
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      width: '110px',
                      padding: '0.85rem 0.5rem',
                      background: 'rgba(15, 12, 35, 0.95)',
                      border: '1px solid rgba(0, 245, 212, 0.45)',
                      borderRadius: '12px',
                      color: '#00F5D4',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#00F5D4' }} />
                    <input
                      type="tel"
                      required
                      placeholder="50 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        fontFamily: 'Jost, sans-serif',
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(0, 245, 212, 0.45)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '0.9375rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Service Needed
                </label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: 'rgba(15, 12, 35, 0.95)',
                    border: '1px solid rgba(157, 78, 221, 0.35)',
                    borderRadius: '12px',
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

              <button
                type="submit"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                  color: '#000',
                  fontSize: '1rem',
                  fontWeight: 700,
                  padding: '0.95rem',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(0, 245, 212, 0.45)',
                  marginTop: '0.5rem',
                }}
              >
                Send via WhatsApp
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
