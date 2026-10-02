import { useEffect, useState } from 'react'
import { MessageCircle, ArrowUpRight } from 'lucide-react'

export default function AfterVideoWhatsApp(){
 const [shown,setShown]=useState(false)
 useEffect(()=>{
  let frame=0
  const update=()=>{frame=0;const video=document.querySelector('.original-video-hero.is-standalone')||document.querySelector('.original-video-hero');const hero=document.querySelector('.idea-hero');if(!video)return;const boundary=video.closest('.idea-stage')?hero.getBoundingClientRect().bottom:video.getBoundingClientRect().bottom;setShown(boundary<=0)}
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)}
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule)
  const observer=new MutationObserver(schedule);observer.observe(document.querySelector('main'),{childList:true,subtree:true})
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)}
 },[])
 return <a className={`after-video-chat${shown?' is-shown':''}`} href="https://wa.me/971568555626" target="_blank" rel="noopener noreferrer" aria-label="How can we help you? Open WhatsApp in a new tab" aria-hidden={!shown} tabIndex={shown?0:-1}><MessageCircle size={20}/><span>How can we help you</span><ArrowUpRight size={16}/></a>
}
