import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import MorphingSphere from '@/components/canvas/MorphingSphere'

gsap.registerPlugin(ScrollTrigger)

const ABOUT_VALUES = [
  { num: '01', title: 'Tech Innovation', desc: 'Cutting-edge WebGL, React, and AI engineering that sets your brand apart.' },
  { num: '02', title: 'GCC Market Mastery', desc: 'Tailored for UAE consumer behavior, local payment gateways, and regional growth.' },
  { num: '03', title: 'Certified Compliance', desc: '100% FTA-compliant corporate tax filing, VAT structuring, and financial audits.' },
]

export default function About() {
  const sectionRef = useRef()
  const [isMobile, setIsMobile] = useState(false)
  const [isWhiteBg, setIsWhiteBg] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Scroll-Driven Background Color Transition Trigger
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter: () => setIsWhiteBg(true),
        onLeave: () => setIsWhiteBg(false),
        onEnterBack: () => setIsWhiteBg(true),
        onLeaveBack: () => setIsWhiteBg(false),
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="about"
      ref={sectionRef}
      style={{
        background: isWhiteBg ? '#ffffff' : '#04030a',
        transition: 'background 0.8s cubic-bezier(0.16, 1, 0.3, 1), color 0.8s ease',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
        overflow: 'hidden',
        paddingTop: isMobile ? '3rem' : '7rem',
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
                background: isWhiteBg ? 'rgba(114, 9, 183, 0.08)' : 'rgba(157, 78, 221, 0.15)',
                border: isWhiteBg ? '1px solid rgba(114, 9, 183, 0.25)' : '1px solid rgba(157, 78, 221, 0.35)',
                padding: '0.4rem 1.25rem',
                borderRadius: '100px',
                color: isWhiteBg ? '#7209B7' : '#00F5D4',
                fontFamily: 'Jost, sans-serif',
                display: 'inline-block',
                marginBottom: '1rem',
                transition: 'all 0.5s ease',
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
                color: isWhiteBg ? '#0f172a' : '#ffffff',
                transition: 'color 0.5s ease',
              }}
            >
              One Agency.{' '}
              <span
                className={isWhiteBg ? 'text-gradient-purple' : 'text-gradient-cyan'}
                style={{
                  fontWeight: 600,
                  transition: 'all 0.5s ease',
                }}
              >
                Infinite Capability.
              </span>
            </h2>

            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1.0625rem',
                color: isWhiteBg ? '#334155' : 'rgba(255, 255, 255, 0.85)',
                lineHeight: '1.75',
                fontWeight: 300,
                marginBottom: '1.5rem',
                transition: 'color 0.5s ease',
              }}
            >
              Ascore Creative represents the fusion of digital growth and enterprise tax precision in the United Arab Emirates. We engineer ultra-high conversion web applications, scale digital presence, and manage corporate tax compliance for ambitious regional brands.
            </p>

            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1rem',
                color: isWhiteBg ? '#64748b' : 'rgba(255, 255, 255, 0.65)',
                lineHeight: '1.7',
                fontWeight: 300,
                transition: 'color 0.5s ease',
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
              <directionalLight position={[5, 5, 5]} intensity={1.6} color={isWhiteBg ? "#7209B7" : "#00F5D4"} />
              <pointLight position={[-5, -3, -5]} intensity={2.0} color={isWhiteBg ? "#0077FF" : "#9D4EDD"} />

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
                background: isWhiteBg ? '#ffffff' : 'rgba(15, 12, 35, 0.55)',
                backdropFilter: 'blur(20px)',
                border: isWhiteBg ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(157, 78, 221, 0.25)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: isWhiteBg
                  ? '0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)'
                  : 'none',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (isWhiteBg) {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 20px 45px rgba(114, 9, 183, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(114, 9, 183, 0.3)'
                } else {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                if (isWhiteBg) {
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)'
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
                } else {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = 'rgba(157, 78, 221, 0.25)'
                }
              }}
            >
              <div
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: isWhiteBg ? '#7209B7' : '#00F5D4',
                  letterSpacing: '0.12em',
                  marginBottom: '1rem',
                  transition: 'color 0.5s ease',
                }}
              >
                {val.num}
              </div>

              <h3
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: isWhiteBg ? '#0f172a' : '#ffffff',
                  marginBottom: '0.75rem',
                  transition: 'color 0.5s ease',
                }}
              >
                {val.title}
              </h3>

              <p
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.9375rem',
                  color: isWhiteBg ? '#475569' : 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.65',
                  transition: 'color 0.5s ease',
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
