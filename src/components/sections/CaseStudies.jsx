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
    <section id="work" ref={sectionRef} className="section-gap" style={{ background: '#050505' }}>
      <div className="site-container">

        {/* Section Header */}
        <div
          className="work-reveal"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            marginBottom: '3rem',
          }}
        >
          <div>
            <span className="label-text">Our Track Record</span>
            <h2 className="section-title" style={{ marginTop: '0.5rem' }}>
              Finished Works & <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent-green)' }}>Case Studies</em>
            </h2>
          </div>
          <p className="body-text" style={{ maxWidth: '640px' }}>
            Explore 19 of our high-impact client platforms — delivered for market leaders across the UAE and internationally.
          </p>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: activeCategory === cat ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === cat ? '#000' : 'rgba(255,255,255,0.7)',
                  border: activeCategory === cat ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.1)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '100px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {cat}
              </button>
            ))}
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
                      border: `1px solid ${work.color}30`,
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
                    color: '#fff',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.02em',
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
                      color: '#fff',
                      letterSpacing: '-0.02em',
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
                    }}
                  >
                    {work.metrics.label}
                  </span>
                </div>

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <ExternalLink size={14} />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Bottom CTA bar */}
        <div
          className="work-reveal"
          style={{
            marginTop: '4rem',
            textAlign: 'center',
            padding: '3rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
          }}
        >
          <h3 className="section-title-sm" style={{ marginBottom: '1rem' }}>
            Have a project in mind for your brand?
          </h3>
          <p className="body-text" style={{ maxWidth: '500px', margin: '0 auto 2rem' }}>
            Let's discuss how Ascore Creative can engineer your next digital breakthrough.
          </p>
          <a
            href="#contact"
            className="arrow-cta"
            onClick={(e) => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }) }}
          >
            Start Your Project
            <span className="arrow-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 13L13 1M13 1H4M13 1V10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}
