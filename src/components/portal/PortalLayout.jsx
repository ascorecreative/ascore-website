import { useCallback,useEffect,useRef,useState } from 'react'
import { ArrowLeft,ArrowUpRight,LogOut,RefreshCw,X,Menu,Search,Home,FolderOpen,FileText,Users,Plug,BookOpen,BarChart3,Contact } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { portalRequest } from '../../services/portalApi'
import '../../styles/portal-functional.css'
import ZohoConnections from './ZohoConnections'
import CourseOrders from './CourseOrders'
import AdminOverview from './AdminOverview'
import '../../styles/admin-workspace.css'

const empty={projects:[],milestones:[],documents:[],leads:[],clients:[],integrations:null}
const money=(amount,currency='AED')=>new Intl.NumberFormat('en-AE',{style:'currency',currency}).format(amount)
function Field({label,children,...props}) {return <label>{label}{children||<input {...props}/>}</label>}
function Select({label,name,children,...props}) {return <Field label={label}><select name={name} {...props}>{children}</select></Field>}

function DocumentSheet({document:invoice,client,onClose,opener}) {
  const dialog=useRef(null)
  useEffect(()=>{
    const previous=opener.current,overflow=window.document.body.style.overflow
    window.document.body.style.overflow='hidden'
    const key=event=>{
      if(event.key==='Escape'){event.preventDefault();onClose()}
      if(event.key==='Tab'){
        const controls=[...dialog.current.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(item=>!item.disabled)
        const first=controls[0],last=controls.at(-1)
        if(event.shiftKey&&window.document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&window.document.activeElement===last){event.preventDefault();first.focus()}
      }
    }
    window.addEventListener('keydown',key)
    return()=>{window.removeEventListener('keydown',key);window.document.body.style.overflow=overflow;previous?.focus()}
  },[onClose,opener])
  return <div className="portal-document-backdrop"><section ref={dialog} className="portal-document" role="dialog" aria-modal="true" aria-labelledby="document-heading">
    <div className="document-actions"><button type="button" onClick={()=>window.print()}>Print / save PDF</button><button type="button" autoFocus onClick={onClose} aria-label="Close document"><X size={20}/></button></div>
    <img src="/ascore-logo-official.png" alt="Ascore" className="document-logo"/>
    <p className="document-kind">{invoice.kind}</p><h2 id="document-heading">{invoice.invoiceNumber}</h2><p>{invoice.title}</p>
    <div className="document-details"><p><strong>{client?.name||'Your account'}</strong><br/>{client?.company}<br/>{client?.email}</p><p>Issued: {invoice.issueDate}<br/>Due: {invoice.dueDate||'Not specified'}<br/>Currency: {invoice.currency}</p></div>
    <table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>{invoice.items.map((item,index)=><tr key={index}><td>{item.description}</td><td>{money(item.amount,invoice.currency)}</td></tr>)}</tbody></table>
    <div className="document-totals"><p>Subtotal <strong>{money(invoice.subtotal,invoice.currency)}</strong></p><p>Tax ({invoice.taxRate}%) <strong>{money(invoice.taxAmount,invoice.currency)}</strong></p><p>Total <strong>{money(invoice.amount,invoice.currency)}</strong></p>{invoice.kind!=='quotation'&&<><p>Recorded paid <strong>{money(invoice.amountPaid,invoice.currency)}</strong></p><p>Balance <strong>{money(invoice.balance,invoice.currency)}</strong></p></>}</div>
    <p className="document-note">Local financial tracking record. No online payment is collected or document sent by this portal.</p>
  </section></div>
}

export default function PortalLayout() {
  const {user,isAdmin,logout}=useAuth()
  const [data,setData]=useState(empty)
  const [tab,setTab]=useState(()=>isAdmin&&new URLSearchParams(window.location.search).get('view')==='courses'?'courses':'overview')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [loaded,setLoaded]=useState(false)
  const [selectedDocument,setSelectedDocument]=useState(null)
  const [menuOpen,setMenuOpen]=useState(false),[query,setQuery]=useState(''),[refreshedAt,setRefreshedAt]=useState(0)
  const mainRef=useRef(null),sidebarRef=useRef(null),menuButton=useRef(null),searchInput=useRef(null)
  const documentOpener=useRef(null)
  const [projectId,setProjectId]=useState('')
  const refresh=useCallback(async()=>{
    try {setData(await portalRequest('/workspace'));setLoaded(true);setError('');setRefreshedAt(Date.now())}
    catch(err){setError(err.message)}
  },[])
  useEffect(()=>{refresh()},[refresh])
  const mutate=async(path,body,method='POST')=>{
    setBusy(true);setError('');setNotice('')
    try {await portalRequest(path,{method,body});await refresh();setNotice('Saved to your workspace.');return true}
    catch(err){setError(err.message);return false}finally{setBusy(false)}
  }
  const submit=(path,transform=value=>value,method='POST')=>async event=>{
    event.preventDefault();const form=event.currentTarget
    const values=Object.fromEntries(new FormData(form))
    if(await mutate(typeof path==='function'?path(values):path,transform(values),method))form.reset()
  }
  const selectedProject=data.projects.find(p=>p.id===projectId)||data.projects[0]
  const nav=[['overview',isAdmin?'Home':'Overview'],['projects',isAdmin?'Projects & updates':'My projects'],['documents',isAdmin?'Finance':'Quotations & finances'],...(isAdmin?[['leads','Leads'],['clients','Clients'],['connections','Connections'],['courses','Course orders'],['analytics','Analytics']]:[])]
  const groups=data.documents.filter(d=>d.kind==='invoice').reduce((all,d)=>{const item=all[d.currency]||(all[d.currency]={amount:0,paid:0,balance:0});item.amount+=d.amount;item.paid+=d.amountPaid;item.balance+=d.balance;return all},{})
  const leave=async()=>{try{await logout();window.location.hash='login'}catch(err){setError(err.message)}}
  const clientOptions=<><option value="">Select client</option>{data.clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.company||c.username}</option>)}</>

  const icons={overview:Home,projects:FolderOpen,documents:FileText,leads:Contact,clients:Users,connections:Plug,courses:BookOpen,analytics:BarChart3}
  const navigate=(id,selectedId)=>{setTab(id);setNotice('');setError('');setQuery('');setMenuOpen(false);if(selectedId)setProjectId(selectedId)}
  const matches=query.trim()?[
    ...nav.map(([id,label])=>({id,label,type:'Workspace section',tab:id})),
    ...data.projects.map(p=>({id:p.id,label:p.title,type:'Project',tab:'projects'})),
    ...data.documents.map(d=>({id:d.id,label:d.invoiceNumber+' · '+d.title,type:d.kind,tab:'documents',document:d})),
    ...data.clients.map(c=>({id:c.id,label:c.name+' · '+c.username,type:'Client',tab:'clients'})),
    ...data.leads.map(l=>({id:l.id,label:l.name+' · '+(l.company||''),type:'Lead',tab:'leads'}))
  ].filter(item=>item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0,10):[]
  useEffect(()=>{
    if(!isAdmin||!menuOpen)return
    const main=mainRef.current,trigger=menuButton.current,overflow=document.body.style.overflow;document.body.style.overflow='hidden';main.inert=true
    const controls=()=>[...sidebarRef.current.querySelectorAll('button:not([disabled]),a[href]')]
    controls()[0]?.focus()
    const key=e=>{if(e.key==='Escape')setMenuOpen(false);if(e.key==='Tab'){const items=controls(),i=items.indexOf(document.activeElement);e.preventDefault();items[e.shiftKey?(i<=0?items.length-1:i-1):(i<0||i===items.length-1?0:i+1)]?.focus()}}
    const large=matchMedia('(min-width:1000px)'),resize=()=>{if(large.matches)setMenuOpen(false)}
    window.addEventListener('keydown',key);large.addEventListener('change',resize)
    return()=>{window.removeEventListener('keydown',key);large.removeEventListener('change',resize);document.body.style.overflow=overflow;main.inert=false;trigger?.focus({preventScroll:true})}
  },[isAdmin,menuOpen])
  const descriptions={overview:'Projects, clients and course delivery in one place.',projects:'Keep project progress and milestones up to date.',documents:'Quotations, invoices and offline settlement records.',leads:'Manage the enquiries added to your studio pipeline.',clients:'Registered client accounts and their contact details.',connections:'Review the existing website and Zoho connections.',courses:'Private PDF setup, test orders and email delivery status.',analytics:'Counts and balances from real saved workspace records.'}

  return <div className={'portal-workspace'+(isAdmin?' admin-workspace':'')}>
    {isAdmin&&menuOpen&&<button className="admin-nav-backdrop" type="button" aria-label="Close navigation" tabIndex={-1} onClick={()=>setMenuOpen(false)}/>}
    <aside ref={sidebarRef} className={'workspace-sidebar'+(menuOpen?' is-open':'')}>
      <div className="admin-sidebar-brand"><a href="/" aria-label="Ascore Creative home"><img src={isAdmin?'/ascore-logo-official.png':'/logo-white.png'} alt="Ascore"/></a>{isAdmin&&<button type="button" className="admin-nav-close" onClick={()=>setMenuOpen(false)} aria-label="Close navigation"><X size={20}/></button>}</div>
      <div className="workspace-identity"><span>{isAdmin?'AGENCY WORKSPACE':'CLIENT WORKSPACE'}</span><strong>{user.name}</strong><small>@{user.username}</small></div>
      <nav aria-label="Portal navigation">{nav.map(([id,label])=>{const Icon=icons[id];return <button type="button" key={id} className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>navigate(id)}>{isAdmin&&<Icon size={18}/>}<span>{label}</span>{!isAdmin&&<ArrowUpRight size={15}/>}</button>})}</nav>
      <div className="admin-sidebar-footer"><a href="/" className="workspace-return"><ArrowLeft size={16}/>Back to website</a><button type="button" className="workspace-logout" onClick={leave}><LogOut size={16}/>Sign out</button></div>
    </aside>
    <main ref={mainRef} className="workspace-main">
    {isAdmin&&<div className="admin-topbar"><div className="admin-topbar-start"><button ref={menuButton} type="button" className="admin-mobile-toggle" aria-label="Open navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><span>Ascore <strong>Studio</strong></span></div><div className="admin-search"><Search size={17}/><input ref={searchInput} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('')}} aria-label="Search workspace records and sections" placeholder="Search your workspace"/>{query&&<><button className="admin-search-clear" type="button" aria-label="Clear search" onClick={()=>{setQuery('');searchInput.current?.focus()}}><X size={15}/></button><div className="admin-search-results" role="region" aria-label="Workspace search results">{matches.length?matches.map(hit=><button type="button" key={hit.type+hit.id} onClick={()=>{if(hit.document){documentOpener.current=searchInput.current;setSelectedDocument(hit.document);setQuery('')}else navigate(hit.tab,hit.tab==='projects'?hit.id:undefined)}}><span>{hit.label}</span><small>{hit.type}</small></button>):<p>No matching saved records or sections.</p>}</div></>}</div><div className="admin-topbar-user"><span className="admin-avatar" aria-hidden="true">{user.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</span><span>{user.name}</span></div></div>}
    <div className="admin-content">
    <header className="workspace-header"><div><p>{isAdmin?'ASCORE / '+(tab==='courses'?'LEARNING':'STUDIO OPERATIONS'):'YOUR PROJECTS / IN FOCUS'}</p><h1>{nav.find(([id])=>id===tab)?.[1]}</h1>{isAdmin&&<p className="admin-page-description">{descriptions[tab]}</p>}</div><button type="button" onClick={refresh} aria-label="Refresh workspace"><RefreshCw size={18}/>{isAdmin&&<span>Refresh</span>}</button></header>
    {!isAdmin&&tab!=='courses'&&<p className="workspace-local">Financial tracking · Your saved project records</p>}
    {error&&<p className="portal-form-error" role="alert">{error}</p>}{notice&&<p className="portal-notice" role="status">{notice}</p>}
    {!loaded&&!error&&<p>Loading workspace…</p>}
    {loaded&&isAdmin&&(tab==='overview'||tab==='analytics')&&<AdminOverview data={data} groups={groups} user={user} onNavigate={navigate} refreshKey={refreshedAt} analytics={tab==='analytics'}/>}
    {loaded&&tab==='overview'&&!isAdmin&&<><div className="workspace-counts"><div><span>Projects</span><strong>{data.projects.length}</strong></div><div><span>Financial documents</span><strong>{data.documents.length}</strong></div>{isAdmin&&<div><span>Active leads</span><strong>{data.leads.filter(l=>!['won','lost'].includes(l.status)).length}</strong></div>}</div><h2>Invoice balances</h2>{Object.keys(groups).length?<div className="workspace-balances">{Object.entries(groups).map(([currency,total])=><article key={currency}><span>{currency}</span><p>Invoiced <strong>{money(total.amount,currency)}</strong></p><p>Recorded paid <strong>{money(total.paid,currency)}</strong></p><p>Outstanding <strong>{money(total.balance,currency)}</strong></p></article>)}</div>:<div className="workspace-empty">Your financial records will appear here when the agency creates them.</div>}<h2>Current projects</h2><ProjectList projects={data.projects} milestones={data.milestones}/></>}

    {loaded&&tab==='projects'&&<><ProjectList projects={data.projects} milestones={data.milestones}/>{isAdmin&&<div className="workspace-form-grid"><section className="workspace-panel"><h2>Create a project</h2><form onSubmit={submit('/projects')}><Select label="Client" name="clientId" required>{clientOptions}</Select><Field label="Project title" name="title" required maxLength={200}/><Field label="Description" name="description" maxLength={2000}/><Field label="Target date" name="targetLaunchDate" type="date"/><button disabled={busy||!data.clients.length}>Create project</button>{!data.clients.length&&<p className="admin-inline-help">A registered client account is required before creating a project.</p>}</form></section>{selectedProject&&<section className="workspace-panel"><h2>Update project</h2><Select label="Project" value={selectedProject.id} onChange={event=>setProjectId(event.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</Select><form key={`${selectedProject.id}-${selectedProject.updatedAt||selectedProject.createdAt}`} onSubmit={submit(`/projects/${selectedProject.id}`,v=>({...v,progressPercentage:Number(v.progressPercentage)}),'PATCH')}><Select label="Status" name="status" defaultValue={selectedProject.status}>{['active','in_review','completed','on_hold'].map(s=><option key={s}>{s}</option>)}</Select><Select label="Stage" name="currentStage" defaultValue={selectedProject.currentStage}>{['Discovery','Design','Development','QA','Launch'].map(s=><option key={s}>{s}</option>)}</Select><Field label="Progress (%)" name="progressPercentage" type="number" min="0" max="100" step="1" defaultValue={selectedProject.progressPercentage} required/><button disabled={busy}>Save project update</button></form><h3>Add milestone</h3><form onSubmit={submit('/milestones',v=>({...v,projectId:selectedProject.id}))}><Field label="Milestone" name="title" required/><Field label="Due date" name="dueDate" type="date"/><button disabled={busy}>Add milestone</button></form>{data.milestones.filter(m=>m.projectId===selectedProject.id).map(m=><div className="milestone-edit" key={m.id}><span>{m.title}</span><select aria-label={`Status for ${m.title}`} value={m.status} disabled={busy} onChange={event=>mutate(`/milestones/${m.id}`,{status:event.target.value},'PATCH')}>{['pending','in_progress','completed'].map(s=><option key={s}>{s}</option>)}</select></div>)}</section>}</div>}</>}

    {loaded&&tab==='documents'&&<><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Document</th><th>Type</th><th>Total</th><th>Balance</th><th>Status</th><th>View</th></tr></thead><tbody>{data.documents.map(d=><tr key={d.id}><td>{d.invoiceNumber}<small>{d.title}</small></td><td>{d.kind}</td><td>{money(d.amount,d.currency)}</td><td>{d.kind==='quotation'?'—':money(d.balance,d.currency)}</td><td>{d.status}{d.zoho&&<small>Books: {d.zoho.status} · {money(d.zoho.balance,d.zoho.currency)} outstanding<br/>Checked {new Date(d.zoho.checkedAt).toLocaleString()}</small>}</td><td><button type="button" onClick={event=>{documentOpener.current=event.currentTarget;setSelectedDocument(d)}}>Open</button></td></tr>)}</tbody></table>{!data.documents.length&&<p className="workspace-empty">No quotations or financial documents yet.</p>}</div>{isAdmin&&<div className="workspace-form-grid"><section className="workspace-panel"><h2>Create a tracking document</h2><form onSubmit={submit('/documents',v=>({...v,taxRate:Number(v.taxRate),items:[{description:v.description,amount:Number(v.amount)}]}))}><Select label="Type" name="kind"><option value="quotation">Quotation</option><option value="invoice">Invoice</option><option value="bill">Bill (agency only)</option></Select><Select label="Client account" name="clientId" required>{clientOptions}</Select><Select label="Project (optional)" name="projectId"><option value="">No project</option>{data.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</Select><Field label="Document title" name="title"/><Field label="Line item description" name="description" required maxLength={300}/><Field label="Subtotal" name="amount" type="number" min="0.01" step="0.01" required/><Select label="Currency" name="currency">{['AED','USD','EUR','GBP'].map(c=><option key={c}>{c}</option>)}</Select><Field label="Tax rate (%)" name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue="0" required/><Field label="Due date" name="dueDate" type="date"/><button disabled={busy||!data.clients.length}>Create tracking document</button>{!data.clients.length&&<p className="admin-inline-help">A registered client account is required before creating a document.</p>}</form></section><section className="workspace-panel"><h2>Record a settled amount</h2><p>Record an offline payment against an invoice or bill. This action only updates the local balance.</p><form onSubmit={submit(v=>`/documents/${v.documentId}/payment-records`,v=>({...v,amount:Number(v.amount)}))}><Select label="Invoice or bill" name="documentId" required><option value="">Select document</option>{data.documents.filter(d=>d.kind!=='quotation'&&d.balance>0).map(d=><option key={d.id} value={d.id}>{d.invoiceNumber} · {money(d.balance,d.currency)}</option>)}</Select><Field label="Amount received / paid" name="amount" type="number" min="0.01" step="0.01" required/><Field label="Date settled" name="paidDate" type="date" required/><Field label="Bank / receipt reference" name="reference" required maxLength={200}/><button disabled={busy}>Record settlement</button></form></section></div>}</>}

    {loaded&&tab==='leads'&&isAdmin&&<><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Lead</th><th>Company</th><th>Contact</th><th>Status</th></tr></thead><tbody>{data.leads.map(l=><tr key={l.id}><td>{l.name}<small>{l.notes}</small></td><td>{l.company||'—'}</td><td>{l.email||l.phone||'—'}</td><td><select aria-label={`Status for ${l.name}`} value={l.status} disabled={busy} onChange={event=>mutate(`/leads/${l.id}`,{status:event.target.value},'PATCH')}>{['new','contacted','qualified','proposal','won','lost'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>{!data.leads.length&&<p className="workspace-empty">No leads have been added yet.</p>}</div><section className="workspace-panel"><h2>Add a lead</h2><form className="workspace-fields-grid" onSubmit={submit('/leads')}><Field label="Name" name="name" required maxLength={100}/><Field label="Company" name="company" maxLength={160}/><Field label="Email" name="email" type="email"/><Field label="Phone" name="phone" maxLength={40}/><Field label="Notes"><textarea name="notes" maxLength={4000}/></Field><button disabled={busy}>Save lead</button></form></section></>}

    {loaded&&tab==='clients'&&isAdmin&&<><p>Registered client accounts appear here. Each account has its own projects and financial documents.</p><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Client</th><th>Username</th><th>Company</th><th>Email</th></tr></thead><tbody>{data.clients.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.username}</td><td>{c.company||'—'}</td><td>{c.email}</td></tr>)}</tbody></table>{!data.clients.length&&<p className="workspace-empty">No client accounts registered yet.</p>}</div></>}

    {loaded&&tab==='courses'&&isAdmin&&<CourseOrders refreshKey={refreshedAt}/>}
    {loaded&&tab==='connections'&&isAdmin&&<ZohoConnections data={data} onRefresh={refresh}/>}
    </div></main>{selectedDocument&&<DocumentSheet opener={documentOpener} document={selectedDocument} client={isAdmin?data.clients.find(c=>c.id===selectedDocument.clientId):user} onClose={()=>setSelectedDocument(null)}/>}
  </div>
}

function ProjectList({projects,milestones}) {
  if(!projects.length)return <div className="workspace-empty">No projects yet. Your agency will add the details when your project starts.</div>
  return <div className="workspace-projects">{projects.map(p=><article key={p.id}><div className="project-meta"><span>{p.status.replaceAll('_',' ')}</span><span>{p.currentStage}</span></div><h2>{p.title}</h2><p>{p.description}</p><div className="project-progress"><span style={{width:`${p.progressPercentage}%`}}/></div><div className="project-meta"><span>{p.progressPercentage}% complete</span><span>{p.targetLaunchDate?`Target ${p.targetLaunchDate}`:'Target date to be confirmed'}</span></div><ul>{milestones.filter(m=>m.projectId===p.id).map(m=><li key={m.id}><span>{m.title}</span><small>{m.status.replaceAll('_',' ')} {m.dueDate&&`· ${m.dueDate}`}</small></li>)}</ul></article>)}</div>
}
