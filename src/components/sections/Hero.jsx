import { useEffect, useRef } from 'react'

// Custom cursor (Desktop only)
function CustomCursor() {
  const cursorRef = useRef()

  useEffect(() => {
    const cursor = cursorRef.current
    let mouseX = 0, mouseY = 0
    let curX = 0, curY = 0

    const move = (e) => { mouseX = e.clientX; mouseY = e.clientY }
    window.addEventListener('mousemove', move)

    const raf = () => {
      curX += (mouseX - curX) * 0.12
      curY += (mouseY - curY) * 0.12
      if (cursor) cursor.style.transform = `translate(${curX - 5}px, ${curY - 5}px)`
      requestAnimationFrame(raf)
    }
    raf()

    const addHover = () => cursor?.classList.add('hovering')
    const removeHover = () => cursor?.classList.remove('hovering')
    const els = document.querySelectorAll('a, button, [role="button"], .service-row, .client-card')
    els.forEach(el => {
      el.addEventListener('mouseenter', addHover)
      el.addEventListener('mouseleave', removeHover)
    })

    return () => {
      window.removeEventListener('mousemove', move)
    }
  }, [])

  return <div id="custom-cursor" ref={cursorRef} className="hidden-mobile" />
}

export default function Hero() {
  const desktopVideoRef = useRef()
  const mobileVideoRef = useRef()

  // Instant Autoplay Trigger
  useEffect(() => {
    if (desktopVideoRef.current) {
      desktopVideoRef.current.play().catch(() => {})
    }
    if (mobileVideoRef.current) {
      mobileVideoRef.current.play().catch(() => {})
    }
  }, [])

  return (
    <>
      <CustomCursor />
      {/* 100% Fullscreen Responsive Video Hero Section */}
      <section
        id="home"
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          margin: 0,
          padding: 0,
          background: '#04030a',
          fontFamily: 'Jost, sans-serif',
        }}
      >
        {/* Desktop Video Element (Rendered in initial DOM for instant playback) */}
        <video
          ref={desktopVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="hero-video-desktop"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            objectPosition: 'center 55%',
            transform: 'scale(1.22)',
            transformOrigin: 'center center',
          }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Mobile Optimized Video Element (Rendered in initial DOM for instant playback) */}
        <video
          ref={mobileVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="hero-video-mobile"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            objectPosition: 'center center',
          }}
        >
          <source src="/hero-video-mobile.mp4" type="video/mp4" />
        </video>

        {/* Minimal Bottom Vignette for Smooth Transition to Next Section */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(to bottom, transparent 0%, transparent 75%, #04030a 100%)',
          }}
        />

        {/* Animated Scroll Indicator at Bottom Center */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            cursor: 'pointer',
            opacity: 0.85,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'Jost, sans-serif',
          }}
          onClick={() => {
            document.querySelector('#ai-feature')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            Scroll Down
          </span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="white" strokeWidth="1"/>
            <circle cx="8" cy="8" r="2" fill="#00F5D4">
              <animateTransform attributeName="transform" type="translate" values="0 0;0 6;0 0" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </section>

      <style>{`
        @media (min-width: 769px) {
          .hero-video-desktop {
            display: block !important;
          }
          .hero-video-mobile {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .hero-video-desktop {
            display: none !important;
          }
          .hero-video-mobile {
            display: block !important;
          }
        }
      `}</style>
    </>
  )
}
