import { useState } from 'react'
import { X, Send, Sparkles } from 'lucide-react'

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
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+971',
    phone: '',
    service: 'Digital Growth & Web Engineering',
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()

    const fullPhoneNumber = `${formData.countryCode} ${formData.phone}`

    // Clean text without encoding artifacts
    const textMsg = 
      `Hello Ascore Creative Team!\n\n` +
      `I would like to request an immediate callback.\n\n` +
      `• Name: ${formData.name}\n` +
      `• Phone / WhatsApp: ${fullPhoneNumber}\n` +
      `• Service Needed: ${formData.service}\n\n` +
      `Please contact me as soon as possible.`

    const whatsappUrl = `https://wa.me/971568555626?text=${encodeURIComponent(textMsg)}`

    // Direct Instant Redirect (Prevents Mobile Browser Popup Blocking)
    window.location.href = whatsappUrl
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(4, 3, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(135deg, rgba(15, 12, 35, 0.95) 0%, rgba(6, 4, 18, 0.98) 100%)',
          border: '1.5px solid rgba(0, 245, 212, 0.4)',
          borderRadius: '24px',
          padding: '2.25rem 2rem',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 245, 212, 0.25)',
          animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'Jost, sans-serif',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 245, 212, 0.12)',
              border: '1px solid rgba(0, 245, 212, 0.35)',
              padding: '0.35rem 1rem',
              borderRadius: '100px',
              color: '#00F5D4',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.85rem',
              letterSpacing: '0.05em',
            }}
          >
            <Sparkles size={14} /> Instant Callback
          </div>

          <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.65rem', fontWeight: 600, color: '#fff', margin: 0 }}>
            Connect with an{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Expert
            </span>
          </h3>
          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.4rem' }}>
            Enter details for direct WhatsApp consultation
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Name
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
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(157, 78, 221, 0.35)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phone / WhatsApp
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  width: '105px',
                  padding: '0.85rem 0.4rem',
                  background: 'rgba(15, 12, 35, 0.95)',
                  border: '1px solid rgba(157, 78, 221, 0.35)',
                  borderRadius: '12px',
                  color: '#00F5D4',
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
                  padding: '0.85rem 1.1rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(157, 78, 221, 0.35)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'Jost, sans-serif', display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Service
            </label>
            <select
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              style={{
                fontFamily: 'Jost, sans-serif',
                width: '100%',
                padding: '0.85rem 1.1rem',
                background: 'rgba(15, 12, 35, 0.95)',
                border: '1px solid rgba(157, 78, 221, 0.35)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
              }}
            >
              <option value="Digital Growth & Web Engineering">Digital Growth & Web Engineering</option>
              <option value="UAE Corporate Tax & VAT Compliance">UAE Corporate Tax & VAT Compliance</option>
              <option value="Branding & 3D Spatial Design">Branding & 3D Spatial Design</option>
              <option value="AI Integration & Automation">AI Integration & Automation</option>
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
              marginTop: '0.5rem',
              boxShadow: '0 4px 22px rgba(0, 245, 212, 0.45)',
              transition: 'all 0.3s ease',
            }}
          >
            Start WhatsApp Chat
            <Send size={18} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
