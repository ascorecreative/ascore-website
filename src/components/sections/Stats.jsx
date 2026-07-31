import { STATS } from '@/constants/data'

export default function Stats() {
  return (
    <section
      style={{
        background: '#04030a',
        padding: '5rem 0',
        position: 'relative',
        zIndex: 10,
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                transition: 'all 0.35s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 248, 37, 0.35)'
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: 'clamp(2.8rem, 4.5vw, 4.5rem)',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #8bf825 0%, #00F5D4 100%)',
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
