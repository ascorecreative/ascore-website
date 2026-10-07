import {useCallback,useEffect,useState} from 'react'
import {portalRequest} from '../../services/portalApi'
export default function CourseReviews(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const refresh=useCallback(async()=>{try{setData(await portalRequest('/courses/admin/reviews'))}catch(e){setError(e.message)}},[])
 useEffect(()=>{refresh()},[refresh])
 const action=async(path,body,method='POST')=>{if(busy)return;setBusy(true);setError('');setNotice('');try{await portalRequest('/courses/admin/reviews'+path,{method,body});setNotice(path==='/schema'?'Buyer reviews enabled. New reviews are saved for moderation before publication.':'Review moderation saved.');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="course-review-admin" aria-labelledby="course-review-admin-title"><header><div><h3 id="course-review-admin-title">Course review moderation</h3><p>Only reviews tied to verified paid course purchases can be submitted. Publication requires moderation.</p></div><button type="button" disabled={busy} onClick={refresh}>Refresh reviews</button></header>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {data&&<><p>Review storage: <strong>{data.schemaReady?'Ready':'Not initialized'}</strong> · Public submissions: <strong>{data.ready?'Enabled':'Disabled'}</strong></p>
   {!data.ready&&<div className="review-setup"><p>{data.setup?.reason==='payment_schema_required'?'Payment tables must be verified before buyer reviews can be enabled.':'The agency owner can enable verified-buyer reviews using the existing owned application database. New submissions require moderation.'}</p><button type="button" disabled={busy||!data.setup?.allowed} onClick={()=>action('/schema',{})}>Enable buyer reviews</button></div>}
   {data.reviews.map(review=><article className="moderation-review" key={review.id}><header><h4>{review.author} · {review.rating}/5</h4><span>{review.courseId==='meta'?'Meta Ads':'Practical AI'} · {review.state}</span></header><p>{review.body}</p><small>Submitted {new Date(review.createdAt).toLocaleString()}</small><div><button type="button" disabled={busy||review.state==='published'} onClick={()=>action('/'+review.id,{state:'published'},'PATCH')}>Publish review</button><button type="button" disabled={busy||review.state==='rejected'} onClick={()=>action('/'+review.id,{state:'rejected'},'PATCH')}>Reject review</button></div></article>)}
   {data.schemaReady&&!data.reviews.length&&<p>No course reviews have been submitted.</p>}
  </>}
 </section>
}
