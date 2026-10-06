import {createPaymentSetup} from './payment-setup.mjs'
import {courseReviewToken} from './course-reviews.mjs'
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto'
import {Webhook} from 'svix'
import {courseCatalog,privateCoursePdf,smtpConfigured,sender} from './courses.mjs'
import {verifyPaymentSchema} from './payment-schema.mjs'
import {uniqueConflict} from './persistence.mjs'

export const nomodWebhookPath='/api/courses/payments/nomod/webhook'
const api='https://api.nomod.com/v1/checkout'
const hash=value=>createHash('sha256').update(value).digest('hex')
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const constantEqual=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
const receiptToken=row=>hash(`${row.secret}:${row.id}:receipt`)
// Opaque, stable conversion identity; never a receipt/download capability.
export const coursePurchaseEventId=row=>hash(`ascore:meta:purchase:v1:${row.id}:${row.secret}`)
const downloadToken=(row,item)=>hash(`${row.secret}:${row.id}:download:${item}`)
const events=new Set(['charge.completed','charge.failed','charge.cancelled','charge.refunded','charge.partially_refunded','charge.dispute.created'])
const reviewEvents=new Set(['charge.refunded','charge.partially_refunded','charge.dispute.created'])
function minor(value){
 const text=typeof value==='number'&&Number.isFinite(value)?String(value):value
 if(typeof text!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(text))return null
 const [whole,fraction='']=text.split('.'),result=Number(whole)*100+Number(fraction.padEnd(2,'0'))
 return Number.isSafeInteger(result)?result:null
}
function selection(body){
 if(Object.keys(body).some(key=>!['requestId','email','items'].includes(key)))fail(400,'Checkout totals are calculated by the server.')
 if(!uuid(body.requestId)||!Array.isArray(body.items)||!body.items.length||body.items.length>2||body.items.some(id=>typeof id!=='string'||!Object.hasOwn(courseCatalog,id))||new Set(body.items).size!==body.items.length)fail(400,'Choose one or both courses and a valid checkout reference.')
 if(typeof body.email!=='string'||body.email.length>254||/[\u0000-\u001f\u007f]/.test(body.email)||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.email.trim()))fail(400,'Enter a valid email address.')
 return {requestId:body.requestId.toLowerCase(),items:[...body.items].sort(),email:body.email.trim().toLowerCase(),totalMinor:body.items.reduce((n,id)=>n+courseCatalog[id].priceMinor,0)}
}
export function nomodReturnURLs(origin,id){
 return Object.fromEntries(['success','failure','cancelled'].map(state=>[state+'_url',`${origin}/courses/checkout/?payment=${state}&order=${id}`]))
}
export function paidCourseEmail(row,origin){
 const links=JSON.parse(row.items).map(id=>`${courseCatalog[id].name}\n${origin}/api/courses/paid/download/${row.id}/${id}?token=${downloadToken(row,id)}`)
 return {from:{name:'Ascore Creative',address:'orders@ascore.ae'},to:row.email,messageId:`<paid-course-${row.id}@ascore.ae>`,subject:'Your Ascore course downloads',text:`Thank you for learning with Ascore.\n\nOrder: ${row.id}\nPayment confirmed: AED ${(Number(row.total_minor)/100).toFixed(2)}.\n\n${links.join('\n\n')}\n\nThese private links expire at ${new Date(Number(row.expires_at)).toISOString()} and allow up to 10 downloads per course. For help, contact info@ascore.ae.`,envelope:{from:'orders@ascore.ae',to:[row.email]}}
}
// The published application always leaves contractVerified false. Nomod's generic
// charge example does not establish the Hosted Checkout webhook correlation.
// Mock tests supply a verified fixture; production needs a reviewed contract update.
export async function createNomodCourses({db,env={},origin,readJson,fetcher=fetch,sendEmail,pdfReader=privateCoursePdf,contractVerified=false,audit=async()=>{},now=Date.now,workerInterval=60000}){
 const enabled=env.ASCORE_ENABLE_PAID_COURSES==='1',hosts=(env.NOMOD_CHECKOUT_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean)
 let schemaReady=false;try{await verifyPaymentSchema(db);schemaReady=true}catch{}
 const requirements={enabled,schemaReady,contractVerified:contractVerified===true,apiKeyConfigured:typeof env.NOMOD_HOSTED_CHECKOUT_API_KEY==='string'&&!!env.NOMOD_HOSTED_CHECKOUT_API_KEY,webhookSecretConfigured:typeof env.NOMOD_WEBHOOK_SIGNING_SECRET==='string'&&/^whsec_[A-Za-z0-9+/=]+$/.test(env.NOMOD_WEBHOOK_SIGNING_SECRET),checkoutHostsConfigured:hosts.length>0&&hosts.every(h=>/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(h)),liveRequestsApproved:env.ASCORE_NOMOD_LIVE_REQUESTS_APPROVED==='1',deliveryEnabled:env.ASCORE_ENABLE_PAID_COURSE_DELIVERY==='1',termsApproved:env.ASCORE_PAID_COURSE_TERMS_APPROVED==='1',senderConfigured:!!sendEmail||smtpConfigured(env),privatePdfsReady:false,originReady:(()=>{try{const u=new URL(origin);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&u.origin===origin}catch{return false}})()}
 if(enabled){try{await Promise.all(Object.keys(courseCatalog).map(id=>pdfReader(env,id)));requirements.privatePdfsReady=true}catch{}}
 const paymentSetup=createPaymentSetup({db,env,readJson,audit,isSchemaReady:()=>schemaReady,onReady:value=>{schemaReady=value;requirements.schemaReady=value}})
 const ready=()=>Object.values(requirements).every(Boolean)
 const mail=sendEmail||(requirements.senderConfigured?sender(env):null),flights=new Map(),eventFlights=new Map()
 const rowFor=id=>db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(id)
 const receipt=row=>({id:row.id,currency:'AED',totalMinor:Number(row.total_minor),paymentStatus:row.payment_status,delivery:JSON.parse(row.delivery).status,expiresAt:Number(row.expires_at),...(row.payment_status==='paid'?{items:JSON.parse(row.items),paymentEventId:coursePurchaseEventId(row),reviewToken:courseReviewToken(row)}:{})})
 async function limit(key,max,window){
  const r=await db.prepare(db.lock('SELECT count,expires FROM course_payment_limits WHERE `key`=?')).get(key),time=now()
  if(r&&Number(r.expires)>time){if(Number(r.count)>=max)fail(429,'Too many checkout requests. Try again later.');await db.prepare('UPDATE course_payment_limits SET count=count+1 WHERE `key`=?').run(key)}
  else if(r)await db.prepare('UPDATE course_payment_limits SET count=1,expires=? WHERE `key`=?').run(time+window,key)
  else await db.prepare('INSERT INTO course_payment_limits VALUES (?,?,?)').run(key,1,time+window)
 }
 async function providerRequest(method,path='',body){
  if(!ready())fail(503,'Purchasing is unavailable.')
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
  try{
   const response=await fetcher(api+path,{method,headers:{'X-API-KEY':env.NOMOD_HOSTED_CHECKOUT_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,redirect:'error'})
   if(!response.ok)fail(502,'Payment provider confirmation is unavailable.')
   const text=await response.text();if(Buffer.byteLength(text)>131072)fail(502,'Payment provider confirmation is unavailable.')
   return JSON.parse(text)
  }catch{fail(502,'Payment provider confirmation is unavailable.')}finally{clearTimeout(timer)}
 }
 function detailsMatch(details,row){return details?.id===row.provider_id&&details.reference_id===row.id&&details.currency==='AED'&&minor(details.amount)===Number(row.total_minor)}
 function checkoutURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||!hosts.includes(u.hostname))throw Error();return u.href}catch{fail(502,'Payment provider confirmation is unavailable.')}}
 async function hold(id,reason){await db.prepare('UPDATE course_paid_orders SET payment_status=?,review_reason=? WHERE id=?').run('review',reason,id)}
 async function confirm(id,{chargeId,eventType}={}){
  if(!ready())return
  const claim=await db.transaction(async()=>{const row=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE id=?')).get(id);if(!row?.provider_id||row.payment_status==='review')return null;if(!eventType&&Number(row.provider_checked_at)>now()-10000)return null;await db.prepare('UPDATE course_paid_orders SET provider_checked_at=? WHERE id=?').run(now(),id);return row})
  if(!claim)return
  const details=await providerRequest('GET','/'+claim.provider_id)
  if(!detailsMatch(details,claim)){await hold(id,'Provider reference, amount or currency does not match.');return}
  if(chargeId&&(!Array.isArray(details.charges)||!details.charges.some(c=>c.id===chargeId)))return {unmatched:true}
  if(reviewEvents.has(eventType)){await hold(id,'A refund or dispute requires team review.');return {matched:true}}
  // Created, authorised and redirects never authorize fulfilment. Both the
  // captured-event type (when supplied) and the independently fetched paid state
  // must agree with the exact stored checkout, price, currency and reference.
  if(details.status==='paid'&&(!eventType||eventType==='charge.completed')){
   const captured=Array.isArray(details.charges)?details.charges.filter(c=>c.status==='paid'):[]
   if(!captured.length||captured.some(c=>!uuid(c.id)||minor(c.amount)===null)||new Set(captured.map(c=>c.id)).size!==captured.length||captured.reduce((n,c)=>n+minor(c.amount),0)!==Number(claim.total_minor)||chargeId&&!captured.some(c=>c.id===chargeId)){await hold(id,'Captured charge evidence requires team review.');return {matched:true}}
   await db.transaction(async()=>{const row=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE id=?')).get(id);if(row.payment_status==='review')return;await db.prepare('UPDATE course_paid_orders SET payment_status=? WHERE id=?').run('paid',id);for(const item of JSON.parse(row.items)){if(!await db.prepare('SELECT uses FROM course_paid_downloads WHERE order_id=? AND course_id=?').get(id,item))await db.prepare('INSERT INTO course_paid_downloads VALUES (?,?,?)').run(id,item,0)}})
  }else if(['cancelled','expired'].includes(details.status))await db.prepare("UPDATE course_paid_orders SET payment_status=? WHERE id=? AND payment_status<>'paid' AND payment_status<>'review'").run(details.status,id)
  else if(!['created','paid'].includes(details.status))await hold(id,'Provider payment state requires team review.')
  return {matched:true}
 }
 async function deliver(id){
  if(!ready()||flights.has(id))return flights.get(id)
  const flight=(async()=>{
   const claim=await db.transaction(async()=>{
    const row=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE id=?')).get(id);if(!row||row.payment_status!=='paid'||Number(row.expires_at)<=now())return null;const d=JSON.parse(row.delivery)
    if(d.status==='sending'&&now()-d.at>120000){d.status='uncertain';await db.prepare('UPDATE course_paid_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id);return null}
    if(d.status!=='pending')return null;d.status='sending';d.at=now();d.claim=randomUUID();await db.prepare('UPDATE course_paid_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id);return {row,claim:d.claim}
   });if(!claim)return
   let error,result;try{for(const item of JSON.parse(claim.row.items))await pdfReader(env,item);const latest=await rowFor(id);if(latest.payment_status!=='paid')throw Error('Payment requires review');result=await mail(paidCourseEmail(claim.row,origin))}catch(e){error=e}
   await db.transaction(async()=>{const row=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE id=?')).get(id),d=JSON.parse(row.delivery);if(d.claim!==claim.claim||d.status!=='sending')return;d.status=error?'uncertain':'accepted';delete d.claim;if(!error)d.reference=typeof result?.reference==='string'?result.reference.slice(0,200):null;await db.prepare('UPDATE course_paid_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id)})
  })();flights.set(id,flight);try{await flight}finally{flights.delete(id)}
 }
 async function processEvent(eventId){
  if(!ready()||eventFlights.has(eventId))return
  const flight=(async()=>{
   const event=await db.transaction(async()=>{const row=await db.prepare(db.lock('SELECT * FROM course_payment_events WHERE event_id=?')).get(eventId);if(!row||row.state!=='queued')return null;await db.prepare('UPDATE course_payment_events SET state=? WHERE event_id=?').run('processing',eventId);return row});if(!event)return
   // No checkout identifier is guessed from the webhook. Independently retrieve
   // our own stored checkout and match its charges[] ID before using an event.
   try{
    const rows=await db.prepare('SELECT * FROM course_paid_orders WHERE provider_id IS NOT NULL AND expires_at>? ORDER BY created_at DESC LIMIT 101').all(now()),matches=[]
    if(rows.length>100)throw Error('Payment event requires bounded team reconciliation.')
    for(const row of rows){const details=await providerRequest('GET','/'+row.provider_id);if(detailsMatch(details,row)&&Array.isArray(details.charges)&&details.charges.some(c=>c.id===event.charge_id))matches.push(row)}
    if(matches.length!==1){await db.prepare('UPDATE course_payment_events SET state=?,reason=? WHERE event_id=?').run('needs_review','No unique verified checkout correlation.',eventId);return}
    const result=await confirm(matches[0].id,{chargeId:event.charge_id,eventType:event.event_type});if(!result?.matched){await db.prepare('UPDATE course_payment_events SET state=?,reason=? WHERE event_id=?').run('needs_review','Checkout correlation changed during verification.',eventId);return}
    await db.prepare('UPDATE course_payment_events SET state=?,reason=? WHERE event_id=?').run('processed',null,eventId);await deliver(matches[0].id)
   }catch{await db.prepare('UPDATE course_payment_events SET state=?,reason=? WHERE event_id=?').run('needs_review','Payment event confirmation needs team review.',eventId)}
  })();eventFlights.set(eventId,flight);try{await flight}finally{eventFlights.delete(eventId)}
 }
 async function tick(){
  if(!ready())return
  const pending=await db.prepare("SELECT event_id FROM course_payment_events WHERE state='queued' ORDER BY received_at LIMIT 25").all();for(const event of pending)await processEvent(event.event_id)
  const rows=await db.prepare("SELECT id FROM course_paid_orders WHERE payment_status='paid' AND expires_at>? ORDER BY created_at LIMIT 100").all(now());for(const row of rows)await deliver(row.id)
 }
 const interval=ready()?setInterval(()=>{tick().catch(()=>{})},workerInterval):null;interval?.unref()
 return {requirements,ready,confirm,deliver,tick,setupState:paymentSetup.state,adminHandle:paymentSetup.handle,
  async close(){if(interval)clearInterval(interval);await Promise.allSettled([...flights.values(),...eventFlights.values()])},
  async publicHandle(req,res,path,json){
   if(path===nomodWebhookPath&&req.method==='POST'){
    if(!schemaReady||!requirements.webhookSecretConfigured||env.ASCORE_ENABLE_NOMOD_WEBHOOKS!=='1')fail(503,'Payment notifications are not configured.')
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)fail(413,'Request is too large.');chunks.push(chunk)}const raw=Buffer.concat(chunks)
    let event;try{new Webhook(env.NOMOD_WEBHOOK_SIGNING_SECRET).verify(raw,{'svix-id':req.headers['svix-id'],'svix-timestamp':req.headers['svix-timestamp'],'svix-signature':req.headers['svix-signature']});event=JSON.parse(raw.toString('utf8'))}catch{fail(400,'Invalid payment notification signature.')}
    const svixId=req.headers['svix-id'];if(!event||typeof event.eventId!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(event.eventId)||typeof svixId!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(svixId)||typeof event.type!=='string'||event.type.length>64)fail(400,'Invalid payment notification.')
    const payloadHash=hash(raw),chargeId=uuid(event.data?.id)?event.data.id:null,state=!events.has(event.type)?'ignored':ready()&&chargeId?'queued':'needs_review'
    async function save(){await db.transaction(async()=>{const old=await db.prepare(db.lock('SELECT * FROM course_payment_events WHERE event_id=? OR svix_id=?')).get(event.eventId,svixId);if(old){if(old.event_id!==event.eventId||old.payload_hash!==payloadHash)fail(409,'Payment notification conflicts with a stored event.');return}await db.prepare('INSERT INTO course_payment_events VALUES (?,?,?,?,?,?,?,?)').run(event.eventId,svixId,payloadHash,event.type,chargeId,now(),state,state==='needs_review'?'Hosted Checkout correlation is not verified.':null)})}
    try{await save()}catch(error){if(!uniqueConflict(error))throw error;const old=await db.prepare('SELECT * FROM course_payment_events WHERE event_id=?').get(event.eventId);if(!old||old.payload_hash!==payloadHash)fail(409,'Payment notification conflicts with a stored event.')}
    json(res,200,{accepted:true});return true
   }
   if(path==='/api/courses/paid/orders'&&req.method==='POST'){
    if(!ready())fail(503,'Purchasing and PDF delivery are unavailable.')
    const q=selection(await readJson(req)),fingerprint=hash(JSON.stringify({items:q.items,email:q.email,totalMinor:q.totalMinor}));let row,created=false
    try{await db.transaction(async()=>{
     await limit('ip:'+hash(req.socket.remoteAddress||'local'),30,3600000)
     row=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE request_id=?')).get(q.requestId)
     if(row){if(row.payload_hash!==fingerprint)fail(409,'This checkout reference belongs to a different selection.');return}
     await limit('email:'+hash(q.email),5,3600000);await limit('global',100,86400000)
     const id=randomUUID(),time=now(),delivery=JSON.stringify({status:'pending'})
     await db.prepare('INSERT INTO course_paid_orders (id,request_id,payload_hash,email,items,total_minor,currency,secret,provider_id,provider_url,payment_status,created_at,expires_at,provider_checked_at,delivery,review_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,q.requestId,fingerprint,q.email,JSON.stringify(q.items),q.totalMinor,'AED',randomBytes(32).toString('hex'),null,null,'creating',time,time+86400000,0,delivery,null)
     row=await rowFor(id);created=true
    })}catch(error){if(!uniqueConflict(error)&&!['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code))throw error;row=await db.prepare('SELECT * FROM course_paid_orders WHERE request_id=?').get(q.requestId);if(!row||row.payload_hash!==fingerprint)fail(409,'Checkout is busy or changed. Retry the same selection.')}
    if(Number(row.expires_at)<=now())fail(410,'This checkout preview has expired. Start a new selection.')
    if(created){
     const amount=(q.totalMinor/100).toFixed(2),items=q.items.map(id=>({item_id:id,name:courseCatalog[id].name,quantity:1,unit_amount:(courseCatalog[id].priceMinor/100).toFixed(2),discount_type:'flat',discount_amount:'0.00',total_amount:(courseCatalog[id].priceMinor/100).toFixed(2),net_amount:(courseCatalog[id].priceMinor/100).toFixed(2)}))
     try{
      const result=await providerRequest('POST','',{reference_id:row.id,amount,currency:'AED',items,discount:'0.00',customer:{email:row.email},...nomodReturnURLs(origin,row.id)})
      if(!uuid(result.id)||!detailsMatch(result,{...row,provider_id:result.id})||!['created','paid','cancelled','expired'].includes(result.status))throw Error('Provider checkout does not match')
      const url=checkoutURL(result.url)
      await db.prepare('UPDATE course_paid_orders SET provider_id=?,provider_url=?,payment_status=? WHERE id=?').run(result.id,url,'pending',row.id)
     }catch{await db.prepare('UPDATE course_paid_orders SET payment_status=?,review_reason=? WHERE id=?').run('uncertain','Checkout creation outcome needs team review.',row.id);fail(502,'Checkout creation needs team review. Do not start another payment attempt.')}
     row=await rowFor(row.id)
    }else if(row.payment_status==='creating'&&now()-Number(row.created_at)>120000){await db.prepare('UPDATE course_paid_orders SET payment_status=?,review_reason=? WHERE id=?').run('uncertain','Interrupted checkout creation needs team review.',row.id);row=await rowFor(row.id)}
    if(['uncertain','review'].includes(row.payment_status))fail(409,'This checkout needs team review. Contact info@ascore.ae before another payment attempt.')
    json(res,row.provider_id?200:202,{...receipt(row),receiptToken:receiptToken(row),url:row.payment_status==='pending'?row.provider_url:null});return true
   }
   const orderMatch=/^\/api\/courses\/paid\/orders\/([0-9a-f-]+)$/i.exec(path)
   if(orderMatch&&req.method==='GET'){
    if(!schemaReady)fail(503,'Purchasing is unavailable.');const row=await rowFor(orderMatch[1]);if(!row||!constantEqual(req.headers['x-course-receipt'],receiptToken(row)))fail(404,'Order not found.')
    if(Number(row.expires_at)<=now())fail(410,'This order link has expired. Contact info@ascore.ae.')
    if(ready()){await confirm(row.id);await deliver(row.id)}json(res,200,receipt(await rowFor(row.id)));return true
   }
   const download=/^\/api\/courses\/paid\/download\/([0-9a-f-]+)\/(meta|ai)$/i.exec(path)
   if(download&&['GET','HEAD'].includes(req.method)){
    if(!ready())fail(503,'Course delivery is unavailable.');const [,id,item]=download,row=await rowFor(id),provided=new URL(req.url,'http://local.invalid').searchParams.get('token')
    if(!row||row.payment_status!=='paid'||row.currency!=='AED'||![4999,9998,5000,10000].includes(Number(row.total_minor))||!JSON.parse(row.items).includes(item)||!constantEqual(provided,downloadToken(row,item)))fail(404,'Download not found.')
    if(Number(row.expires_at)<=now())fail(410,'This download has expired. Contact info@ascore.ae.')
    let bytes;try{bytes=await pdfReader(env,item)}catch{fail(503,'Your course file is temporarily unavailable.')}
    await db.transaction(async()=>{await limit('download:'+hash(req.socket.remoteAddress||'local'),100,3600000);const current=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE id=?')).get(id);if(current.payment_status!=='paid')fail(404,'Download not found.');if(req.method==='GET'){const d=await db.prepare(db.lock('SELECT uses FROM course_paid_downloads WHERE order_id=? AND course_id=?')).get(id,item);if(!d||Number(d.uses)>=10)fail(410,'This download limit has been reached.');await db.prepare('UPDATE course_paid_downloads SET uses=uses+1 WHERE order_id=? AND course_id=?').run(id,item)}})
    res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Ascore-${item}-course.pdf"`,'Content-Length':bytes.length,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:bytes);return true
   }
   return false
  }
 }
}
