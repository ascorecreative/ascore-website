import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {courseCatalog} from './courses.mjs'

// A finite owner action, permanently separate from public course fulfilment.
export const privateNomodRequestId='6ef0cd61-1c20-4b4b-b639-2040c48e417d'
export const privateNomodReason='Owner-only Nomod test v1; no fulfilment.'
export const isPrivateNomodTest=row=>row?.request_id===privateNomodRequestId||row?.review_reason===privateNomodReason
const owner=user=>user?.role==='admin'&&user.username==='aswinfrn'
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const hash=value=>createHash('sha256').update(value).digest('hex')
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export function createPrivateNomodTest({db,env,origin,readJson,audit,fetcher=fetch,now=Date.now,isSchemaReady}){
 let flight=null
 const closed=()=>['ASCORE_ENABLE_PAID_COURSES','ASCORE_ENABLE_FREE_COURSES','ASCORE_ENABLE_PAID_COURSE_DELIVERY','ASCORE_NOMOD_LIVE_REQUESTS_APPROVED'].every(key=>env[key]!=='1')
 const originReady=()=>{try{const url=new URL(origin);return url.protocol==='https:'&&url.origin===origin}catch{return false}}
 const prerequisites=()=>closed()&&isSchemaReady()&&originReady()&&env.ASCORE_ENABLE_NOMOD_WEBHOOKS==='1'&&/^whsec_[A-Za-z0-9+/=]+$/.test(env.NOMOD_WEBHOOK_SIGNING_SECRET||'')&&!!env.NOMOD_HOSTED_CHECKOUT_API_KEY
 const prior=()=>db.prepare('SELECT * FROM course_paid_orders WHERE request_id=?').get(privateNomodRequestId)
 const view=row=>row?{state:JSON.parse(row.delivery).testState||'claimed',checkoutId:row.provider_id||null,url:row.provider_url||null,createdAt:Number(row.created_at)}:{state:'not_created',checkoutId:null,url:null}
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
    if(target.protocol!=='https:'||target.username||target.password||target.port||!(target.hostname==='nomod.com'||target.hostname.endsWith('.nomod.com')))throw Error('Unverified payment host')
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
 return {status,create,close:async()=>{if(flight)await Promise.allSettled([flight])},async handle(req,res,path,user,json){
  if(path!=='/api/courses/admin/payments/private-test')return false
  if(!owner(user))fail(403,'The private Nomod test is restricted to aswinfrn.')
  if(req.method==='GET'){json(res,200,await status(user));return true}
  if(req.method!=='POST')fail(405,'Method not allowed.')
  json(res,200,await create(user,await readJson(req)));return true
 }}
}
