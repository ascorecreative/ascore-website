import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { ExternalLink, ArrowUpRight } from 'lucide-react'
import { CLIENT_WORKS } from '@/constants/data'

gsap.registerPlugin(ScrollTrigger)

const CATEGORIES = ['All', 'E-Commerce', 'Healthcare', 'Corporate & Real Estate', 'Services']

export default function CaseStudies() {
  const [activeCategory, setActiveCategory] = useState('All')
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
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="work"
      ref={sectionRef}
      className="section-gap"
      style={{
        background: '#04030a',
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
                background: 'rgba(139, 248, 37, 0.08)',
                border: '1px solid rgba(139, 248, 37, 0.25)',
                padding: '0.4rem 1.25rem',
                borderRadius: '100px',
                color: '#8bf825',
                fontFamily: 'Jost, sans-serif',
                display: 'inline-block',
              }}
            >
              Our Track Record
            </span>

            <h2
              className="section-title"
              style={{
                marginTop: '1rem',
                color: '#ffffff',
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(2.4rem, 4.8vw, 4.8rem)',
                fontWeight: 300,
                lineHeight: 1.08,
              }}
            >
              Finished Works &{' '}
              <span
                className="text-gradient-cyan"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 600,
                  fontStyle: 'italic',
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
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '1.0625rem',
              lineHeight: '1.7',
            }}
          >
            Explore 600+ of our high-impact client platforms — delivered for market leaders across the UAE and internationally.
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
                    background: isSelected ? '#8bf825' : 'rgba(255,255,255,0.05)',
                    color: isSelected ? '#04030a' : 'rgba(255,255,255,0.7)',
                    border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '100px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.35s ease',
                    boxShadow: isSelected ? '0 4px 15px rgba(139, 248, 37, 0.3)' : 'none',
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
                background: 'rgba(15, 12, 35, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
                borderRadius: '20px',
                padding: '2rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 248, 37, 0.15)'
                e.currentTarget.style.borderColor = 'rgba(139, 248, 37, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
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
                      color: 'rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
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
                    color: '#ffffff',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.02em',
                    fontFamily: 'Jost, sans-serif',
                  }}
                >
                  {work.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: '1.6',
                    marginBottom: '1.5rem',
                    fontFamily: 'Jost, sans-serif',
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
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                      fontFamily: 'Jost, sans-serif',
                    }}
                  >
                    {work.metrics.value}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'Jost, sans-serif',
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
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
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
            background: 'rgba(15, 12, 35, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
          }}
        >
          <h3
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: 'clamp(1.5rem, 3vw, 2.4rem)',
              fontWeight: 500,
              color: '#ffffff',
              marginBottom: '1rem',
            }}
          >
            Have a project in mind for your brand?
          </h3>
          <p
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '500px',
              margin: '0 auto 2rem',
            }}
          >
            Let's discuss how Ascore Creative can engineer your next digital breakthrough.
          </p>
          <a
            href="#contact"
            style={{
              fontFamily: 'Jost, sans-serif',
              background: '#8bf825',
              color: '#04030a',
              fontSize: '0.9375rem',
              fontWeight: 700,
              padding: '0.85rem 2rem',
              borderRadius: '100px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(139, 248, 37, 0.35)',
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
