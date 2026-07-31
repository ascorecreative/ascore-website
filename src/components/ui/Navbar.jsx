import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '@/constants/data'

// Services dropdown data matching the sixeight reference with exact icons
const DESIGN_SERVICES = [
  {
    title: 'UI/UX Design',
    desc: 'Web & Mobile app design',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
  {
    title: 'Web Design',
    desc: 'Modern websites that convert.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  },
  {
    title: 'Mobile App Design',
    desc: 'Seamless iOS & Android design.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  },
  {
    title: 'Branding',
    desc: 'Identity that stands out.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  },
]

const DEV_SERVICES = [
  {
    title: 'Web Development',
    desc: 'Built for speed & growth.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    )
  },
  {
    title: 'WordPress Development',
    desc: 'Easy to manage & scale.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  },
  {
    title: 'Shopify Development',
    desc: 'Sell more with Shopify.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
      </svg>
    )
  },
  {
    title: 'Webflow Development',
    desc: 'Custom sites, no compromises.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    )
  },
]

export default function Navbar({ onOpenLeadModal }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const dropdownTimeout = useRef(null)

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

  const handleServicesEnter = () => {
    clearTimeout(dropdownTimeout.current)
    setServicesOpen(true)
  }

  const handleServicesLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setServicesOpen(false)
    }, 200)
  }

  // Common nav link style
  const navLinkStyle = {
    fontFamily: 'Jost, sans-serif',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 0.25s ease',
    letterSpacing: '0.01em',
  }

  return (
    <>
      {/* Floating Dark Pill Navbar — Sixeight Style (maxWidth reduced to 740px to bring tabs closer to logo) */}
      <header
        style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '740px',
          zIndex: 1000,
          background: scrolled
            ? 'rgba(4, 3, 10, 0.95)'
            : 'rgba(10, 8, 20, 0.8)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '100px',
          padding: '0.55rem 1.5rem',
          boxShadow: scrolled
            ? '0 10px 40px rgba(0, 0, 0, 0.6)'
            : '0 8px 32px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: 'Jost, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand Logo — Ascore White Logo */}
          <a href="#home" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src="/logo-white.png"
              alt="ASCORE CREATIVE"
              style={{
                height: '48px',
                width: 'auto',
                objectFit: 'contain',
                transition: 'all 0.3s ease',
              }}
              onError={(e) => { e.currentTarget.src = '/ascore-logo-clean.png' }}
            />
          </a>

          {/* Desktop Navigation Links — Closer spacing (gap: 1.75rem) */}
          <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {/* Services with Dropdown */}
            <div
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              <a
                href="#services"
                style={{
                  ...navLinkStyle,
                  color: servicesOpen ? '#8bf825' : 'rgba(255, 255, 255, 0.9)',
                }}
                onClick={(e) => e.preventDefault()}
              >
                Services
              </a>
              <svg
                width="10" height="6" viewBox="0 0 10 6" fill="none"
                style={{
                  transition: 'transform 0.3s ease',
                  transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0)',
                  marginTop: '2px',
                }}
              >
                <path d="M1 1L5 5L9 1" stroke={servicesOpen ? '#8bf825' : 'rgba(255,255,255,0.5)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <a
              href="#work"
              style={navLinkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#8bf825')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            >
              Work
            </a>

            <a
              href="#about"
              style={navLinkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#8bf825')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            >
              About Us
            </a>

            <a
              href="#blog"
              style={navLinkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#8bf825')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
            >
              Blog
            </a>
          </nav>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Contact Us — White outlined pill button (matches sixeight exactly) */}
            <button
              onClick={onOpenLeadModal}
              className="hidden-mobile"
              style={{
                fontFamily: 'Jost, sans-serif',
                background: 'transparent',
                color: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 600,
                padding: '0.6rem 1.5rem',
                borderRadius: '100px',
                border: '1.5px solid rgba(255, 255, 255, 0.85)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.color = '#04030a'
                e.currentTarget.style.borderColor = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.85)'
              }}
            >
              Contact Us
            </button>

            {/* Mobile Hamburger */}
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

      {/* ===== SERVICES MEGA DROPDOWN — Exact Sixeight Style with Icons ===== */}
      {servicesOpen && (
        <div
          onMouseEnter={handleServicesEnter}
          onMouseLeave={handleServicesLeave}
          style={{
            position: 'fixed',
            top: '4.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: '1000px',
            zIndex: 999,
            background: '#ffffff',
            borderRadius: '20px',
            padding: '2.25rem 2.5rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35), 0 8px 20px rgba(0,0,0,0.15)',
            display: 'grid',
            gridTemplateColumns: '1.1fr 1.1fr 280px',
            gap: '2rem',
            animation: 'dropdownSlideIn 0.25s ease',
            fontFamily: 'Jost, sans-serif',
          }}
        >
          {/* Column 1: Design Services */}
          <div>
            <h3 style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#7209B7',
              background: 'rgba(114, 9, 183, 0.06)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              letterSpacing: '0.02em',
            }}>
              Design Services
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {DESIGN_SERVICES.map((s) => (
                <a
                  key={s.title}
                  href="#services"
                  onClick={() => setServicesOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.querySelector('.dd-title').style.color = '#8bf825'
                    e.currentTarget.querySelector('.dd-circle').style.background = '#8bf825'
                    e.currentTarget.querySelector('.dd-circle').style.color = '#000'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.querySelector('.dd-title').style.color = '#111'
                    e.currentTarget.querySelector('.dd-circle').style.background = '#111'
                    e.currentTarget.querySelector('.dd-circle').style.color = '#fff'
                  }}
                >
                  {/* Black Circular Badge containing SVG Icon */}
                  <span
                    className="dd-circle"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#111',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {s.icon}
                  </span>
                  <div>
                    <div className="dd-title" style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: '#111',
                      transition: 'color 0.2s ease',
                      marginBottom: '2px',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.8125rem',
                      color: '#888',
                      fontWeight: 400,
                    }}>
                      {s.desc}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Development Services */}
          <div>
            <h3 style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#ea580c',
              background: 'rgba(249, 115, 22, 0.06)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              letterSpacing: '0.02em',
            }}>
              Development Services
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {DEV_SERVICES.map((s) => (
                <a
                  key={s.title}
                  href="#services"
                  onClick={() => setServicesOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.querySelector('.dd-title').style.color = '#8bf825'
                    e.currentTarget.querySelector('.dd-circle').style.background = '#8bf825'
                    e.currentTarget.querySelector('.dd-circle').style.color = '#000'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.querySelector('.dd-title').style.color = '#111'
                    e.currentTarget.querySelector('.dd-circle').style.background = '#111'
                    e.currentTarget.querySelector('.dd-circle').style.color = '#fff'
                  }}
                >
                  {/* Black Circular Badge containing SVG Icon */}
                  <span
                    className="dd-circle"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#111',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {s.icon}
                  </span>
                  <div>
                    <div className="dd-title" style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: '#111',
                      transition: 'color 0.2s ease',
                      marginBottom: '2px',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.8125rem',
                      color: '#888',
                      fontWeight: 400,
                    }}>
                      {s.desc}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Column 3: Our Product / Featured Card — Exact reference replica */}
          <div style={{
            background: '#e0f2fe',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Our Product badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#111',
              color: '#fff',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '100px',
              width: 'fit-content',
              marginBottom: '0.85rem',
              letterSpacing: '0.03em',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8bf825' }} />
              Our Product
            </span>

            {/* Inner White Box Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}>
              {/* Product title header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: '#8bf825',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#000',
                }}>W</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111', fontFamily: 'Jost, sans-serif' }}>
                  Webpagehealth
                </span>
              </div>
              <p style={{
                fontSize: '0.8125rem',
                color: '#666',
                fontFamily: 'Jost, sans-serif',
                marginBottom: '0.75rem',
                fontWeight: 400,
              }}>
                AI-Powered Website Analysis
              </p>

              {/* Laptop Preview Graphic */}
              <div style={{
                width: '100%',
                height: '110px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0a0820 0%, #1a1040 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <img
                  src="/ascore-emblem.png"
                  alt="Ascore emblem"
                  style={{ height: '50px', width: 'auto', opacity: 0.85 }}
                />
              </div>

              {/* Explore Button */}
              <a
                href="#services"
                onClick={() => setServicesOpen(false)}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: '#111',
                  color: '#fff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: '0.55rem 0',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.25s ease',
                  marginTop: 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#8bf825'
                  e.currentTarget.style.color = '#000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#111'
                  e.currentTarget.style.color = '#fff'
                }}
              >
                Explore
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== Full-Screen Mobile Navigation Overlay ===== */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(4, 3, 10, 0.97)',
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
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8bf825')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            onClick={() => {
              setMobileMenuOpen(false)
              onOpenLeadModal()
            }}
            style={{
              fontFamily: 'Jost, sans-serif',
              background: '#ffffff',
              color: '#04030a',
              fontSize: '1.0625rem',
              fontWeight: 700,
              padding: '1rem 2.25rem',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 6px 30px rgba(255, 255, 255, 0.3)',
            }}
          >
            Contact Us
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdownSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
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
