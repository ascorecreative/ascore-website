import { useState, useEffect } from 'react'
import { Phone, MessageSquare, Mail, Menu, X, ArrowRight } from 'lucide-react'
import { NAV_LINKS } from '@/constants/data'

export default function Navbar({ onOpenLeadModal }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <>
      {/* High-Gloss Floating Pill Navbar */}
      <header
        style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '1220px',
          zIndex: 1000,
          background: scrolled
            ? 'linear-gradient(135deg, rgba(12, 9, 30, 0.92) 0%, rgba(4, 3, 10, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(24, 18, 55, 0.78) 0%, rgba(8, 6, 22, 0.85) 100%)',
          backdropFilter: 'blur(36px) saturate(180%)',
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          border: '1.5px solid rgba(0, 245, 212, 0.45)',
          borderRadius: '100px',
          padding: '0.65rem 1.4rem',
          boxShadow: '0 15px 45px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 0 30px rgba(0, 245, 212, 0.25)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'Jost, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand Logo */}
          <a href="#home" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src="/logo-original.png"
              alt="ASCORE CREATIVE"
              style={{
                height: '46px',
                width: 'auto',
                objectFit: 'contain',
                transition: 'all 0.3s ease',
              }}
            />
          </a>

          {/* Desktop Links */}
          <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  color: 'rgba(255, 255, 255, 0.88)',
                  fontSize: '0.9375rem',
                  fontWeight: 400,
                  textDecoration: 'none',
                  transition: 'color 0.25s ease',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00F5D4')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.88)')}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Phone Icon */}
            <button
              onClick={onOpenLeadModal}
              title="Talk to a sales advisor"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(0, 245, 212, 0.5)',
                color: '#00F5D4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 15px rgba(0, 245, 212, 0.25)',
              }}
            >
              <Phone size={17} />
            </button>

            {/* WhatsApp Icon */}
            <a
              href="https://wa.me/971568555626"
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp Specialist"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(157, 78, 221, 0.5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <MessageSquare size={17} />
            </a>

            {/* Email Icon (Desktop Only) */}
            <a
              href="mailto:info@ascore.ae"
              title="Email Us"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
              className="hidden-mobile"
            >
              <Mail size={17} />
            </a>

            {/* CTA Pill Button (Desktop Only) */}
            <button
              onClick={onOpenLeadModal}
              className="hidden-mobile"
              style={{
                fontFamily: 'Jost, sans-serif',
                background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                color: '#000',
                fontSize: '0.875rem',
                fontWeight: 700,
                padding: '0.65rem 1.5rem',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.35s ease',
                boxShadow: '0 4px 20px rgba(0, 245, 212, 0.5)',
              }}
            >
              Talk to an expert
              <ArrowRight size={15} />
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                cursor: 'pointer',
                display: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="mobile-hamburger-btn"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Liquid Glass Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'linear-gradient(180deg, rgba(4, 3, 10, 0.96) 0%, rgba(12, 9, 30, 0.98) 100%)',
            backdropFilter: 'blur(36px)',
            WebkitBackdropFilter: 'blur(36px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {/* Navigation Links List */}
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.75rem',
              marginBottom: '3rem',
              width: '100%',
            }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  color: '#ffffff',
                  fontSize: '1.75rem',
                  fontWeight: 300,
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00F5D4')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action CTA Button */}
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              onOpenLeadModal()
            }}
            style={{
              fontFamily: 'Jost, sans-serif',
              background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
              color: '#000',
              fontSize: '1.0625rem',
              fontWeight: 700,
              padding: '1rem 2.25rem',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 6px 30px rgba(0, 245, 212, 0.5)',
            }}
          >
            Talk to an expert
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .hidden-mobile {
            display: none !important;
          }
          .mobile-hamburger-btn {
            display: flex !important;
          }
        }
      `}</style>
    </>
  )
}
