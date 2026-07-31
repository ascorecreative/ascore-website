import { useState, useEffect } from 'react'

const MOCKUP_CARDS = [
  '/cards/card-1-app.png',
  '/cards/card-2-saas.png',
  '/cards/card-3-3dweb.png',
  '/cards/card-4-branding.png',
]

export default function AIFeatureSection() {
  const [activeCardIdx, setActiveCardIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCardIdx((prev) => (prev + 1) % MOCKUP_CARDS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section
      id="about-intro"
      style={{
        background: '#04030a',
        padding: '6rem 0',
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
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '4rem',
            alignItems: 'center',
          }}
          className="about-intro-grid"
        >
          {/* Left Column: Heading with embedded mockup card gap */}
          <div>
            {/* Services Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(139, 248, 37, 0.08)',
                border: '1px solid rgba(139, 248, 37, 0.25)',
                color: '#8bf825',
                fontSize: '0.8125rem',
                fontWeight: 600,
                padding: '0.4rem 1.25rem',
                borderRadius: '100px',
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8bf825' }} />
              Services
            </span>

            {/* Giant Title */}
            <h2
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(2rem, 4vw, 3.6rem)',
                fontWeight: 600,
                lineHeight: 1.15,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              We help you{' '}
              <span
                style={{
                  display: 'inline-block',
                  width: '120px',
                  height: '75px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  verticalAlign: 'middle',
                  margin: '0 8px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src={MOCKUP_CARDS[activeCardIdx]}
                  alt="Ascore mockup"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'all 0.6s ease',
                  }}
                />
              </span>
              design<br />
              and build better digital<br />
              products. All in ONE place!
            </h2>
          </div>

          {/* Right Column: Paragraph and Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1.0625rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: '1.75',
                fontWeight: 300,
                margin: 0,
              }}
            >
              You need a partner who gets your business and covers everything. From branding to UI/UX design and web development, you can rely on us for everything.
            </p>

            <a
              href="#services"
              style={{
                fontFamily: 'Jost, sans-serif',
                background: 'transparent',
                border: '1.5px solid rgba(255, 255, 255, 0.8)',
                color: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 600,
                padding: '0.75rem 2rem',
                borderRadius: '100px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
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
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)'
              }}
            >
              See All Services
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .about-intro-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </section>
  )
}
