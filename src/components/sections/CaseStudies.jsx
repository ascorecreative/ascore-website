import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { ExternalLink, ArrowUpRight } from 'lucide-react'
import { CLIENT_WORKS } from '@/constants/data'

gsap.registerPlugin(ScrollTrigger)

const CATEGORIES = ['All', 'E-Commerce', 'Healthcare', 'Corporate & Real Estate', 'Services']

export default function CaseStudies() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [isWhiteBg, setIsWhiteBg] = useState(false)
  const sectionRef = useRef()
  const gridRef = useRef()

  const filteredWorks = activeCategory === 'All'
    ? CLIENT_WORKS
    : CLIENT_WORKS.filter(item => item.category.toLowerCase().includes(activeCategory.toLowerCase().split(' ')[0]))

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Reveal Animation
      gsap.fromTo('.work-reveal',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          }
        }
      )

      // Background Color Scroll-Driven Transition Trigger
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
      id="work"
      ref={sectionRef}
      className="section-gap"
      style={{
        background: isWhiteBg ? '#ffffff' : '#04030a',
        transition: 'background 0.8s cubic-bezier(0.16, 1, 0.3, 1), color 0.8s ease',
        position: 'relative',
        zIndex: 10,
        fontFamily: 'Jost, sans-serif',
      }}
    >
      <div className="site-container">

        {/* Section Header */}
        <div
          className="work-reveal"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            marginBottom: '3.5rem',
          }}
        >
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
                transition: 'all 0.5s ease',
              }}
            >
              Our Track Record
            </span>

            <h2
              className="section-title"
              style={{
                marginTop: '1rem',
                color: isWhiteBg ? '#0f172a' : '#ffffff',
                transition: 'color 0.5s ease',
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(2.4rem, 4.8vw, 4.8rem)',
                fontWeight: 300,
                lineHeight: 1.08,
              }}
            >
              Finished Works &{' '}
              <span
                style={{
                  fontFamily: 'Jost, sans-serif',
                  background: isWhiteBg
                    ? 'linear-gradient(135deg, #7209B7 0%, #0077FF 100%)'
                    : 'linear-gradient(135deg, #00F5D4 0%, #0077FF 50%, #9D4EDD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 600,
                  fontStyle: 'italic',
                  transition: 'all 0.5s ease',
                }}
              >
                Case Studies
              </span>
            </h2>
          </div>

          <p
            className="body-text"
            style={{
              maxWidth: '640px',
              color: isWhiteBg ? '#475569' : 'rgba(255, 255, 255, 0.75)',
              transition: 'color 0.5s ease',
              fontSize: '1.0625rem',
              lineHeight: '1.7',
            }}
          >
            Explore 19 of our high-impact client platforms — delivered for market leaders across the UAE and internationally.
          </p>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '1rem',
            }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: isSelected
                      ? isWhiteBg
                        ? 'linear-gradient(135deg, #7209B7 0%, #0077FF 100%)'
                        : '#00F5D4'
                      : isWhiteBg
                        ? '#f1f5f9'
                        : 'rgba(255,255,255,0.05)',
                    color: isSelected
                      ? isWhiteBg
                        ? '#ffffff'
                        : '#000000'
                      : isWhiteBg
                        ? '#334155'
                        : 'rgba(255,255,255,0.7)',
                    border: isSelected
                      ? 'none'
                      : isWhiteBg
                        ? '1px solid #cbd5e1'
                        : '1px solid rgba(255,255,255,0.1)',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '100px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.35s ease',
                    boxShadow: isSelected
                      ? isWhiteBg
                        ? '0 4px 15px rgba(114, 9, 183, 0.35)'
                        : '0 4px 15px rgba(0, 245, 212, 0.4)'
                      : 'none',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Works Grid */}
        <div ref={gridRef} className="grid-3">
          {filteredWorks.map((work) => (
            <a
              key={work.id}
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              className="client-card work-reveal"
              style={{
                background: isWhiteBg ? '#ffffff' : 'rgba(15, 12, 35, 0.65)',
                border: isWhiteBg ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(157, 78, 221, 0.22)',
                boxShadow: isWhiteBg
                  ? '0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)'
                  : '0 15px 35px rgba(0, 0, 0, 0.4)',
                borderRadius: '20px',
                padding: '2rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (isWhiteBg) {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 20px 45px rgba(114, 9, 183, 0.15), 0 0 25px rgba(0, 119, 255, 0.12)'
                  e.currentTarget.style.borderColor = 'rgba(114, 9, 183, 0.3)'
                } else {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(114, 9, 183, 0.25), 0 0 25px rgba(0, 245, 212, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                if (isWhiteBg) {
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)'
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
                } else {
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4)'
                  e.currentTarget.style.borderColor = 'rgba(157, 78, 221, 0.22)'
                }
              }}
            >
              {/* Top Meta */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: work.color,
                      background: `${work.color}15`,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '100px',
                      border: `1px solid ${work.color}35`,
                    }}
                  >
                    {work.category}
                  </span>

                  <span
                    style={{
                      color: isWhiteBg ? '#64748b' : 'rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'color 0.4s ease',
                    }}
                  >
                    Visit <ArrowUpRight size={14} />
                  </span>
                </div>

                {/* Title & Description */}
                <h3
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 600,
                    color: isWhiteBg ? '#0f172a' : '#ffffff',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.02em',
                    fontFamily: 'Jost, sans-serif',
                    transition: 'color 0.4s ease',
                  }}
                >
                  {work.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: isWhiteBg ? '#475569' : 'rgba(255,255,255,0.55)',
                    lineHeight: '1.6',
                    marginBottom: '1.5rem',
                    fontFamily: 'Jost, sans-serif',
                    transition: 'color 0.4s ease',
                  }}
                >
                  {work.description}
                </p>
              </div>

              {/* Bottom Metric Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '1rem',
                  borderTop: isWhiteBg ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'border-color 0.4s ease',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: isWhiteBg ? '#0f172a' : '#ffffff',
                      letterSpacing: '-0.02em',
                      fontFamily: 'Jost, sans-serif',
                      transition: 'color 0.4s ease',
                    }}
                  >
                    {work.metrics.value}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: isWhiteBg ? '#64748b' : 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'Jost, sans-serif',
                      transition: 'color 0.4s ease',
                    }}
                  >
                    {work.metrics.label}
                  </span>
                </div>

                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isWhiteBg ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isWhiteBg ? '#0f172a' : '#ffffff',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ExternalLink size={14} />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Bottom CTA Bar */}
        <div
          className="work-reveal"
          style={{
            marginTop: '4.5rem',
            textAlign: 'center',
            padding: '3.5rem 2rem',
            background: isWhiteBg
              ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
              : 'rgba(15, 12, 35, 0.65)',
            border: isWhiteBg ? '1px solid rgba(114, 9, 183, 0.2)' : '1px solid rgba(157, 78, 221, 0.25)',
            borderRadius: '24px',
            boxShadow: isWhiteBg ? '0 15px 40px rgba(0, 0, 0, 0.05)' : 'none',
            transition: 'all 0.5s ease',
          }}
        >
          <h3
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(1.5rem, 3vw, 2.4rem)',
              fontWeight: 500,
              color: isWhiteBg ? '#0f172a' : '#ffffff',
              marginBottom: '1rem',
              transition: 'color 0.5s ease',
            }}
          >
            Have a project in mind for your brand?
          </h3>
          <p
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '1rem',
              color: isWhiteBg ? '#475569' : 'rgba(255, 255, 255, 0.7)',
              maxWidth: '500px',
              margin: '0 auto 2rem',
              transition: 'color 0.5s ease',
            }}
          >
            Let's discuss how Ascore Creative can engineer your next digital breakthrough.
          </p>
          <a
            href="#contact"
            style={{
              fontFamily: 'Jost, sans-serif',
              background: isWhiteBg
                ? 'linear-gradient(135deg, #7209B7 0%, #0077FF 100%)'
                : 'linear-gradient(135deg, #00F5D4 0%, #0077FF 100%)',
              color: isWhiteBg ? '#ffffff' : '#000000',
              fontSize: '0.9375rem',
              fontWeight: 700,
              padding: '0.85rem 2rem',
              borderRadius: '100px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: isWhiteBg
                ? '0 6px 25px rgba(114, 9, 183, 0.35)'
                : '0 4px 20px rgba(0, 245, 212, 0.45)',
              transition: 'all 0.35s ease',
            }}
            onClick={(e) => {
              e.preventDefault()
              document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Start Your Project
            <ArrowUpRight size={18} />
          </a>
        </div>

      </div>
    </section>
  )
}
