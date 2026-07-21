import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import vertexShader from '@/shaders/iridescent.vert'
import fragmentShader from '@/shaders/iridescent.frag'

gsap.registerPlugin(ScrollTrigger)

// Shiny 3D Liquid Morphing Bubble (Responsive size for Mobile & Desktop)
function InteractiveBubble3D({ mousePos, isMobile }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { camera } = useThree()

  const currentRotation = useRef({ x: 0, y: 0 })

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDistortion: { value: 0.5 },
    uCameraPosition: { value: camera.position.clone() },
  }), [camera.position])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t
      materialRef.current.uniforms.uCameraPosition.value.copy(camera.position)
      const dist = 0.45 + Math.abs(mousePos.current.x) * 0.25 + Math.abs(mousePos.current.y) * 0.25
      materialRef.current.uniforms.uDistortion.value += (dist - materialRef.current.uniforms.uDistortion.value) * 0.08
    }

    const targetX = -mousePos.current.y * 0.85
    const targetY = mousePos.current.x * 1.1

    currentRotation.current.x += (targetX - currentRotation.current.x) * 0.08
    currentRotation.current.y += (targetY - currentRotation.current.y) * 0.08

    if (meshRef.current) {
      meshRef.current.rotation.x = currentRotation.current.x
      meshRef.current.rotation.y = t * 0.25 + currentRotation.current.y
      meshRef.current.position.y = Math.sin(t * 0.5) * 0.1
    }
  })

  // Radius 1.25 on Mobile to prevent clipping; 1.85 on Desktop
  const radius = isMobile ? 1.25 : 1.85

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <icosahedronGeometry args={[radius, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default function AIFeatureSection() {
  const sectionRef = useRef()
  const mousePos = useRef({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.wac-reveal',
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          }
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const handleMouseMove = (e) => {
    if (!sectionRef.current) return
    const rect = sectionRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height * 2 - 1)
    mousePos.current = { x, y }
  }

  return (
    <section
      id="ai-feature"
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '90vh',
        background: 'radial-gradient(circle at 50% 50%, #0a081d 0%, #04030a 70%, #020206 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: isMobile ? '6.5rem 1.25rem 4rem' : '5rem 1.5rem',
        fontFamily: 'Jost, sans-serif',
      }}
    >
      {/* Real Shiny 3D Interactive Canvas (Unclipped on Mobile) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'auto',
        }}
      >
        <Canvas
          camera={{ position: [0, 0, isMobile ? 5.5 : 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.6} color="#00F5D4" />
          <pointLight position={[-5, -3, -5]} intensity={2.2} color="#9D4EDD" />
          <pointLight position={[0, 4, 3]} intensity={2.5} color="#0077FF" />

          <Suspense fallback={null}>
            <InteractiveBubble3D mousePos={mousePos} isMobile={isMobile} />
          </Suspense>
        </Canvas>
      </div>

      {/* Perfectly Aligned Content Overlay */}
      <div
        className="site-container"
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '720px',
          fontFamily: 'Jost, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <h2
          className="wac-reveal"
          style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: 'clamp(2.2rem, 5.2vw, 4.8rem)',
            fontWeight: 300,
            lineHeight: '1.12',
            letterSpacing: '-0.025em',
            color: '#fff',
            marginBottom: '1.25rem',
            textShadow: '0 4px 30px rgba(0,0,0,0.85)',
          }}
        >
          Unlock The<br />
          Power of{' '}
          <span
            style={{
              fontFamily: 'Jost, sans-serif',
              background: 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600,
            }}
          >
            Gen AI
          </span>
        </h2>

        <p
          className="wac-reveal"
          style={{
            fontFamily: 'Jost, sans-serif',
            maxWidth: '540px',
            margin: '0 auto 2.25rem',
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: '1.65',
            fontWeight: 300,
            textShadow: '0 2px 10px rgba(0,0,0,0.9)',
          }}
        >
          Today’s businesses need more than just digital tools—they need clear strategic direction, backed by deep customer insight.
        </p>

        <div className="wac-reveal" style={{ pointerEvents: 'auto' }}>
          <a
            href="https://wa.me/971568555626"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'Jost, sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(10, 8, 25, 0.8)',
              border: '1px solid rgba(0, 245, 212, 0.45)',
              color: '#fff',
              padding: '0.8rem 1.85rem',
              borderRadius: '100px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.03em',
              transition: 'all 0.35s ease',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 245, 212, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00F5D4'
              e.currentTarget.style.background = '#00F5D4'
              e.currentTarget.style.color = '#000'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 245, 212, 0.7)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.45)'
              e.currentTarget.style.background = 'rgba(10, 8, 25, 0.8)'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 245, 212, 0.2)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Start with Gen AI →
          </a>
        </div>
      </div>
    </section>
  )
}
