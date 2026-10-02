import MobileVideoBadgeMask from './MobileVideoBadgeMask'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import '../../styles/original-video-hero.css'

export default function OriginalVideoHero({ progress=1, near=false, visible=true, reducedMotion=false, standalone=false }) {
 const wrapper=useRef(null),video=useRef(null),playback=useRef(null),sample=useRef(null),sampleTime=useRef(-1000)
 const [mobile,setMobile]=useState(false),[source,setSource]=useState(null)
 const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[blocked,setBlocked]=useState(false)
 const [requested,setRequested]=useState(false),[paused,setPaused]=useState(false),[inView,setInView]=useState(false),[theme,setTheme]=useState('light')
 const active=inView&&(standalone||visible&&progress>.025)
 const shouldLoad=(!reducedMotion&&near)||requested
 playback.current={active,paused,reducedMotion,requested}
 const play=useCallback(()=>{
  const element=video.current,state=playback.current;if(!element)return
  if(!state.active||document.hidden||state.paused||state.reducedMotion&&!state.requested){element.pause();return}
  element.muted=true; element.defaultMuted=true; element.playsInline=true
  if(element.readyState>=2)setReady(true)
  element.play().then(()=>setBlocked(false)).catch(error=>{if(error.name!=='AbortError'){setBlocked(true);setPlaying(false)}})
 },[])
 const sampleTheme=useCallback(()=>{
  const element=video.current;if(!element||element.readyState<2||!playback.current.active||document.hidden)return
  const now=performance.now();if(now-sampleTime.current<500)return;sampleTime.current=now
  try{
   if(!sample.current){const canvas=document.createElement('canvas');canvas.width=24;canvas.height=4;sample.current=canvas.getContext('2d',{willReadFrequently:true})}
   const context=sample.current;if(!context)return
   const rect=element.getBoundingClientRect(),scale=Math.max(rect.width/element.videoWidth,rect.height/element.videoHeight)
   const cropX=(element.videoWidth-rect.width/scale)/2,cropY=(element.videoHeight-rect.height/scale)/2
   const sx=cropX+rect.width*.2/scale,sy=Math.max(0,Math.min(element.videoHeight-1,cropY+(16-rect.y)/scale))
   context.drawImage(element,sx,sy,rect.width*.6/scale,Math.min(40/scale,element.videoHeight-sy),0,0,24,4)
   const pixels=context.getImageData(0,0,24,4).data;let luminance=0
   for(let i=0;i<pixels.length;i+=4)luminance+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722
   setTheme(luminance/(pixels.length/4)>135?'light':'dark')
  }catch{/* The normal light theme remains available if video pixel sampling is unsupported. */}
 },[])
 useEffect(()=>{const query=window.matchMedia('(max-width: 991px) and (orientation: portrait)');const sync=()=>setMobile(query.matches);sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync)},[])
 useEffect(()=>{if(!wrapper.current)return;const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting&&entry.intersectionRect.height>1),{threshold:[0,.01]});observer.observe(wrapper.current);return()=>observer.disconnect()},[standalone,reducedMotion])
 useEffect(()=>{
  const next=mobile?'/hero-video-mobile.mp4':'/hero-video.mp4'
  // Re-entering the chapter must keep an already decoded video visible.
  if(shouldLoad&&source!==next){setReady(false);setBlocked(false);setTheme('light');setSource(next)}
 },[shouldLoad,mobile,source])
 useEffect(()=>{
  const element=video.current;if(!element||!source)return
  play();document.addEventListener('visibilitychange',play)
  return()=>{document.removeEventListener('visibilitychange',play);element.pause()}
 },[source,active,paused,reducedMotion,requested,play])
 if(reducedMotion&&!standalone)return null
 const poster=mobile?'/hero/original-video-mobile-poster.webp':'/hero/original-video-desktop-poster.webp'
 const loaded=()=>{setReady(true);sampleTime.current=-1000;sampleTheme();play()}
 const toggle=()=>{if(playing){setPaused(true);video.current?.pause()}else{setRequested(true);setPaused(false);video.current?.play().then(()=>setBlocked(false)).catch(error=>{if(error.name!=='AbortError')setBlocked(true)})}}
 const controlVisible=(standalone||active&&progress>.225)&&(standalone||playing||paused||blocked)
 return <section ref={wrapper} className={`original-video-hero${standalone?' is-standalone':''}${mobile?' is-mobile-format':''}`} data-theme={theme} style={{'--video-progress':progress}} aria-label="Original Ascore video hero" aria-hidden={!active&&!standalone?true:undefined} inert={!active&&!standalone?true:undefined}>
  {(near||standalone)&&<picture><img className="original-video-poster" src={poster} alt="" width={mobile?720:1280} height={mobile?1280:720} loading="lazy"/></picture>}
  {source&&<video ref={video} className={ready?'is-ready':''} src={source} poster={poster} muted loop playsInline preload={active?'auto':'metadata'} aria-label="Ascore Creative original video hero" onLoadedData={loaded} onCanPlay={loaded} onTimeUpdate={sampleTheme} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>}
  {mobile&&(near||standalone)&&<MobileVideoBadgeMask active={active} playing={playing}/>}
  {controlVisible&&<button className={`original-video-control${playing?' is-keyboard-only':''}`} type="button" onClick={toggle}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'Pause video':'Play video'}</span></button>}
 </section>
}
