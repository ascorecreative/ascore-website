import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { servicePages } from '../../lib/siteRoutes'
import { STATIC_RELEASE } from '../../lib/releaseMode'
import { useBackendAvailability } from '../../lib/useBackendAvailability'

export default function ContactEnquiryForm(){
 const {availability,setAvailability,checkAgain}=useBackendAvailability()
 const unavailable=availability!=='available'
 const form=useRef(null),requestId=useRef(null),lastPayload=useRef(null),statusRef=useRef(null)
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(null)
 async function submit(event){
  event.preventDefault();if(busy||unavailable)return
  const fields=Object.fromEntries(new FormData(form.current));fields.consent=fields.consent==='on'
  const payload=JSON.stringify(fields)
  if(lastPayload.current!==payload){requestId.current=crypto.randomUUID();lastPayload.current=payload}
  setBusy(true);setStatus(null)
  try{
   const response=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,requestId:requestId.current})})
   if(!response.headers.get('content-type')?.includes('application/json')){setAvailability('unavailable');throw Error('The enquiry form is awaiting activation. No submission has been confirmed. Please email info@ascore.ae or contact us on WhatsApp.')}
   const result=await response.json()
   if(response.ok&&(![201,202].includes(response.status)||!['pending','uncertain','delivered'].includes(result.status)||result.id!==requestId.current)){setAvailability('unavailable');throw Error('Your enquiry has not been confirmed. Please email info@ascore.ae or contact us on WhatsApp.')}
   if(response.status>=500)setAvailability('unavailable')
   if(!response.ok)throw Error(result.error||'Your enquiry could not be saved. Please try again or email info@ascore.ae.')
   setStatus({kind:result.status==='delivered'?'success':'pending',text:result.status==='delivered'?'Your enquiry was submitted to our email provider and CRM. Thank you — we’ll be in touch.':result.status==='uncertain'?'Your enquiry is saved. Delivery needs checking; please email info@ascore.ae if your request is urgent.':'Your enquiry is saved, but email and CRM delivery are still pending. You can retry below or email info@ascore.ae.',reference:result.id})
  }catch(error){if(error instanceof TypeError||error instanceof SyntaxError)setAvailability('unavailable');setStatus({kind:'error',text:error instanceof SyntaxError?'Your enquiry has not been confirmed. Please email info@ascore.ae or contact us on WhatsApp.':error instanceof TypeError?'Your enquiry could not reach the server. Please try again or email info@ascore.ae.':error.message})}
  finally{setBusy(false);requestAnimationFrame(()=>statusRef.current?.focus({preventScroll:true}))}
 }
 return <form ref={form} className="enquiry-form" onSubmit={submit} onChange={()=>{if(status?.kind==='success')setStatus(null)}} aria-labelledby="enquiry-heading">
  <h2 id="enquiry-heading">Tell us about your idea.</h2><p className="enquiry-intro">A few details to start the conversation.</p>
  {unavailable&&<div className="enquiry-status enquiry-activation" role="status"><p>{availability==='checking'?'Checking enquiry form availability…':'The enquiry form is awaiting activation. Please contact us directly; this form is not accepting submissions yet.'}</p><p><a href="mailto:info@ascore.ae">Email info@ascore.ae</a> · <a href="https://wa.me/971568555626" target="_blank" rel="noopener noreferrer">WhatsApp</a> · <a href="tel:+971543878726">Call us</a></p>{!STATIC_RELEASE&&availability==='unavailable'&&<button type="button" onClick={checkAgain}>Check again</button>}</div>}
  <fieldset className="enquiry-controls" disabled={unavailable}>
  <div className="enquiry-fields"><label>Your name<input name="name" required maxLength={100} autoComplete="name"/></label><label>Email address<input name="email" required type="email" maxLength={254} autoComplete="email"/></label><label>Company<input name="company" required maxLength={160} autoComplete="organization"/></label><label>Phone <span>(optional)</span><input name="phone" type="tel" maxLength={40} autoComplete="tel"/></label><label className="enquiry-wide">What do you have in mind?<select name="service" required defaultValue=""><option value="" disabled>Choose a service</option>{servicePages.map(page=><option key={page.id} value={page.id}>{page.name}</option>)}<option value="other">Let’s explore it together</option></select></label><label className="enquiry-wide">Your message<textarea name="message" required minLength={10} maxLength={4000} rows={4}/></label></div>
  <div className="enquiry-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  <label className="enquiry-consent"><input type="checkbox" name="consent" required/><span>I agree to share these details with Ascore through email and its CRM so the team can respond to my enquiry.</span></label>
  <button className="enquiry-submit" type="submit" disabled={unavailable||busy||status?.kind==='success'}>{unavailable?'Form awaiting activation':busy?'Submitting…':status?.kind==='pending'?'Retry delivery':'Send enquiry'}<ArrowUpRight size={18}/></button>
  </fieldset>
  {status&&<div ref={statusRef} tabIndex={-1} className={`enquiry-status is-${status.kind}`} role={status.kind==='error'?'alert':'status'}><p>{status.text}</p>{status.reference&&<small>Reference: {status.reference}</small>}</div>}
 </form>
}
