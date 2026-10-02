import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { servicePages } from '../../lib/siteRoutes'

export default function ContactEnquiryForm(){
 const form=useRef(null),requestId=useRef(null),lastPayload=useRef(null),statusRef=useRef(null)
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(null)
 async function submit(event){
  event.preventDefault();if(busy)return
  const fields=Object.fromEntries(new FormData(form.current));fields.consent=fields.consent==='on'
  const payload=JSON.stringify(fields)
  if(lastPayload.current!==payload){requestId.current=crypto.randomUUID();lastPayload.current=payload}
  setBusy(true);setStatus(null)
  try{
   const response=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,requestId:requestId.current})})
   const result=await response.json().catch(()=>({}))
   if(!response.ok)throw Error(result.error||'Your enquiry could not be saved. Please try again or email info@ascore.ae.')
   setStatus({kind:result.status==='delivered'?'success':'pending',text:result.status==='delivered'?'Your enquiry was submitted to our email provider and CRM. Thank you — we’ll be in touch.':result.status==='uncertain'?'Your enquiry is saved. Delivery needs checking; please email info@ascore.ae if your request is urgent.':'Your enquiry is saved, but email and CRM delivery are still pending. You can retry below or email info@ascore.ae.',reference:result.id})
  }catch(error){setStatus({kind:'error',text:error instanceof TypeError?'Your enquiry could not reach the server. Please try again or email info@ascore.ae.':error.message})}
  finally{setBusy(false);requestAnimationFrame(()=>statusRef.current?.focus({preventScroll:true}))}
 }
 return <form ref={form} className="enquiry-form" onSubmit={submit} onChange={()=>{if(status?.kind==='success')setStatus(null)}} aria-labelledby="enquiry-heading">
  <h2 id="enquiry-heading">Tell us about your idea.</h2><p className="enquiry-intro">A few details to start the conversation.</p>
  <div className="enquiry-fields"><label>Your name<input name="name" required maxLength={100} autoComplete="name"/></label><label>Email address<input name="email" required type="email" maxLength={254} autoComplete="email"/></label><label>Company<input name="company" required maxLength={160} autoComplete="organization"/></label><label>Phone <span>(optional)</span><input name="phone" type="tel" maxLength={40} autoComplete="tel"/></label><label className="enquiry-wide">What do you have in mind?<select name="service" required defaultValue=""><option value="" disabled>Choose a service</option>{servicePages.map(page=><option key={page.id} value={page.id}>{page.name}</option>)}<option value="other">Let’s explore it together</option></select></label><label className="enquiry-wide">Your message<textarea name="message" required minLength={10} maxLength={4000} rows={4}/></label></div>
  <div className="enquiry-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  <label className="enquiry-consent"><input type="checkbox" name="consent" required/><span>I agree to share these details with Ascore through email and its CRM so the team can respond to my enquiry.</span></label>
  <button className="enquiry-submit" type="submit" disabled={busy||status?.kind==='success'}>{busy?'Submitting…':status?.kind==='pending'?'Retry delivery':'Send enquiry'}<ArrowUpRight size={18}/></button>
  {status&&<div ref={statusRef} tabIndex={-1} className={`enquiry-status is-${status.kind}`} role={status.kind==='error'?'alert':'status'}><p>{status.text}</p>{status.reference&&<small>Reference: {status.reference}</small>}</div>}
 </form>
}
