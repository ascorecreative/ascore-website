import { useEffect, useRef } from 'react'
import { ArrowUpRight, Check, X } from 'lucide-react'

export default function ServiceDetailsDialog({ selection, onClose }) {
 const ref=useRef(null),{page,opener}=selection
 useEffect(()=>{
  const dialog=ref.current,previous=document.body.style.overflow
  dialog.showModal();document.body.style.overflow='hidden'
  return()=>{dialog.close();document.body.style.overflow=previous;if(opener?.isConnected)opener.focus({preventScroll:true})}
 },[opener])
 return <dialog ref={ref} className="service-dialog" aria-labelledby="service-dialog-title" aria-describedby="service-dialog-intro" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose()}}} onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose()}}}>
  <button className="dialog-close" type="button" aria-label="Close service details" onClick={onClose} autoFocus><X size={22}/></button>
  <p className="eyebrow">ASCORE / OUR PRACTICE</p><h2 id="service-dialog-title">{page.name}</h2><p id="service-dialog-intro">{page.intro}</p>
  <h3>What we can shape together</h3><ul>{page.deliverables.map(text=><li key={text}><Check aria-hidden="true" size={18}/><span>{text}</span></li>)}</ul>
  <p className="dialog-scope">Scope, timelines and specialist involvement are agreed around your project.</p>
  <a className="dialog-link" href={page.path}>Explore the service <ArrowUpRight size={18}/></a>
 </dialog>
}
