import { useState, useEffect, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'

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

// 6 Cards Data for Auto-Sliding 3D Stack
const HERO_CARDS = [
  {
    id: 1,
    title: 'Mobile App UI/UX Showcase',
    category: 'iOS & Android Apps',
    img: '/cards/card-1-app.png',
    badge: 'Mobile App',
  },
  {
    id: 2,
    title: 'Enterprise SaaS Analytics',
    category: 'Dashboard & Web App',
    img: '/cards/card-2-saas.png',
    badge: 'SaaS Platform',
  },
  {
    id: 3,
    title: '3D Spatial Product Gallery',
    category: 'Three.js & WebGL',
    img: '/cards/card-3-3dweb.png',
    badge: '3D Interactive',
  },
  {
    id: 4,
    title: 'Luxury Spatial Branding',
    category: 'Brand Identity',
    img: '/cards/card-4-branding.png',
    badge: 'Product Branding',
  },
  {
    id: 5,
    title: 'AI Workflow Automation',
    category: 'Generative AI Platform',
    img: '/cards/card-5-ai.png',
    badge: 'AI & Automation',
  },
  {
    id: 6,
    title: 'High-Conversion E-Commerce',
    category: 'Shopify & Payment Portal',
    img: '/cards/card-6-ecommerce.png',
    badge: 'E-Commerce',
  },
]

const MOCKUP_CARDS = [
  '/cards/card-1-app.png',
  '/cards/card-2-saas.png',
  '/cards/card-3-3dweb.png',
  '/cards/card-4-branding.png',
]

export default function Hero() {
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const videoWrapperRef = useRef(null)
  const videoRef = useRef(null)
  const gapRef = useRef(null)
  const desktopVideoRef = useRef(null)
  const mobileVideoRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0) // Used for overlay badges/glow opacity if needed

  // Auto slide cards every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % HERO_CARDS.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  // Auto play videos
  useEffect(() => {
    desktopVideoRef.current?.play().catch(() => {})
    mobileVideoRef.current?.play().catch(() => {})
  }, [])

  // Handle scroll-driven video zoom effect (framing -> fullscreen -> morphing into text gap)
  useEffect(() => {
    const handleScroll = () => {
      if (!videoWrapperRef.current || !videoRef.current) return
      const rect = videoWrapperRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      const elementCenter = rect.top + rect.height / 2
      const screenCenter = windowHeight / 2
      const maxDistance = windowHeight * 0.7
      const distance = Math.abs(elementCenter - screenCenter)

      // 1. Calculate expansion progress with a plateau region where it stays at 1.0 (fullscreen)
      const plateau = 180 // px threshold to hold the fullscreen state
      const isMobileScreen = window.innerWidth <= 991
      let expansion = 1
      if (distance > plateau) {
        if (isMobileScreen && elementCenter < screenCenter) {
          // On mobile, once it expands to full screen, keep it at 1.0 (do not shrink back down)
          expansion = 1.0
        } else {
          expansion = 1 - (distance - plateau) / (maxDistance - plateau)
        }
      }
      expansion = Math.max(0, Math.min(1, expansion))

      // Update state for simple overlays
      setScrollProgress(expansion)

      // 2. Calculate morph progress (0 to 1 as we scroll past the video wrapper)
      // Morph starts only after the video center scrolls past the screen center and goes beyond the plateau
      let morphProgress = 0
      const morphStart = screenCenter - plateau
      const morphEnd = screenCenter - 650 // morph fully completed at 650px past center
      if (!isMobileScreen && elementCenter < morphStart && gapRef.current) {
        const rawProgress = Math.max(0, Math.min(1, (elementCenter - morphStart) / (morphEnd - morphStart)))
        
        // Quadratic ease-out curve to make the initial morph transition extremely gentle
        morphProgress = rawProgress * (2 - rawProgress)
      }

      // 3. Direct DOM styling for maximum 60fps smoothness
      const videoEl = videoRef.current

      if (morphProgress > 0 && gapRef.current) {
        const gapRect = gapRef.current.getBoundingClientRect()
        const videoRect = videoWrapperRef.current.getBoundingClientRect()

        // Calculate translation needed to align centers
        const targetX = gapRect.left + gapRect.width / 2 - (videoRect.left + videoRect.width / 2)
        const targetY = gapRect.top + gapRect.height / 2 - (videoRect.top + videoRect.height / 2)

        // Calculate scale factor from expanded fullscreen size to small text gap size
        const currentWidth = videoRect.width
        const targetWidth = gapRect.width || 130
        const scaleFactor = targetWidth / currentWidth

        videoEl.style.transform = `translate(${targetX}px, ${targetY}px) scale(${1 - (1 - scaleFactor) * morphProgress})`
        videoEl.style.borderRadius = `${morphProgress * 12}px`
        videoEl.style.border = 'none'
        videoEl.style.width = '100%'
        videoEl.style.maxWidth = '100%'
        videoEl.style.height = '85vh'
        videoEl.style.zIndex = '99'
      } else {
        // Normal expand / shrink scroll effect
        videoEl.style.transform = 'none'
        videoEl.style.borderRadius = `${28 - expansion * 28}px`
        videoEl.style.border = expansion >= 0.95 ? 'none' : `${1.5 - expansion * 1.5}px solid rgba(255, 255, 255, ${0.2 - expansion * 0.2})`
        videoEl.style.width = expansion >= 0.95 ? '100%' : `${85 + expansion * 15}%`
        videoEl.style.maxWidth = expansion >= 0.95 ? '100%' : `${960 + expansion * 260}px`
        videoEl.style.height = expansion >= 0.95 ? '85vh' : `${480 + expansion * 200}px`
        videoEl.style.zIndex = '5'
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  return (
    <>
      <CustomCursor />

      <section
        id="home"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          background: '#04030a',
          color: '#ffffff',
          paddingTop: '10.5rem',
          paddingBottom: '3rem',
          overflow: 'visible',
          zIndex: 20,
          fontFamily: 'Jost, sans-serif',
        }}
      >
        {/* Subtle Top Ambient Gradient */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100vw',
            height: '500px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div className="site-container">
          {/* Main Hero Header Layout */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '1100px',
              margin: '0 auto',
              position: 'relative',
              zIndex: 5,
            }}
          >
            {/* Title & Floating 3D Cards Stack Container */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                marginBottom: '2.5rem',
              }}
            >
              {/* Hero Main Headline */}
              <h1
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: 'clamp(2.8rem, 6.5vw, 5.8rem)',
                  fontWeight: 600,
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                  margin: '0 auto',
                  maxWidth: '1100px',
                  position: 'relative',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 300,
                    marginRight: '0.35rem',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    color: '#ffffff',
                  }}
                >
                  UI UX
                </span>
                <span className="hero-title-line">
                  Design<span className="hero-gap-spacer" />&
                </span>
                <br />
                <span className="hero-title-line">
                  Web Development<span className="hero-gap-spacer" />&nbsp;Agency
                </span>
              </h1>

              {/* Floating 3D Auto-Sliding Cards Showcase (Positioned overlapping headline like sixeight) */}
              <div
                className="hero-cards-floating-container"
                style={{
                  position: 'absolute',
                  top: '-5%',
                  left: '71.5%',
                  transform: 'translateX(-50%)',
                  width: '165px',
                  height: '225px',
                  perspective: '1000px',
                  zIndex: 2,
                  pointerEvents: 'auto',
                }}
              >
                {HERO_CARDS.map((card, idx) => {
                  const isCurrent = idx === activeCardIndex
                  const isNext = idx === (activeCardIndex + 1) % HERO_CARDS.length
                  const isPrev = idx === (activeCardIndex - 1 + HERO_CARDS.length) % HERO_CARDS.length

                  let transform = 'rotateY(15deg) rotateX(5deg) rotate(-5deg) translateZ(-100px) scale(0.8)'
                  let opacity = 0
                  let zIndex = 1

                  if (isCurrent) {
                    transform = 'rotateY(-6deg) rotateX(4deg) rotate(-8deg) translateZ(40px) scale(1)'
                    opacity = 1
                    zIndex = 5
                  } else if (isNext) {
                    transform = 'translateX(20px) translateY(-14px) rotateY(-2deg) rotateX(2deg) rotate(8deg) translateZ(-20px) scale(0.92)'
                    opacity = 0.8
                    zIndex = 4
                  } else if (isPrev) {
                    transform = 'translateX(-16px) translateY(12px) rotateY(-12deg) rotateX(6deg) rotate(-16deg) translateZ(-50px) scale(0.88)'
                    opacity = 0.4
                    zIndex = 3
                  }

                  return (
                    <div
                      key={card.id}
                      onClick={() => setActiveCardIndex(idx)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '16px',
                        background: 'rgba(20, 16, 40, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: isCurrent ? '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 255, 255, 0.05)' : '0 10px 25px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform,
                        opacity,
                        zIndex,
                        padding: '0',
                      }}
                    >
                      <img
                        src={card.img}
                        alt={card.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '16px',
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hero Subtitle Description */}
            <p
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
                lineHeight: 1.65,
                color: 'rgba(255, 255, 255, 0.75)',
                maxWidth: '780px',
                margin: '0 auto 2.5rem auto',
                fontWeight: 400,
              }}
            >
              We design high-performing websites, mobile apps, and SaaS platforms that delight users. And we build websites that turn those experiences into results. Enhance your brand, drive sales, and grow your revenue with us.
            </p>

            {/* Hero Action Button & Tech Stack Badge Icons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap',
                marginBottom: '4.5rem',
              }}
            >
              {/* Lime Green "Book a Call" Pill Button */}
              <button
                onClick={() => {
                  document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: '#8bf825',
                  color: '#04030a',
                  fontSize: '1rem',
                  fontWeight: 700,
                  padding: '0.9rem 2.2rem',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.35s ease',
                  boxShadow: '0 8px 30px rgba(139, 248, 37, 0.45)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 14px 40px rgba(139, 248, 37, 0.65)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(139, 248, 37, 0.45)'
                }}
              >
                Book a Call
              </button>

              {/* Technology Badges Circle Icons (Figma, Webflow, Shopify, WordPress) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '100px',
                  padding: '6px 12px',
                }}
              >
                {/* Figma Icon */}
                <div
                  title="Figma UI/UX"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#1e1e1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 38 57" fill="none">
                    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38H19V28.5Z" fill="#0ACF83"/>
                    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                  </svg>
                </div>

                {/* Webflow Icon */}
                <div
                  title="Webflow & Custom Code"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#146ef5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  W
                </div>

                {/* Shopify Icon */}
                <div
                  title="Shopify E-Commerce"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#95bf47',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  S
                </div>

                {/* WordPress / React Icon */}
                <div
                  title="WordPress & React"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#21759b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Centralized Video Container (Expand to Fullscreen on Scroll & Shrink Back) */}
        <div
          ref={videoWrapperRef}
          style={{
            position: 'relative',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
            paddingTop: '2rem',
            paddingBottom: '3rem',
            overflow: 'visible',
          }}
        >
          <div
            ref={videoRef}
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '960px',
              height: '480px',
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: `0 20px 40px rgba(0, 0, 0, 0.8)`,
              border: `1.5px solid rgba(255, 255, 255, 0.2)`,
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.3s cubic-bezier(0.16, 1, 0.3, 1), border 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              background: '#04030a',
            }}
          >
              {/* Desktop Video Element */}
              <video
                ref={desktopVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="hero-video-desktop"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  transition: 'transform 0.5s ease',
                  transform: `scale(${1.1 - scrollProgress * 0.1})`,
                }}
              >
                <source src="/hero-video.mp4" type="video/mp4" />
              </video>

              {/* Mobile Video Element */}
              <video
                ref={mobileVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="hero-video-mobile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  transition: 'transform 0.5s ease',
                  transform: `scale(${1.1 - scrollProgress * 0.1})`,
                }}
              >
                <source src="/hero-video-mobile.mp4" type="video/mp4" />
              </video>

              {/* Subtle Ambient Video Glow Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'radial-gradient(circle at center, transparent 40%, rgba(4, 3, 10, 0.4) 100%)',
                }}
              />

              {/* Badge Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.5rem',
                  left: '1.5rem',
                  background: 'rgba(4, 3, 10, 0.8)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '100px',
                  padding: '0.45rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 5,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#8bf825',
                    boxShadow: '0 0 10px #8bf825',
                  }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>
                  Ascore Spatial Showcase 2026
                </span>
              </div>
            </div>
          </div>

        {/* Services Intro Section — Matches sixeight exactly */}
        <div
          style={{
            background: '#04030a',
            padding: '6rem 0 4rem',
            position: 'relative',
            fontFamily: 'Jost, sans-serif',
            color: '#fff',
            width: '100%',
          }}
        >
          <div className="site-container">
            <div
              style={{
                display: 'grid',
                alignItems: 'center',
              }}
              className="about-intro-grid"
            >
              {/* Left Column: Heading with gap container for the video */}
              <div>
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

                <h2
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: 'clamp(2rem, 4vw, 3.6rem)',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  We help you{' '}
                  <span
                    ref={gapRef}
                    className="services-intro-gap"
                  />
                  design<br />
                  and build better digital<br />
                  products. All in ONE place!
                </h2>
              </div>

              {/* Right Column: Info & Button */}
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
        </div>
      </section>

      <style>{`
        @media (min-width: 992px) {
          .hero-video-desktop {
            display: block !important;
          }
          .hero-video-mobile {
            display: none !important;
          }
          .about-intro-grid {
            grid-template-columns: 1.2fr 0.8fr;
            gap: 4rem;
          }
          .hero-title-line {
            white-space: nowrap;
          }
          .hero-gap-spacer {
            display: inline-block;
            width: 140px;
          }
          .services-intro-gap {
            display: inline-block;
            width: 130px;
            height: 80px;
            vertical-align: middle;
            margin: 0 10px;
            border-radius: 12px;
          }
        }
        @media (max-width: 991px) {
          .hero-video-desktop {
            display: none !important;
          }
          .hero-video-mobile {
            display: block !important;
          }
          .hero-cards-floating-container {
            display: none !important;
          }
          .about-intro-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .hero-title-line {
            white-space: normal !important;
          }
          .hero-gap-spacer {
            display: none !important;
          }
          .services-intro-gap {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

