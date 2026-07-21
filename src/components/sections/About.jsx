import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { ArrowUpRight, Cpu, ShieldCheck } from 'lucide-react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Floating 3D Ascore Emblem Texture Mesh
function Ascore3DEmblemMesh({ scrollFactor }) {
  const meshRef = useRef()
  const texture = useTexture('/ascore-emblem.png')

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    const spread = scrollFactor.current

    if (meshRef.current) {
      meshRef.current.rotation.y = pointer.x * 0.45 + Math.sin(t * 0.8) * 0.15
      meshRef.current.rotation.x = -pointer.y * 0.35 + Math.cos(t * 0.6) * 0.1
      meshRef.current.position.y = Math.sin(t * 0.9) * 0.1

      const scale = 1.35 + spread * 0.25
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[1.3, 1.3]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// Spreading Cyber Wireframe Cage (Sized & Scaled so it NEVER clips)
function WireframeCage3D({ activePillar, scrollFactor }) {
  const cageRef = useRef()

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    const spread = scrollFactor.current

    if (cageRef.current) {
      cageRef.current.rotation.x = pointer.y * 0.3 + t * 0.25
      cageRef.current.rotation.y = pointer.x * 0.4 + t * 0.3
      // Scaled comfortably so it never clips top, bottom, or sides
      const targetScale = 1.05 + spread * 0.35
      cageRef.current.scale.setScalar(targetScale)
    }
  })

  const cageColor = activePillar === 2 ? '#9D4EDD' : '#00F5D4'

  return (
    <mesh ref={cageRef} position={[0, 0, 0]}>
      <octahedronGeometry args={[1.15, 2]} />
      <meshStandardMaterial
        color={cageColor}
        wireframe
        emissive={cageColor}
        emissiveIntensity={0.65}
        roughness={0.2}
        metalness={0.8}
        transparent
        opacity={0.65}
      />
    </mesh>
  )
}

export default function About() {
  const sectionRef = useRef()
  const [activePillar, setActivePillar] = useState(1)
  const scrollFactor = useRef(0)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Reveal text animations
      gsap.fromTo('.about-reveal',
        { opacity: 0, y: 45 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          }
        }
      )

      // Spreading 3D scroll animation
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          scrollFactor.current = self.progress
        }
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="about"
      style={{
        background: 'linear-gradient(180deg, #04030a 0%, #09071c 50%, #04030a 100%)',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
        overflow: 'hidden',
        paddingTop: '12rem', // Generous clearance so headline is NEVER touched by floating header
        paddingBottom: '7rem',
      }}
    >
      <div className="site-container">
        {/* Badge */}
        <div className="about-reveal" style={{ marginBottom: '1.25rem' }}>
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
            Who We Are
          </span>
        </div>

        {/* Section Title — Clean Clearance */}
        <div className="about-reveal" style={{ marginBottom: '4rem' }}>
          <h2
            className="section-title"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(2.4rem, 5vw, 5rem)',
              fontWeight: 300,
              lineHeight: 1.1,
              maxWidth: '920px',
            }}
          >
            One Agency.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
              }}
            >
              Infinite
            </span>{' '}
            Capability.
          </h2>
        </div>

        {/* 3-Column Layout: Text Left, 3D Canvas Center, Pillars Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 1.3fr', gap: '2.5rem', alignItems: 'center' }} className="about-grid">
          {/* Left Text Column */}
          <div className="about-reveal">
            <p
              className="body-text"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1.125rem',
                lineHeight: '1.75',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '1.75rem',
              }}
            >
              Ascore Creative represents the fusion of digital growth and enterprise tax precision in the United Arab Emirates. We engineer ultra-high conversion web applications, scale digital presence, and navigate complex UAE corporate compliance.
            </p>
            <p
              className="body-text"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1rem',
                lineHeight: '1.7',
                color: 'rgba(255, 255, 255, 0.65)',
              }}
            >
              Whether launching an immersive 3D digital brand or optimizing corporate tax strategies in Dubai & Abu Dhabi, our dual-pillar methodology ensures maximum ROI.
            </p>
          </div>

          {/* Center Column: Unclipped 3D Canvas */}
          <div
            className="about-reveal hidden-mobile"
            style={{
              height: '460px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
              <ambientLight intensity={1.2} />
              <directionalLight position={[5, 5, 5]} intensity={2.2} color="#00F5D4" />
              <pointLight position={[-5, -3, -5]} intensity={2.5} color="#9D4EDD" />
              <pointLight position={[0, 4, 3]} intensity={2.0} color="#0077FF" />

              <Suspense fallback={null}>
                <Ascore3DEmblemMesh scrollFactor={scrollFactor} />
                <WireframeCage3D activePillar={activePillar} scrollFactor={scrollFactor} />
              </Suspense>
            </Canvas>
          </div>

          {/* Right Column: 3D Interactive Liquid Glass Pillars */}
          <div className="about-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Pillar 01 */}
            <div
              onMouseEnter={() => setActivePillar(1)}
              style={{
                background: activePillar === 1 ? 'rgba(15, 20, 45, 0.85)' : 'rgba(12, 10, 30, 0.6)',
                backdropFilter: 'blur(24px)',
                border: activePillar === 1 ? '1px solid #00F5D4' : '1px solid rgba(157, 78, 221, 0.25)',
                borderRadius: '20px',
                padding: '2rem',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: activePillar === 1 ? '0 20px 45px rgba(0, 245, 212, 0.25), 0 0 30px rgba(0, 245, 212, 0.2)' : '0 10px 30px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={20} style={{ color: '#00F5D4' }} />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8125rem', fontWeight: 700, color: '#00F5D4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    PILLAR 01
                  </span>
                </div>
                <ArrowUpRight size={18} style={{ color: '#00F5D4' }} />
              </div>
              <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.375rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>
                Digital Engineering & AI Growth
              </h3>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                Web applications, immersive 3D brand experiences, AI integration, and performance marketing designed to conquer competitive markets.
              </p>
            </div>

            {/* Pillar 02 */}
            <div
              onMouseEnter={() => setActivePillar(2)}
              style={{
                background: activePillar === 2 ? 'rgba(30, 15, 45, 0.85)' : 'rgba(12, 10, 30, 0.6)',
                backdropFilter: 'blur(24px)',
                border: activePillar === 2 ? '1px solid #9D4EDD' : '1px solid rgba(157, 78, 221, 0.25)',
                borderRadius: '20px',
                padding: '2rem',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: activePillar === 2 ? '0 20px 45px rgba(157, 78, 221, 0.3), 0 0 30px rgba(114, 9, 183, 0.25)' : '0 10px 30px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} style={{ color: '#9D4EDD' }} />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8125rem', fontWeight: 700, color: '#9D4EDD', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    PILLAR 02
                  </span>
                </div>
                <ArrowUpRight size={18} style={{ color: '#9D4EDD' }} />
              </div>
              <h3 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1.375rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>
                Corporate Tax & Compliance
              </h3>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                Certified UAE corporate tax filing, VAT structuring, financial auditing, and regulatory advisory for sustainable enterprise growth.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .about-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
