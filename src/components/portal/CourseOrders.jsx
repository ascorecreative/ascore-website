import {useCallback,useEffect,useState} from 'react'
import {portalRequest,portalUpload} from '../../services/portalApi'
const money=minor=>new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED'}).format(minor/100)
const dates=time=>new Date(time).toLocaleString('en-AE',{dateStyle:'medium',timeStyle:'short'})
const names={meta:'Meta Ads',ai:'Practical AI'}
const labels={pending:'Queued',sending:'Sending',accepted:'Email accepted',failed:'Email rejected',uncertain:'Needs review'}
export default function CourseOrders(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState('all'),[files,setFiles]=useState({})
 const refresh=useCallback(async(cursor=null)=>{
  setBusy(true);setError('')
  try{const result=await portalRequest('/courses/admin/orders'+(cursor?'?cursor='+encodeURIComponent(cursor):''));setData(previous=>cursor?{...result,orders:[...(previous?.orders||[]),...result.orders]}:result)}catch(e){setError(e.message)}finally{setBusy(false)}
 },[])
 useEffect(()=>{refresh()},[refresh])
 const upload=async id=>{
  if(!files[id]||busy)return;setBusy(true);setError('');setNotice('')
  try{await portalUpload('/courses/admin/assets/'+id,files[id]);setFiles(current=>({...current,[id]:null}));setNotice(`${names[id]} PDF verified and installed in private storage.`);await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const retry=async order=>{
  if(!window.confirm(`Retry the confirmed failed email for order ${order.id} to ${order.email}?`))return
  setBusy(true);setError('');setNotice('')
  try{await portalRequest('/courses/admin/orders/'+order.id+'/retry',{method:'POST',body:{}});setNotice('The email retry is queued. Refresh to check the outcome.');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const visible=data?.orders.filter(order=>filter==='all'||order.delivery===filter)||[],summary=data?.summary
 return <section className="course-operations">
  <div className="course-operations-heading"><div><p>Private team operations</p><h2>Course orders & delivery</h2><p>FREE orders are recorded separately from paid sales. Email accepted means the mail server accepted it; inbox delivery is not guaranteed.</p></div><button type="button" onClick={()=>refresh()} disabled={busy}>{busy?'Loading…':'Refresh orders'}</button></div>
  {error&&<p className="portal-form-error" role="alert">{error}</p>}{notice&&<p className="portal-notice" role="status">{notice}</p>}
  {!data&&!error&&<p role="status">Loading course records…</p>}
  {data&&<>
   <section className="workspace-panel course-setup"><h3>{data.ready?'FREE delivery is ready':'Delivery setup'}</h3><ul>{[['enabled','FREE orders enabled'],['schemaReady','Course database initialized'],['privatePdfsReady','Both private PDFs verified'],['senderConfigured','SMTP sender configured']].map(([key,label])=><li key={key}><span>{label}</span><strong className={data.requirements[key]?'is-ready':'is-pending'}>{data.requirements[key]?'Ready':'Pending'}</strong></li>)}</ul><p>Paid checkout remains disabled. Failed emails with an uncertain outcome need team review and cannot be automatically resent.</p></section>
   <div className="workspace-counts course-metrics"><div><span>FREE test orders</span><strong>{summary?summary.freeOrders:'—'}</strong></div><div><span>Paid orders</span><strong>{summary?summary.paidOrders:'—'}</strong></div><div><span>Paid revenue</span><strong>{summary?money(summary.paidRevenueMinor):'—'}</strong></div><div><span>Emails accepted</span><strong>{summary?summary.emailsAccepted:'—'}</strong></div></div>
   {!data.requirements.schemaReady&&<p className="portal-notice">The course tables need initialization before orders or analytics are available.</p>}
   <div className="workspace-form-grid">{data.assets?.map(asset=><section className="workspace-panel course-asset" key={asset.id}><h3>{asset.name}</h3><p>{asset.installed?'Approved PDF is installed privately.':'Approved PDF has not been installed.'}</p><label>Approved course PDF<input type="file" accept="application/pdf,.pdf" disabled={busy||!data.storageConfigured} onChange={event=>{const file=event.target.files?.[0];if(file&&file.size>8*1024*1024){setError('Choose a PDF no larger than 8 MB.');setFiles(current=>({...current,[asset.id]:null}));return}setFiles(current=>({...current,[asset.id]:file||null}))}}/></label><button type="button" onClick={()=>upload(asset.id)} disabled={busy||!files[asset.id]||!data.storageConfigured}>Verify & install private PDF</button><p className="course-help">Only the approved edition is accepted. The PDF stays outside the public site and Git. {data.storageConfigured?'':'Private storage must be configured first.'}</p></section>)}</div>
   <section className="workspace-panel"><h3>Orders by day · Last seven days (UTC)</h3>{data.daily?.length?<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Date</th><th>FREE orders</th><th>Paid orders</th><th>Paid revenue</th></tr></thead><tbody>{data.daily.map(day=><tr key={day.date}><td>{day.date}</td><td>{day.freeOrders}</td><td>{day.paidOrders}</td><td>{money(day.paidRevenueMinor)}</td></tr>)}</tbody></table></div>:<p>{summary?'No course orders in the last seven days.':'Analytics await course database setup.'}</p>}</section>
   <div className="course-order-filter"><h3>Order history</h3><label>Delivery status<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(labels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label></div>
   <div className="workspace-table-wrap"><table className="workspace-table course-orders-table"><thead><tr><th>Order / email</th><th>Courses</th><th>Type / total</th><th>Delivery</th><th>Downloads expire</th><th>Action</th></tr></thead><tbody>{visible.map(order=><tr key={order.id}><td><strong>{dates(order.createdAt)}</strong><small className="course-order-id">{order.id}</small><span>{order.email}</span></td><td>{order.items.map(id=>names[id]).join(' + ')}</td><td>FREE test<small>{money(order.totalMinor)} · {order.coupon}</small></td><td>{labels[order.delivery]||order.delivery}<small>{order.attempts} {order.attempts===1?'attempt':'attempts'}{order.lastAttempt?' · '+dates(order.lastAttempt):''}</small>{order.reason&&<small>{order.reason}</small>}</td><td>{dates(order.expiresAt)}</td><td>{order.canRetry?<button type="button" disabled={busy} onClick={()=>retry(order)}>Retry rejected email</button>:order.delivery==='uncertain'?'Review provider logs':'—'}</td></tr>)}</tbody></table>{!visible.length&&<p className="workspace-empty">{summary?'No orders match this view.':'Course order history awaits database setup.'}</p>}</div>
   {data.nextCursor&&<button type="button" disabled={busy} onClick={()=>refresh(data.nextCursor)}>Load older orders</button>}
  </>}
 </section>
}
