import { useState } from 'react'
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { TESTIMONIALS } from '@/constants/data'

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)

  const current = TESTIMONIALS[activeIndex] || TESTIMONIALS[0]

  return (
    <section
      id="testimonials"
      style={{
        background: 'linear-gradient(180deg, #04030a 0%, #09071c 50%, #04030a 100%)',
        padding: '6rem 0',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
      }}
    >
      <div className="site-container">
        {/* Badge & Title */}
        <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
          <span
            className="label-text"
            style={{
              background: 'rgba(157, 78, 221, 0.15)',
              border: '1px solid rgba(157, 78, 221, 0.35)',
              padding: '0.4rem 1.25rem',
              borderRadius: '100px',
              color: '#00F5D4',
              fontFamily: 'Jost, sans-serif',
            }}
          >
            Client Stories
          </span>
          <h2
            className="section-title"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(2.4rem, 4.8vw, 4.5rem)',
              fontWeight: 300,
              marginTop: '1rem',
            }}
          >
            What Our Clients{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
              }}
            >
              Say
            </span>
          </h2>
        </div>

        {/* Liquid Glass Testimonial Card */}
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            background: 'rgba(15, 12, 35, 0.75)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(157, 78, 221, 0.3)',
            borderRadius: '24px',
            padding: '3.5rem 3rem',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(114, 9, 183, 0.2)',
          }}
          className="testimonial-card-box"
        >
          {/* Quote Icon */}
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(0, 245, 212, 0.12)',
              border: '1px solid rgba(0, 245, 212, 0.4)',
              color: '#00F5D4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2rem',
            }}
          >
            <Quote size={24} />
          </div>

          {/* Stars */}
          <div style={{ display: 'flex', gap: '4px', color: '#00F5D4', marginBottom: '1.25rem' }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={18} fill="#00F5D4" />
            ))}
          </div>

          {/* Quote Text */}
          <p
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(1.2rem, 2.4vw, 1.6rem)',
              fontWeight: 300,
              color: '#fff',
              lineHeight: '1.6',
              marginBottom: '2.5rem',
              fontStyle: 'italic',
            }}
          >
            "{current.quote}"
          </p>

          {/* Author Details & Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(157, 78, 221, 0.2)',
              paddingTop: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>
                {current.name}
              </h4>
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: '#00F5D4', fontWeight: 500 }}>
                {current.role} • {current.company}
              </span>
            </div>

            {/* Next / Previous Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setActiveIndex((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1))}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(157, 78, 221, 0.3)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00F5D4'
                  e.currentTarget.style.color = '#00F5D4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(157, 78, 221, 0.3)'
                  e.currentTarget.style.color = '#fff'
                }}
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={() => setActiveIndex((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1))}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(157, 78, 221, 0.3)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00F5D4'
                  e.currentTarget.style.color = '#00F5D4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(157, 78, 221, 0.3)'
                  e.currentTarget.style.color = '#fff'
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .testimonial-card-box {
            padding: 2rem 1.5rem !important;
          }
        }
      `}</style>
    </section>
  )
}
