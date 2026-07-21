import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import MorphingSphere from '@/components/canvas/MorphingSphere'

const ABOUT_VALUES = [
  { num: '01', title: 'Tech Innovation', desc: 'Cutting-edge WebGL, React, and AI engineering that sets your brand apart.' },
  { num: '02', title: 'GCC Market Mastery', desc: 'Tailored for UAE consumer behavior, local payment gateways, and regional growth.' },
  { num: '03', title: 'Certified Compliance', desc: '100% FTA-compliant corporate tax filing, VAT structuring, and financial audits.' },
]

export default function About() {
  const sectionRef = useRef()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <section
      id="about"
      ref={sectionRef}
      style={{
        background: 'linear-gradient(180deg, #04030a 0%, #09071c 50%, #04030a 100%)',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
        overflow: 'hidden',
        paddingTop: isMobile ? '2rem' : '7rem',
        paddingBottom: isMobile ? '4rem' : '7rem',
      }}
    >
      <div className="site-container">
        {/* Top 2-Column Grid */}
        <div className="grid-2" style={{ alignItems: 'center', marginBottom: isMobile ? '3rem' : '6rem', gap: '3rem' }}>
          {/* Text Col */}
          <div>
            <span
              className="label-text"
              style={{
                background: 'rgba(157, 78, 221, 0.15)',
                border: '1px solid rgba(157, 78, 221, 0.35)',
                padding: '0.4rem 1.25rem',
                borderRadius: '100px',
                color: '#00F5D4',
                fontFamily: 'Jost, sans-serif',
                display: 'inline-block',
                marginBottom: '1rem',
              }}
            >
              WHO WE ARE
            </span>
            <h2
              className="section-title"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(2.5rem, 5vw, 5rem)',
                fontWeight: 300,
                marginTop: '0.5rem',
                marginBottom: '1.75rem',
                lineHeight: '1.15',
              }}
            >
              One Agency.{' '}
              <span
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 600,
                }}
              >
                Infinite Capability.
              </span>
            </h2>
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1.0625rem',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: '1.75',
                fontWeight: 300,
                marginBottom: '1.5rem',
              }}
            >
              Ascore Creative represents the fusion of digital growth and enterprise tax precision in the United Arab Emirates. We engineer ultra-high conversion web applications, scale digital presence, and manage corporate tax compliance for ambitious regional brands.
            </p>
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.65)',
                lineHeight: '1.7',
                fontWeight: 300,
              }}
            >
              Our multidisciplinary team bridges tech innovation with regulatory excellence—giving UAE businesses a unified partner for expansion.
            </p>
          </div>

          {/* Interactive 3D Morphing Graphic */}
          <div
            style={{
              height: isMobile ? '280px' : '420px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.6} color="#00F5D4" />
              <pointLight position={[-5, -3, -5]} intensity={2.0} color="#9D4EDD" />

              <Suspense fallback={null}>
                <MorphingSphere />
              </Suspense>
            </Canvas>
          </div>
        </div>

        {/* 3 Core Values Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '1.75rem',
          }}
        >
          {ABOUT_VALUES.map((val) => (
            <div
              key={val.title}
              style={{
                background: 'rgba(15, 12, 35, 0.55)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(157, 78, 221, 0.25)',
                borderRadius: '20px',
                padding: '2rem',
                transition: 'all 0.35s ease',
              }}
            >
              <div
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#00F5D4',
                  letterSpacing: '0.12em',
                  marginBottom: '1rem',
                }}
              >
                {val.num}
              </div>
              <h3
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '0.75rem',
                }}
              >
                {val.title}
              </h3>
              <p
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.9375rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.65',
                }}
              >
                {val.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
