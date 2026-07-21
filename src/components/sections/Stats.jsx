import { STATS } from '@/constants/data'

export default function Stats() {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #04030a 0%, #09071c 50%, #04030a 100%)',
        padding: '5rem 0',
        position: 'relative',
        zIndex: 10,
        borderTop: '1px solid rgba(157, 78, 221, 0.2)',
        borderBottom: '1px solid rgba(157, 78, 221, 0.2)',
        fontFamily: 'Jost, sans-serif',
      }}
    >
      <div className="site-container">
        <div className="grid-3" style={{ gap: '2rem' }}>
          {STATS.map((st) => (
            <div
              key={st.label}
              style={{
                background: 'rgba(15, 12, 35, 0.7)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(157, 78, 221, 0.25)',
                borderRadius: '20px',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                transition: 'all 0.35s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.5)'
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(114, 9, 183, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(157, 78, 221, 0.25)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: 'clamp(2.8rem, 4.5vw, 4.5rem)',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1,
                  marginBottom: '0.85rem',
                }}
              >
                {st.number}
              </div>
              <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.125rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>
                {st.label}
              </h4>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
