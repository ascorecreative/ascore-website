import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Monitor, PenTool, Box, Workflow, BriefcaseBusiness } from 'lucide-react'
import ErrorBoundary from '../ui/ErrorBoundary'
import OriginalVideoHero from './OriginalVideoHero'
import '../../styles/idea-hero.css'
import '../../styles/hero-fullscreen.css'
import { services } from '../../lib/siteContent'

const Sculpture = lazy(() => import('./Sculpture'))
const phases = ['Find the spark', 'Give it shape', 'Make it matter']
const serviceIcons=[Monitor,PenTool,Box,Workflow,BriefcaseBusiness]
function ServiceIcon({index}) {const Icon=serviceIcons[index];return <span className="idea-service-icon-motion" style={{animationDelay:`-${index*.35}s`}}><Icon className="idea-service-icon" size={30} strokeWidth={1.4}/></span>}
const serviceContexts=['DESIGN & ENGINEERING','IDENTITY & DIRECTION','SPACE & INTERACTION','CAMPAIGNS & WORKFLOWS','UAE BUSINESS SUPPORT']
const particles=Array.from({length:30},(_,i)=>{const angle=i*2.399963;return{x:Math.cos(angle)*(370+i%5*38),y:Math.sin(angle)*(235+i%4*27),radius:1.2+i%3*.7}})

export default function IdeaHero({ reducedMotion }) {
  const section = useRef(null)
  const stage = useRef(null)
  const [progress, setProgress] = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)
  const [enhanced, setEnhanced] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (reducedMotion) { setProgress(0); setVideoProgress(0); setEnhanced(false); return }
    let frame = 0
    const update = () => {
      frame = 0
      const element = section.current
      if (!element) return
      const { top, height } = element.getBoundingClientRect()
      const viewport = stage.current?.clientHeight || window.innerHeight
      // Preserve the accepted 3D scroll distance, then give the original video one viewport of scroll.
      const distance = Math.max(1, height - viewport * 2)
      setProgress(Math.max(0, Math.min(1, -top / distance)))
      setVideoProgress(Math.max(0, Math.min(1, (-top - distance) / viewport)))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting&&entry.intersectionRect.height>1),{threshold:[0,.01]})
    observer.observe(section.current)
    const idle = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get('webgl') !== 'off') setEnhanced(true)
    }, 180)
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(idle)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [reducedMotion])

  const phase = Math.min(2, Math.floor(progress * 3))
  return <section className={`idea-hero${reducedMotion ? ' is-reduced-motion' : ''}${visible&&!reducedMotion&&progress>.16&&progress<.79?' is-exploded':''}`} id="home" data-theme={progress>.94?'light':'dark'} ref={section} style={{ '--idea-progress': progress, '--video-progress': videoProgress, '--idea-spread': progress<.45?progress/.45:Math.max(0,1-(progress-.45)/.55) }}>
    <div className="idea-stage" ref={stage}>
      <div className="idea-topline"><span>Dubai based creative and digital agency</span><span>UAE / India / Worldwide</span></div>
      <svg className="idea-flow" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ascore-flow-color"><stop stopColor="#68adaf"/><stop offset=".55" stopColor="#2b7de9"/><stop offset="1" stopColor="#304485"/></linearGradient></defs><g fill="none" stroke="url(#ascore-flow-color)" strokeWidth=".8"><path d="M-140 680 C220 180 760 1040 1560 180"/><path d="M-120 150 C400 780 780 -220 1580 650"/><path d="M80 -120 C1150 300 220 850 1320 1040"/></g><g className="idea-particles" fill="#6abfc1">{particles.map((point,index)=><circle key={index} cx="720" cy="450" r={point.radius} style={{'--dot-x':`${point.x}px`,'--dot-y':`${point.y}px`}}/>)}</g><g className="idea-flow-points" fill="#68adaf"><circle cx="280" cy="200" r="3"/><circle cx="1160" cy="660" r="4"/><circle cx="710" cy="790" r="2"/></g></svg>
      <div className="idea-art" aria-hidden="true">
        <div className="idea-orbit idea-orbit-outer" /><div className="idea-orbit idea-orbit-inner" />
        <div className="idea-axis"><span>Y</span><span>X</span></div>
        <img className="idea-poster" src="/hero/sculpted-center-poster.webp" alt="" width="1200" height="1200" fetchPriority="high" />
        {enhanced && <ErrorBoundary fallback={null}><Suspense fallback={null}><Sculpture progress={progress} visible={visible&&videoProgress<.1} /></Suspense></ErrorBoundary>}
        <div className="idea-specimen"><span>STUDY 001 / THE IDEA ENGINE</span><span>Strategy ↗ Design ↗ Technology</span></div>
      </div>
      <div className="idea-service-labels" aria-hidden="true">{services.map(([number,title,text],index)=><div key={number} className={`idea-service-label label-${index}${Math.min(4,Math.floor(Math.max(0,progress-.15)*7))===index?' is-active':''}`}><ServiceIcon index={index}/><span>{number} / {serviceContexts[index]}</span><h2>{title}</h2><p>{text}</p></div>)}</div>
      <div className="idea-copy">
        <p className="idea-eyebrow"><span /> A different perspective.</p>
        <h1>Ideas with <em>dimension.</em></h1>
      </div>
      <div className="idea-support" inert={progress>.22?true:undefined}>
        <p className="idea-description">From a spark of possibility to a brand that moves people. We bring strategy, design and technology into focus.</p>
        <div className="idea-actions"><a href="/contact/" className="idea-primary">Let’s shape your next idea <ArrowUpRight size={18} /></a><a href="/about/" className="idea-explore">Explore the studio <ArrowDown size={16} /></a></div>
      </div>
      <div className="idea-footer">
        <div className="idea-chapters" aria-label="Our creative approach">{phases.map((title, index) => <span key={title} className={index === phase ? 'is-current' : ''}><b>0{index + 1}</b>{title}</span>)}</div>
        <span className="idea-scroll">{reducedMotion ? 'IDEAS, GIVEN FORM' : 'SCROLL TO CHANGE PERSPECTIVE'}<ArrowDown size={15} /></span>
        <div className="idea-track" aria-hidden="true"><span /></div>
      </div>
      <OriginalVideoHero progress={videoProgress} near={progress>.72} visible={visible} reducedMotion={reducedMotion}/>
    </div>
  </section>
}
