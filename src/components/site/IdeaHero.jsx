import { isCompactHero } from '../../lib/heroViewport'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
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

export default function IdeaHero({ reducedMotion, onOpenService }) {
  const section = useRef(null)
  const stage = useRef(null)
  const labels=useRef([]),labelSizes=useRef([])
  const trackLabels=useCallback((anchors,size,p)=>{
    if(!section.current)return
    section.current.dataset.linkedLabels='true'
    section.current.style.setProperty('--label-reveal',Math.max(0,Math.min(1,(p-.16)*8)))
    const compact=isCompactHero(size),margin=compact?20:24,pad=compact?48:82
    const clamp=(value,low,high)=>Math.min(Math.max(value,low),Math.max(low,high))
    const items=anchors.slice(0,5).map((anchor,index)=>{
      const [w,h]=labelSizes.current[index]||[compact?Math.min(255,size.width*.64):185,compact?145:125]
      const right=anchor.x>=size.width/2
      return {anchor,index,w,h,right,x:clamp(anchor.x+(right?pad:-pad-w),margin,size.width-w-margin),y:clamp(compact?anchor.y+pad:anchor.y-h/2,compact?(size.height<500?88:135):130,size.height-h-(compact?95:75))}
    })
    if(!compact){
      // Pack each side in both directions, preserving the anchor order without bottom-edge collisions.
      for(const right of [false,true]){
        const column=items.filter(item=>item.right===right).sort((a,b)=>a.y-b.y)
        for(let i=1;i<column.length;i++)column[i].y=Math.max(column[i].y,column[i-1].y+column[i-1].h+14)
        for(let i=column.length-1;i>=0;i--)column[i].y=Math.min(column[i].y,i===column.length-1?size.height-column[i].h-75:column[i+1].y-column[i].h-14)
      }
    }
    for(const {anchor,index,x,y} of items){
      const element=labels.current[index];if(!element)continue
      element.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`
      element.style.setProperty('--tile-x',anchor.x.toFixed(2));element.style.setProperty('--tile-y',anchor.y.toFixed(2))
    }
  },[])
  useEffect(()=>{const observer=new ResizeObserver(entries=>{for(const entry of entries){const index=labels.current.indexOf(entry.target);if(index>=0&&entry.contentRect.width>0){const r=entry.target.getBoundingClientRect();labelSizes.current[index]=[r.width,r.height]}}});labels.current.forEach(el=>el&&observer.observe(el));return()=>observer.disconnect()},[])
  const [progress, setProgress] = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)
  const [enhanced, setEnhanced] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (reducedMotion) { setProgress(0); setVideoProgress(0); setEnhanced(false); return }
    const enhancementAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      new URLSearchParams(window.location.search).get('motion') !== 'reduce' &&
      new URLSearchParams(window.location.search).get('webgl') !== 'off'
    // Fetch the model alongside the lazy renderer, rather than after its download,
    // parse and WebGL setup. The poster remains the first painted artwork.
    let modelPreload
    if (enhancementAllowed) {
      modelPreload = document.createElement('link')
      modelPreload.rel = 'preload'; modelPreload.as = 'fetch'
      modelPreload.href = '/hero/ascore-unified-sculpted.glb'; modelPreload.crossOrigin = 'anonymous'
      document.head.appendChild(modelPreload)
    }
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
      if (enhancementAllowed) setEnhanced(true)
    }, 180)
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(idle)
      modelPreload?.remove()
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
        {enhanced && <ErrorBoundary fallback={null}><Suspense fallback={null}><Sculpture progress={progress} visible={visible&&videoProgress<.1} onAnchors={trackLabels} /></Suspense></ErrorBoundary>}
        <div className="idea-specimen"><span>STUDY 001 / THE IDEA ENGINE</span><span>Strategy ↗ Design ↗ Technology</span></div>
      </div>
      <div className="idea-service-labels" inert={!(progress>.2&&progress<.79)?true:undefined} aria-hidden={!(progress>.2&&progress<.79)?true:undefined}>{services.map(([number,title,text],index)=><div key={number} ref={el=>{labels.current[index]=el}} className={`idea-service-label label-${index}${Math.min(4,Math.floor(Math.max(0,progress-.15)*7))===index?' is-active':''}`}><ServiceIcon index={index}/><span>{number} / {serviceContexts[index]}</span><h2><button className="hero-service-trigger" type="button" aria-haspopup="dialog" onClick={event=>onOpenService(index,event.currentTarget)}>{title}</button></h2><p>{text}</p></div>)}</div>
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
