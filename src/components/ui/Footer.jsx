import { Mail, Phone, MapPin } from 'lucide-react'
import { NAV_LINKS } from '@/constants/data'

export default function Footer() {
  const year = new Date().getFullYear()

  const practiceAreas = [
    'Digital Growth & Marketing',
    'Web & Mobile App Engineering',
    'UAE Corporate Tax & VAT',
    'Financial Auditing & Compliance',
    'Enterprise E-Commerce',
  ]

  const go = (href) => {
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer style={{ background: '#020306', borderTop: '1px solid rgba(0, 245, 212, 0.15)', position: 'relative', zIndex: 10 }}>
      {/* Main Footer Container */}
      <div className="site-container" style={{ padding: '5rem 2rem 4rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1.25fr 1.75fr 1.5fr',
            gap: '3rem',
          }}
          className="footer-grid"
        >
          {/* Col 1: Brand Info & High-Visibility Logo */}
          <div>
            <img
              src="/logo-original.png"
              alt="Ascore Creative"
              style={{
                height: '44px',
                width: 'auto',
                marginBottom: '1.5rem',
                display: 'block',
                filter: 'drop-shadow(0 0 10px rgba(0, 245, 212, 0.2))',
              }}
            />
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.9375rem',
                lineHeight: '1.65',
                maxWidth: '320px',
                marginBottom: '2rem',
              }}
            >
              The Nexus of Precision and Creativity. Premium digital growth, high-performance web engineering, and expert corporate tax services in the UAE.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { name: 'Instagram', href: 'https://instagram.com/ascore.ae' },
                { name: 'LinkedIn', href: 'https://linkedin.com/company/ascore' },
                { name: 'Facebook', href: 'https://facebook.com/ascore.ae' },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.7)',
                    textDecoration: 'none',
                    padding: '0.4rem 0.88rem',
                    borderRadius: '100px',
                    border: '1px solid rgba(0, 245, 212, 0.2)',
                    background: 'rgba(0, 245, 212, 0.04)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#00F5D4'
                    e.currentTarget.style.borderColor = '#00F5D4'
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 245, 212, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                    e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.2)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#00F5D4',
                marginBottom: '1.5rem',
              }}
            >
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); go(link.href) }}
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.9375rem',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#00F5D4')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Practice Areas */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#00F5D4',
                marginBottom: '1.5rem',
              }}
            >
              Practice Areas
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {practiceAreas.map((area) => (
                <li key={area}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9375rem' }}>
                    {area}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: UAE Office & Direct Contact */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#00F5D4',
                marginBottom: '1.5rem',
              }}
            >
              UAE Contact
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} style={{ color: '#00F5D4', flexShrink: 0 }} />
                <a
                  href="tel:+971543878726"
                  style={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    textDecoration: 'none',
                  }}
                >
                  +971 54 387 8726
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} style={{ color: '#00F5D4', flexShrink: 0 }} />
                <a
                  href="mailto:info@ascore.ae"
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.9375rem',
                    textDecoration: 'none',
                  }}
                >
                  info@ascore.ae
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} style={{ color: '#00F5D4', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9375rem' }}>
                  Dubai & Abu Dhabi, UAE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem 0' }}>
        <div
          className="site-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: 'rgba(255, 255, 255, 0.35)',
          }}
        >
          <span>© {year} Ascore Creative FZC LLC. All rights reserved.</span>
          <span>Crafted for Web & Digital Growth in the UAE.</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 550px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
