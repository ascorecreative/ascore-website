import {useEffect,useRef,useState} from 'react'
import {Phone,RotateCcw,X,Search} from 'lucide-react'
import {portalRequest} from '../../services/portalApi'
import {leadStatuses,callOutcomes,closedLeadStatuses} from '../../lib/leadWorkflow'
import '../../styles/leads-workspace.css'

const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const dateLabel=value=>value?new Intl.DateTimeFormat('en-AE',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Dubai'}).format(new Date(value)):'—'
const due=lead=>lead.nextFollowUpAt&&lead.nextFollowUpAt<=today()&&!closedLeadStatuses.includes(lead.status)
function StatusOptions(){return Object.entries(leadStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}

function LeadDetails({lead,busy,onClose,save,error,notice}){
  const dialog=useRef(null),[eventId,setEventId]=useState(()=>crypto.randomUUID()),[outcome,setOutcome]=useState('')
  useEffect(()=>{const prior=document.activeElement,node=dialog.current;node.showModal();return()=>{node.close();prior?.focus()}},[])
  const logCall=async event=>{
    event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form))
    if(await save(`/leads/${lead.id}/activities`,{...values,eventId})){form.reset();setOutcome('');setEventId(crypto.randomUUID())}
  }
  return <dialog className="lead-dialog" ref={dialog} aria-labelledby="lead-title" onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===dialog.current)onClose()}}>
    <header><div><p>LEAD DETAILS</p><h2 id="lead-title">{lead.name}</h2><span>{lead.company||lead.phone}</span></div><button type="button" aria-label="Close lead details" onClick={onClose}><X size={20}/></button></header>
    <div className="lead-contact">{lead.phone&&<a href={`tel:${(lead.callingPhone||lead.phone).replace(/[^+\d]/g,'')}`}><Phone size={16}/>{lead.callingPhone||lead.phone}</a>}{lead.callingPhone&&<span>WhatsApp: {lead.phone}</span>}{lead.email&&<a href={`mailto:${lead.email}`}>{lead.email}</a>}</div>
    <div aria-live="polite">{error&&<p role="alert" className="lead-error">{error}</p>}{notice&&<p className="lead-notice">{notice}</p>}</div>
    <form className="lead-edit" onSubmit={async event=>{event.preventDefault();await save(`/leads/${lead.id}`,{...Object.fromEntries(new FormData(event.currentTarget)),expectedUpdatedAt:lead.updatedAt||lead.createdAt},'PATCH')}}>
      <label>Status<select name="status" key={lead.status} defaultValue={lead.status}><StatusOptions/></select></label>
      <label>Next follow-up (UAE date)<input type="date" name="nextFollowUpAt" key={lead.nextFollowUpAt||'none'} defaultValue={lead.nextFollowUpAt||''}/></label>
      <label className="lead-wide">Lead notes<textarea name="notes" key={lead.notes} defaultValue={lead.notes} maxLength={4000}/></label>
      <button disabled={busy}>Save lead details</button>
    </form>
    {lead.whatsappReview&&<section className="lead-evidence"><h3>WhatsApp conversation</h3><p>{lead.whatsappReview.summary}</p><dl><div><dt>Source</dt><dd>{lead.source.replaceAll('_',' ')}</dd></div><div><dt>Last message</dt><dd>{lead.whatsappReview.lastMessageDate||'Date not established'}</dd></div><div><dt>Acknowledgement</dt><dd>{lead.whatsappReview.acknowledgement}</dd></div>{lead.whatsappReview.label&&<div><dt>WhatsApp label</dt><dd>{lead.whatsappReview.label}</dd></div>}<div><dt>Reviewed</dt><dd>{dateLabel(lead.whatsappReview.reviewedAt)} UAE</dd></div></dl></section>}
    <section className="lead-call-form"><h3>Record a call response</h3><form onSubmit={logCall}>
      <label>Call outcome<select name="outcome" required value={outcome} onChange={event=>setOutcome(event.target.value)}><option value="">Choose the actual outcome</option>{Object.entries(callOutcomes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Next call / follow-up (UAE date)<input type="date" name="nextFollowUpAt" required={outcome==='callback'}/></label>
      <label>Response / conversation notes<textarea name="notes" maxLength={2000} placeholder="What did the lead say? Add any agreed next step."/></label>
      <button disabled={busy||!outcome}>Save call response</button>
    </form></section>
    <section className="lead-history"><h3>Call history ({lead.activities?.length||0})</h3>{!lead.activities?.length&&<p>No calls recorded yet.</p>}{[...(lead.activities||[])].reverse().map(item=><article key={item.id}><strong>{callOutcomes[item.outcome]||item.outcome}</strong><small>{dateLabel(item.at)} UAE · {item.actor}</small>{item.notes&&<p>{item.notes}</p>}{item.nextFollowUpAt&&<p>Next follow-up: {item.nextFollowUpAt}</p>}</article>)}</section>
  </dialog>
}

export default function LeadsWorkspace({leads,onRefresh}){
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[importText,setImportText]=useState('')
  const pending=useRef(false)
  const save=async(path,body,method='POST')=>{
    if(pending.current)return false
    pending.current=true;setBusy(true);setError('');setNotice('')
    try{const result=await portalRequest(path,{method,body});if(await onRefresh()===false){setError('Saved, but the list could not refresh. Refresh the workspace to verify your changes.');return false}setNotice(path==='/leads/import'?`Imported ${result.created.length} leads; ${result.skipped.length} existing numbers skipped.`:'Saved to your workspace.');return true}
    catch(err){setError(err.message);return false}finally{pending.current=false;setBusy(false)}
  }
  const matching=leads.filter(lead=>`${lead.name} ${lead.phone||''} ${(lead.phone||'').replace(/\D/g,'')} ${lead.email||''} ${lead.company||''} ${lead.notes||''}`.toLowerCase().includes(search.trim().toLowerCase())).filter(lead=>filter==='all'||(filter==='due'?due(lead):lead.status===filter))
  const current=leads.find(lead=>lead.id===selected)
  return <section className="lead-workspace" aria-label="Lead management">
    <div aria-live="polite">{error&&<p role="alert" className="lead-error">{error}</p>}{notice&&<p className="lead-notice">{notice}</p>}</div>
    <div className="lead-counts"><div><span>Total leads</span><strong>{leads.length}</strong></div><div><span>No reply after acknowledgement</span><strong>{leads.filter(lead=>lead.status==='no_reply').length}</strong></div><div><span>Follow-ups due</span><strong>{leads.filter(due).length}</strong></div><div><span>Calls recorded</span><strong>{leads.reduce((n,lead)=>n+(lead.activities?.length||0),0)}</strong></div></div>
    <div className="lead-toolbar"><label><Search size={17}/><input aria-label="Search leads" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search name, phone or company"/></label><label className="lead-filter">Status<select aria-label="Filter leads by status" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All leads</option><option value="due">Follow-ups due</option><StatusOptions/></select></label><span>{matching.length} shown</span></div>
    <div className="workspace-table-wrap"><table className="workspace-table lead-table"><thead><tr><th>Lead / contact</th><th>Status</th><th>Latest response / notes</th><th>Next follow-up</th><th>Actions</th></tr></thead><tbody>{matching.map(lead=>{const last=lead.activities?.at(-1);return <tr key={lead.id}><td><button className="lead-name" type="button" onClick={()=>setSelected(lead.id)}>{lead.name}</button><small>{lead.company}</small><a href={`tel:${(lead.callingPhone||lead.phone||'').replace(/[^+\d]/g,'')}`}>{lead.callingPhone||lead.phone}</a>{lead.callingPhone&&<small>WhatsApp: {lead.phone}</small>}{lead.email&&<small>{lead.email}</small>}<small>{lead.source?.replaceAll('_',' ')}</small></td><td><select aria-label={`Status for ${lead.name}`} value={lead.status} disabled={busy} onChange={event=>save(`/leads/${lead.id}`,{status:event.target.value,expectedUpdatedAt:lead.updatedAt||lead.createdAt},'PATCH')}><StatusOptions/></select></td><td><p className="lead-summary">{last?(last.notes||callOutcomes[last.outcome]):lead.whatsappReview?.summary||lead.notes||'No response recorded.'}</p>{last&&<small>{callOutcomes[last.outcome]} · {dateLabel(last.at)}</small>}</td><td>{lead.nextFollowUpAt||'Not scheduled'}{due(lead)&&<small className="lead-due">Due for follow-up</small>}</td><td><div className="lead-actions"><button type="button" onClick={()=>setSelected(lead.id)}>Details / log call</button>{!closedLeadStatuses.includes(lead.status)&&<button type="button" disabled={busy} onClick={()=>save(`/leads/${lead.id}`,{status:'call_again',expectedUpdatedAt:lead.updatedAt||lead.createdAt},'PATCH')}><RotateCcw size={14}/>Call again</button>}</div></td></tr>})}</tbody></table>{!matching.length&&<p className="workspace-empty">{leads.length?'No leads match your search.':'No leads have been added yet.'}</p>}</div>
    <section className="workspace-panel"><h2>Add a lead</h2><form className="workspace-fields-grid" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;if(await save('/leads',Object.fromEntries(new FormData(form))))form.reset()}}><label>Name<input name="name" required maxLength={100}/></label><label>Company<input name="company" maxLength={160}/></label><label>Email<input name="email" type="email"/></label><label>Phone<input name="phone" type="tel" maxLength={40}/></label><label>Status<select name="status"><StatusOptions/></select></label><label>Notes<textarea name="notes" maxLength={4000}/></label><button disabled={busy}>Save lead</button></form></section>
    <details className="workspace-panel lead-import"><summary>Import reviewed WhatsApp leads</summary><p>Paste a reviewed JSON list, up to 50 leads. Existing phone numbers are skipped; their notes and status stay intact.</p><form onSubmit={async event=>{event.preventDefault();let rows;try{rows=JSON.parse(importText)}catch{setError('Enter a valid JSON list of reviewed leads.');return}if(await save('/leads/import',{leads:rows}))setImportText('')}}><label>Reviewed lead records<textarea aria-label="Reviewed lead records" required value={importText} onChange={event=>setImportText(event.target.value)}/></label><button disabled={busy}>Import reviewed leads</button></form></details>
    {current&&<LeadDetails key={current.id} lead={current} busy={busy} onClose={()=>setSelected(null)} save={save} error={error} notice={notice}/>}
  </section>
}
