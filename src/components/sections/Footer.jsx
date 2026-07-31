import { NAV_LINKS } from '@/constants/data'
import { Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer
      style={{
        background: '#020206',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '5rem 0 2.5rem',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
        color: '#fff',
      }}
    >
      <div className="site-container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr',
            gap: '3rem',
            marginBottom: '4rem',
          }}
          className="footer-grid"
        >
          {/* Col 1: Logo & Vision */}
          <div>
            <a href="#home" style={{ display: 'inline-block', marginBottom: '1.25rem', textDecoration: 'none' }}>
              <img
                src="/logo-white.png"
                alt="ASCORE CREATIVE"
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              />
            </a>
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.9375rem',
                color: 'rgba(255, 255, 255, 0.65)',
                lineHeight: '1.75',
                maxWidth: '320px',
              }}
            >
              UAE’s premier digital & corporate agency. Engineering high-converting web applications, immersive 3D brand experiences, and certified corporate tax compliance.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#8bf825',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem',
              }}
            >
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: 'Jost, sans-serif',
                      color: 'rgba(255, 255, 255, 0.75)',
                      fontSize: '0.9375rem',
                      textDecoration: 'none',
                      transition: 'color 0.25s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#8bf825')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)')}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Services Scope */}
          <div>
            <h4
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#8bf825',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem',
              }}
            >
              Services
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.65)' }}>
              <li>Digital Growth & Performance</li>
              <li>3D & Full-Stack Engineering</li>
              <li>UAE Corporate Tax Filing</li>
              <li>VAT & Financial Compliance</li>
              <li>AI Integration & Automation</li>
            </ul>
          </div>

          {/* Col 4: UAE Direct Contact */}
          <div>
            <h4
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#8bf825',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem',
              }}
            >
              Contact Specialist
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9375rem' }}>
              <a
                href="tel:+971543878726"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#8bf825',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Phone size={16} />
                +971 54 387 8726
              </a>

              <a
                href="mailto:info@ascore.ae"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textDecoration: 'none',
                }}
              >
                <Mail size={16} style={{ color: '#8bf825' }} />
                info@ascore.ae
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.65)' }}>
                <MapPin size={16} style={{ color: '#8bf825' }} />
                Dubai & Abu Dhabi, UAE
              </div>

              <a
                href="https://wa.me/971568555626"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: 'rgba(139, 248, 37, 0.08)',
                  border: '1px solid rgba(139, 248, 37, 0.3)',
                  color: '#8bf825',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: '0.5rem 1rem',
                  borderRadius: '100px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '0.5rem',
                }}
              >
                Talk to an Expert <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Rights Strip */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: 'rgba(255, 255, 255, 0.45)',
          }}
          className="footer-bottom"
        >
          <span>© {new Date().getFullYear()} Ascore Creative UAE. All Rights Reserved.</span>
          <span>Dubai • Abu Dhabi • United Arab Emirates</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            gap: 0.75rem !important;
            text-align: center !important;
          }
        }
      `}</style>
    </footer>
  )
}
