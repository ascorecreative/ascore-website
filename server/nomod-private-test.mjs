import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {courseCatalog} from './courses.mjs'
import {nomodOwnedHost} from './nomod-host.mjs'

// A finite owner action, permanently separate from public course fulfilment.
export const privateNomodRequestId='6ef0cd61-1c20-4b4b-b639-2040c48e417d'
export const privateNomodReason='Owner-only Nomod test v1; no fulfilment.'
export const isPrivateNomodTest=row=>row?.request_id===privateNomodRequestId||row?.review_reason===privateNomodReason
const owner=user=>user?.role==='admin'&&user.username==='aswinfrn'
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const hash=value=>createHash('sha256').update(value).digest('hex')
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export function createPrivateNomodTest({db,env,origin,readJson,audit,fetcher=fetch,now=Date.now,isSchemaReady}){
 let flight=null,recovery=null,recoveryAt=0
 const closed=()=>['ASCORE_ENABLE_PAID_COURSES','ASCORE_ENABLE_FREE_COURSES','ASCORE_ENABLE_PAID_COURSE_DELIVERY','ASCORE_NOMOD_LIVE_REQUESTS_APPROVED'].every(key=>env[key]!=='1')
 const originReady=()=>{try{const url=new URL(origin);return url.protocol==='https:'&&url.origin===origin}catch{return false}}
 const prerequisites=()=>closed()&&isSchemaReady()&&originReady()&&env.ASCORE_ENABLE_NOMOD_WEBHOOKS==='1'&&/^whsec_[A-Za-z0-9+/=]+$/.test(env.NOMOD_WEBHOOK_SIGNING_SECRET||'')&&!!env.NOMOD_HOSTED_CHECKOUT_API_KEY
 const prior=()=>db.prepare('SELECT * FROM course_paid_orders WHERE request_id=?').get(privateNomodRequestId)
 const view=row=>row?{state:JSON.parse(row.delivery).testState||'claimed',referenceId:row.id,checkoutId:row.provider_id||null,url:row.provider_url||null,createdAt:Number(row.created_at)}:{state:'not_created',checkoutId:null,url:null}
 async function status(user){
  if(!owner(user))return {ownerAllowed:false,allowed:false}
  const row=isSchemaReady()?await prior():null
  return {ownerAllowed:true,allowed:env.ASCORE_ALLOW_NOMOD_PRIVATE_TEST==='1'&&prerequisites()&&!row,operatorEnabled:env.ASCORE_ALLOW_NOMOD_PRIVATE_TEST==='1',prerequisitesReady:prerequisites(),inProgress:!!flight,amountMinor:4999,currency:'AED',...view(row)}
 }
 async function create(user,body){
  if(!owner(user))fail(403,'The private Nomod test is restricted to aswinfrn.')
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==1||body.confirmation!=='meta-4999-v1')fail(400,'Confirm only the approved one-time AED 49.99 Meta test.')
  if(!isSchemaReady())fail(503,'Verify the payment tables first.')
  // Retrieval of the durable claim is allowed after the temporary flag is off.
  const existing=await prior();if(existing)return {...view(existing),alreadyAttempted:true}
  if(env.ASCORE_ALLOW_NOMOD_PRIVATE_TEST!=='1'||!prerequisites())fail(403,'Private test creation is disabled. Approval, signed notifications and closed public checkout/delivery are required.')
  if(flight)return flight
  const task=(async()=>{
   const claim=await db.transaction(async()=>{
    const account=await db.prepare(db.lock('SELECT id,username,role FROM users WHERE id=?')).get(user.id)
    if(!owner(account))fail(403,'The existing approved owner account is required.')
    const row=await prior();if(row)return {row,created:false}
    const id=randomUUID(),time=now()
    await db.prepare('INSERT INTO course_paid_orders (id,request_id,payload_hash,email,items,total_minor,currency,secret,provider_id,provider_url,payment_status,created_at,expires_at,provider_checked_at,delivery,review_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,privateNomodRequestId,hash('meta-4999-v1'),'','["meta"]',4999,'AED',randomBytes(32).toString('hex'),null,null,'review',time,time+86400000,0,JSON.stringify({status:'held_private_test',testState:'claimed'}),privateNomodReason)
    await audit(user.id,'nomod_private_test_claimed',id)
    return {row:await prior(),created:true}
   })
   if(!claim.created)return {...view(claim.row),alreadyAttempted:true}
   const row=claim.row,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
   let result,url,state='uncertain'
   try{
    const returns=Object.fromEntries(['success','failure','cancelled'].map(value=>[value+'_url',`${origin}/portal/?view=courses&nomod_test=${row.id}&result=${value}`]))
    const payload={reference_id:row.id,amount:'49.99',currency:'AED',discount:'0.00',items:[{item_id:'meta',name:courseCatalog.meta.name,quantity:1,unit_amount:'49.99',discount_type:'flat',discount_amount:'0.00',total_amount:'49.99',net_amount:'49.99'}],...returns}
    const response=await fetcher('https://api.nomod.com/v1/checkout',{method:'POST',headers:{'X-API-KEY':env.NOMOD_HOSTED_CHECKOUT_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal,redirect:'error'})
    if(!response.ok)throw Error('Provider rejected creation')
    const parts=[];let size=0
    for await(const part of response.body||[]){size+=part.byteLength;if(size>131072){controller.abort();throw Error('Oversized response')}parts.push(Buffer.from(part))}
    result=JSON.parse(Buffer.concat(parts).toString('utf8'))
    if(!uuid(result.id)||result.reference_id!==row.id||result.currency!=='AED'||!['49.99',49.99].includes(result.amount)||result.status!=='created')throw Error('Unverified checkout response')
    const target=new URL(result.url)
    if(target.protocol!=='https:'||target.username||target.password||target.port||!nomodOwnedHost(target.hostname))throw Error('Unverified payment host')
    url=target.href;state='created'
   }catch{/* Never retry a live creation after an unknown response. */}finally{clearTimeout(timer)}
   await db.transaction(async()=>{
    await db.prepare('UPDATE course_paid_orders SET provider_id=?,provider_url=?,delivery=? WHERE id=?').run(state==='created'?result.id:null,state==='created'?url:null,JSON.stringify({status:'held_private_test',testState:state}),row.id)
    await audit(user.id,'nomod_private_test_'+state,row.id)
   })
   return {...view(await prior()),alreadyAttempted:false}
  })()
  flight=task;try{return await task}finally{if(flight===task)flight=null}
 }
 async function reconcile(user,body){
  if(!owner(user))fail(403,'The private Nomod test is restricted to aswinfrn.')
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['confirmation','checkoutUrl'].includes(key))||body.confirmation!=='reconcile-existing-meta-4999-v1')fail(400,'Confirm reconciliation of the existing private test only.')
  let knownUrl=null
  if(body.checkoutUrl!==undefined){
   try{const url=new URL(body.checkoutUrl);if(url.origin!=='https://pay.nomodapp.com'||!/^\/en\/l\/[a-f0-9]{16}\/$/.test(url.pathname)||url.search||url.hash||url.username||url.password)throw Error();knownUrl=url.href}catch{fail(400,'Enter only the existing Nomod payment link copied from the approved private attempt.')}
  }
  if(!prerequisites())fail(403,'Keep public purchasing and delivery closed, with the saved key and signed notifications configured.')
  const row=await prior()
  if(!row||!isPrivateNomodTest(row))fail(409,'No existing private attempt can be reconciled.')
  if(row.provider_id)return {...view(row),alreadyReconciled:true}
  if(flight)fail(409,'Wait for the existing creation attempt to finish before reconciling it.')
  if(recovery)return recovery
  if(recoveryAt&&now()-recoveryAt<60000)fail(429,'Wait one minute before another read-only recovery check.')
  recoveryAt=now()
  const task=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
   const read=async url=>{
    const response=await fetcher(url,{method:'GET',headers:{'X-API-KEY':env.NOMOD_HOSTED_CHECKOUT_API_KEY,'Content-Type':'application/json'},signal:controller.signal,redirect:'error'})
    if([401,403].includes(response.status))fail(502,'The saved Hosted Checkout key cannot read this lookup. Review the existing attempt in Nomod Dashboard; do not create another.')
    if(!response.ok)fail(502,'Nomod could not reconcile this existing attempt. No checkout was created.')
    const parts=[];let size=0
    for await(const chunk of response.body||[]){size+=chunk.byteLength;if(size>131072){controller.abort();fail(502,'Nomod returned an oversized reconciliation response.')}parts.push(Buffer.from(chunk))}
    return JSON.parse(Buffer.concat(parts).toString('utf8'))
   }
   try{
    let links=await read('https://api.nomod.com/v1/links?reference_id='+encodeURIComponent(row.id)+'&page_size=2'),link
    if(links.count===1&&Array.isArray(links.results)&&links.results.length===1&&links.results[0].reference_id===row.id)link=links.results[0]
    else if(knownUrl){
     // Link references can differ from the merchant's Checkout reference.
     // Search the fixed course title once, then match the exact copied URL.
     links=await read('https://api.nomod.com/v1/links?search='+encodeURIComponent(courseCatalog.meta.name)+'&page_size=2')
     const matches=Array.isArray(links.results)&&links.results.length<=2?links.results.filter(item=>item.url===knownUrl):[]
     if(matches.length===1)link=matches[0]
    }
    if(!link)fail(409,'Nomod did not return one matching existing link. Use its copied payment URL or review Dashboard; do not retry creation.')
    if(!uuid(link.id)||link.currency!=='AED'||!['49.99',49.99].includes(link.amount)||(knownUrl&&link.url!==knownUrl))fail(409,'The existing link does not match the approved private test.')
    // A Link ID is not assumed to be a Checkout ID: the Checkout endpoint must
    // independently authenticate the ID, reference, amount and payment URL.
    const checkout=await read('https://api.nomod.com/v1/checkout/'+link.id.toLowerCase())
    if(checkout.id?.toLowerCase()!==link.id.toLowerCase()||checkout.reference_id!==row.id||checkout.currency!=='AED'||!['49.99',49.99].includes(checkout.amount)||!['created','cancelled','expired','paid'].includes(checkout.status)||checkout.url!==link.url)fail(409,'Nomod did not verify the matching Hosted Checkout session.')
    const target=new URL(checkout.url)
    if(target.protocol!=='https:'||target.username||target.password||target.port||!nomodOwnedHost(target.hostname))fail(409,'Nomod returned an unverified payment host.')
    await db.transaction(async()=>{
     const current=await prior()
     if(current.provider_id)return
     await db.prepare('UPDATE course_paid_orders SET provider_id=?,provider_url=?,delivery=? WHERE id=?').run(checkout.id.toLowerCase(),target.href,JSON.stringify({status:'held_private_test',testState:'reconciled'}),row.id)
     await audit(user.id,'nomod_private_test_reconciled',row.id)
    })
    return {...view(await prior()),alreadyReconciled:false}
   }catch(error){if(error.status)throw error;fail(502,'Existing-checkout recovery failed. No checkout, charge, email or delivery was created.')}finally{clearTimeout(timer)}
  })()
  recovery=task;try{return await task}finally{if(recovery===task)recovery=null}
 }
 return {status,create,reconcile,close:async()=>{await Promise.allSettled([flight,recovery].filter(Boolean))},async handle(req,res,path,user,json){
  const recover=path==='/api/courses/admin/payments/private-test/reconcile'
  if(path!=='/api/courses/admin/payments/private-test'&&!recover)return false
  if(!owner(user))fail(403,'The private Nomod test is restricted to aswinfrn.')
  if(req.method==='GET'&&!recover){json(res,200,await status(user));return true}
  if(req.method!=='POST')fail(405,'Method not allowed.')
  json(res,200,await (recover?reconcile:create)(user,await readJson(req)));return true
 }}
}
