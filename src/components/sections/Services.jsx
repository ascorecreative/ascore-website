import { useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ArrowUpRight, ChevronDown, CheckCircle2 } from 'lucide-react'
import { SERVICES } from '@/constants/data'

// 3D Floating & Moving Geometric Ascore Line Elements Background
function FloatingLines3D() {
  const groupRef = useRef()

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15 + pointer.x * 0.3
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.2 + pointer.y * 0.2
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.15
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const radius = 2.8 + (i % 2) * 0.6
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, Math.sin(angle) * (radius * 0.6), (i % 3) * 0.4 - 0.6]}
            rotation={[i * 0.5, i * 0.8, i * 0.2]}
          >
            <octahedronGeometry args={[0.6 + (i % 2) * 0.25, 1]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#00F5D4' : '#9D4EDD'}
              wireframe
              emissive={i % 2 === 0 ? '#00F5D4' : '#9D4EDD'}
              emissiveIntensity={0.5}
              transparent
              opacity={0.4}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default function Services() {
  const [activeService, setActiveService] = useState(0)
  const [expandedService, setExpandedService] = useState(0)

  return (
    <section
      id="services"
      style={{
        background: '#04030a',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
        paddingTop: '8.5rem',
        paddingBottom: '7.5rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 55 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} color="#00F5D4" />
          <pointLight position={[-5, -3, -5]} intensity={2.0} color="#9D4EDD" />

          <Suspense fallback={null}>
            <FloatingLines3D />
          </Suspense>
        </Canvas>
      </div>

      <div className="site-container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ marginBottom: '4.5rem' }}>
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
            Detailed Capabilities
          </span>
          <h2
            className="section-title"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(2.5rem, 5vw, 5rem)',
              fontWeight: 300,
              marginTop: '1.25rem',
            }}
          >
            Services Built for{' '}
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
              Impact
            </span>
          </h2>
        </div>

        {/* Detailed Interactive Services Accordion / Expanders */}
        <div style={{ borderTop: '1px solid rgba(157, 78, 221, 0.25)' }}>
          {SERVICES.map((srv, index) => {
            const isExpanded = expandedService === index
            return (
              <div
                key={srv.id}
                style={{
                  borderBottom: '1px solid rgba(157, 78, 221, 0.22)',
                  padding: '2rem 0',
                  transition: 'all 0.4s ease',
                  background: isExpanded ? 'rgba(15, 12, 35, 0.55)' : 'transparent',
                  borderRadius: isExpanded ? '16px' : '0',
                }}
                onMouseEnter={() => setActiveService(index)}
              >
                <div
                  onClick={() => setExpandedService(isExpanded ? null : index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '0 0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flex: 1 }}>
                    <span
                      style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: index === activeService ? '#00F5D4' : 'rgba(255, 255, 255, 0.4)',
                        width: '35px',
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {srv.number}
                    </span>

                    <div>
                      <span
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#9D4EDD',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: '0.3rem',
                        }}
                      >
                        {srv.category}
                      </span>
                      <h3
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)',
                          fontWeight: isExpanded || index === activeService ? 600 : 300,
                          color: isExpanded || index === activeService ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {srv.title}
                      </h3>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: isExpanded ? '#00F5D4' : 'rgba(255, 255, 255, 0.08)',
                        color: isExpanded ? '#000' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.35s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      }}
                    >
                      <ChevronDown size={20} />
                    </span>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '2rem 1rem 1rem 5rem',
                      marginTop: '1.25rem',
                      borderTop: '1px dashed rgba(157, 78, 221, 0.25)',
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr',
                      gap: '2.5rem',
                      animation: 'fadeIn 0.35s ease',
                    }}
                    className="service-expanded-grid"
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '1.0625rem',
                          color: 'rgba(255, 255, 255, 0.85)',
                          lineHeight: '1.7',
                          marginBottom: '1.75rem',
                        }}
                      >
                        {srv.description}
                      </p>

                      <a
                        href="https://wa.me/971568555626"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
                          color: '#000',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          padding: '0.65rem 1.4rem',
                          borderRadius: '100px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 18px rgba(0, 245, 212, 0.4)',
                        }}
                      >
                        Inquire About {srv.title}
                        <ArrowUpRight size={16} />
                      </a>
                    </div>

                    <div>
                      <h4
                        style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: '#00F5D4',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          marginBottom: '1rem',
                        }}
                      >
                        Key Deliverables & Scope
                      </h4>

                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {srv.deliverables.map((item) => (
                          <li
                            key={item}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontFamily: 'Jost, sans-serif',
                              fontSize: '0.9375rem',
                              color: 'rgba(255, 255, 255, 0.8)',
                            }}
                          >
                            <CheckCircle2 size={16} style={{ color: '#00F5D4', flexShrink: 0 }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .service-expanded-grid {
            grid-template-columns: 1fr !important;
            padding-left: 1rem !important;
          }
        }
      `}</style>
    </section>
  )
}
