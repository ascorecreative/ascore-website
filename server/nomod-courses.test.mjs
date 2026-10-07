import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {randomUUID,randomBytes} from 'node:crypto'
import {Webhook} from 'svix'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {createNomodCourses,nomodWebhookPath} from './nomod-courses.mjs'
import {createPortalServer} from './app.mjs'
import {privateNomodRequestId,replacementNomodReason} from './nomod-private-test.mjs'

const origin='https://ascore.test',secret='whsec_'+randomBytes(32).toString('base64')
const configured={ASCORE_ENABLE_PAID_COURSES:'1',ASCORE_ENABLE_PAID_COURSE_DELIVERY:'1',ASCORE_ENABLE_NOMOD_WEBHOOKS:'1',ASCORE_PAID_COURSE_TERMS_APPROVED:'1',ASCORE_NOMOD_LIVE_REQUESTS_APPROVED:'1',NOMOD_HOSTED_CHECKOUT_API_KEY:'mock-key-not-a-real-credential',NOMOD_WEBHOOK_SIGNING_SECRET:secret,NOMOD_CHECKOUT_HOSTS:'checkout.nomod.example'}
async function readJson(req){const parts=[];for await(const c of req)parts.push(c);return JSON.parse(Buffer.concat(parts))}
async function harness(t,{contractVerified=true,env={},fetchFailure=false,mailFailure=false,checkoutState='created'}={}){
 const db=createSqliteStore();await initializePaymentSchema(db);const calls=[],mails=[],checkouts=new Map()
 const fetcher=async(url,options)=>{
  assert.ok(url.startsWith('https://api.nomod.com/v1/checkout'));calls.push({url,method:options.method,headers:options.headers,body:options.body&&JSON.parse(options.body)})
  if(fetchFailure)throw Error('Mock connection interrupted')
  if(options.method==='POST'){const body=JSON.parse(options.body),id=randomUUID(),row={id,url:`https://checkout.nomod.example/${id}`,status:checkoutState,amount:Number(body.amount),currency:body.currency,reference_id:body.reference_id,charges:[]};checkouts.set(id,row);return new Response(JSON.stringify(row))}
  return new Response(JSON.stringify(checkouts.get(url.split('/').at(-1))),{status:200})
 }
 const services={db,env:{...configured,...env},origin,readJson,fetcher,sendEmail:async m=>{mails.push(m);if(mailFailure)throw Error('Mock uncertain mail result');return {reference:'mock-mail'}},pdfReader:async()=>Buffer.from('%PDF-mock-private-fixture'),contractVerified,workerInterval:3600000}
 const payments=await createNomodCourses(services),server=createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');const json=(r,s,b)=>{r.writeHead(s,{'Content-Type':'application/json'});r.end(JSON.stringify(b))};try{if(!await payments.publicHandle(req,res,new URL(req.url,'http://local').pathname,json))json(res,404,{error:'Not found'})}catch(e){json(res,e.status||500,{error:e.status?e.message:'Server error'})}})
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`
 t.after(async()=>{await new Promise(r=>server.close(r));await payments.close();await db.close()})
 const request=async(path,{body,headers={},method}={})=>fetch(base+path,{method:method||(body?'POST':'GET'),headers:{...(body?{'Content-Type':'application/json'}:{}),Origin:origin,...headers},...(body?{body:typeof body==='string'?body:JSON.stringify(body)}:{})})
 const buy=async(items=['meta'],email='learner@example.com',requestId=randomUUID())=>{const r=await request('/api/courses/paid/orders',{body:{requestId,email,items}});return {response:r,order:await r.json(),requestId}}
 const paid=o=>{const row=checkouts.get(o.url.split('/').at(-1));row.status='paid';row.charges=[{id:randomUUID(),status:'paid',amount:row.amount}];return row}
 const webhook=async(event,{payload=JSON.stringify(event),messageId='msg_'+randomUUID(),date=new Date(),tamper=false}={})=>{const signature=new Webhook(secret).sign(messageId,date,payload);return request(nomodWebhookPath,{body:tamper?payload+' ':payload,headers:{'svix-id':messageId,'svix-timestamp':String(Math.floor(date.getTime()/1000)),'svix-signature':signature}})}
 return {db,payments,services,calls,mails,checkouts,request,buy,paid,webhook}
}
test('Nomod defaults closed even with keys: no schema writes, provider requests or delivery',async t=>{
 const h=await harness(t,{contractVerified:false});assert.equal(h.payments.ready(),false)
 assert.equal((await h.buy()).response.status,503);assert.equal(h.calls.length,0);assert.equal(h.mails.length,0)
 for(const field of ['ASCORE_ENABLE_PAID_COURSES','ASCORE_ENABLE_PAID_COURSE_DELIVERY','ASCORE_NOMOD_LIVE_REQUESTS_APPROVED','ASCORE_PAID_COURSE_TERMS_APPROVED']){const p=await createNomodCourses({...h.services,env:{...h.services.env,[field]:'0'}});assert.equal(p.ready(),false);await p.close()}
})
test('the observed enabled state remains unpaid and cannot trigger fulfilment or purchase identity',async t=>{
 const h=await harness(t,{checkoutState:'enabled'}),a=await h.buy()
 assert.equal(a.response.status,200);assert.equal(a.order.paymentStatus,'pending')
 const receipt=await (await h.request('/api/courses/paid/orders/'+a.order.id,{headers:{'x-course-receipt':a.order.receiptToken}})).json()
 assert.equal(receipt.paymentStatus,'pending');assert.equal(receipt.paymentEventId,undefined)
 await h.payments.tick();assert.equal(h.mails.length,0);assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM course_paid_downloads').get()).n,0)
})
test('paid sales overview counts confirmed revenue, excludes private tests and exposes no payment or download capabilities',async t=>{
 const h=await harness(t),paid=await h.buy(),pending=await h.buy(['ai']),original=await h.buy(),replacement=await h.buy()
 h.paid(paid.order);await h.payments.confirm(paid.order.id);await h.payments.deliver(paid.order.id)
 await h.db.prepare('UPDATE course_paid_orders SET request_id=?,payment_status=? WHERE id=?').run(privateNomodRequestId,'paid',original.order.id)
 await h.db.prepare('UPDATE course_paid_orders SET review_reason=?,payment_status=? WHERE id=?').run(replacementNomodReason,'paid',replacement.order.id)
 await assert.rejects(h.payments.salesOverview({role:'client'}),{status:403})
 const overview=await h.payments.salesOverview({role:'admin'})
 assert.deepEqual(overview.summary,{checkoutAttempts:2,paidOrders:1,paidRevenueMinor:4999,needsReview:0})
 assert.deepEqual(new Set(overview.orders.map(row=>row.id)),new Set([paid.order.id,pending.order.id]))
 assert.equal(overview.orders.find(row=>row.id===paid.order.id).delivery,'accepted')
 assert.equal(overview.orders.find(row=>row.id===pending.order.id).paymentStatus,'pending')
 const serialized=JSON.stringify(overview),stored=await h.db.prepare('SELECT secret,provider_url FROM course_paid_orders WHERE id=?').get(paid.order.id)
 assert.ok(!serialized.includes(stored.secret));assert.ok(!serialized.includes(stored.provider_url));assert.ok(!serialized.includes(paid.order.receiptToken))
 assert.equal(h.calls.filter(call=>call.method==='POST').length,4);assert.equal(h.mails.length,1)
})
test('Nomod checkout is server-priced, retry-idempotent and stores its mapping before redirect',async t=>{
 const h=await harness(t),a=await h.buy(['meta','ai']);assert.equal(a.response.status,200);assert.equal(a.order.totalMinor,9998);assert.equal(h.calls.length,1)
 const call=h.calls[0];assert.equal(call.headers['X-API-KEY'],configured.NOMOD_HOSTED_CHECKOUT_API_KEY);assert.equal(call.body.amount,'99.98');assert.equal(call.body.currency,'AED');assert.equal(call.body.reference_id,a.order.id);assert.notEqual(a.order.id,a.requestId);assert.deepEqual(call.body.items.map(i=>[i.item_id,i.quantity,i.unit_amount]),[['ai',1,'49.99'],['meta',1,'49.99']]);assert.equal(call.body.success_url,`${origin}/courses/checkout/?payment=success&order=${a.order.id}`);assert.equal(call.body.failure_url,`${origin}/courses/checkout/?payment=failure&order=${a.order.id}`);assert.equal(call.body.cancelled_url,`${origin}/courses/checkout/?payment=cancelled&order=${a.order.id}`)
 const retry=await h.buy(['meta','ai'],'learner@example.com',a.requestId);assert.equal(retry.order.id,a.order.id);assert.equal(h.calls.length,1)
 assert.equal((await h.buy(['meta'],'learner@example.com',a.requestId)).response.status,409)
 const malicious=await h.request('/api/courses/paid/orders',{body:{requestId:randomUUID(),items:['meta'],email:'learner@example.com',amount:'1.00'}});assert.equal(malicious.status,400)
 assert.equal((await h.buy(['meta','meta'])).response.status,400);assert.equal(h.mails.length,0)
 const stored=await h.db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(a.order.id);assert.equal(stored.provider_id,a.order.url.split('/').at(-1));assert.equal(stored.payment_status,'pending')
})
test('unknown checkout creation is never automatically retried, including concurrent calls',async t=>{
 const h=await harness(t,{fetchFailure:true}),id=randomUUID();const result=await Promise.all([h.buy(['meta'],'retry@example.com',id),h.buy(['meta'],'retry@example.com',id)]);assert.ok(result.some(r=>r.response.status===502));assert.equal(h.calls.filter(c=>c.method==='POST').length,1);assert.equal((await h.buy(['meta'],'retry@example.com',id)).response.status,409);assert.equal(h.mails.length,0)
})
test('paid state requires exact reference, amount, currency and captured-charge evidence',async t=>{
 for(const change of [r=>r.amount=50,r=>r.currency='USD',r=>r.reference_id=randomUUID(),r=>r.charges[0].status='authorised']){
  const h=await harness(t),a=await h.buy(),row=h.paid(a.order);change(row);await h.payments.confirm(a.order.id);await h.payments.deliver(a.order.id);assert.equal(h.mails.length,0);assert.equal((await h.db.prepare('SELECT payment_status FROM course_paid_orders WHERE id=?').get(a.order.id)).payment_status,'review')
 }
})
test('a redirect, created session or authorisation does not fulfill or expose a PDF',async t=>{
 const h=await harness(t),a=await h.buy();await h.payments.confirm(a.order.id);await h.payments.deliver(a.order.id);assert.equal(h.mails.length,0)
 const r=await h.request(`/api/courses/paid/orders/${a.order.id}?payment=success`,{headers:{'x-course-receipt':a.order.receiptToken}});assert.equal((await r.json()).paymentStatus,'pending');assert.equal((await h.request(`/api/courses/paid/download/${a.order.id}/meta?token=${a.order.receiptToken}`)).status,404)
 const auth=await h.webhook({type:'charge.authorised',eventId:randomUUID(),data:{id:randomUUID()}});assert.equal(auth.status,200);await h.payments.tick();assert.equal(h.mails.length,0)
})
test('Purchase identity is absent before captured payment and stable without exposing capabilities',async t=>{
 const h=await harness(t),a=await h.buy()
 assert.equal(a.order.paymentEventId,undefined)
 h.paid(a.order);await h.payments.confirm(a.order.id)
 const get=async()=>{const r=await h.request(`/api/courses/paid/orders/${a.order.id}`,{headers:{'x-course-receipt':a.order.receiptToken}});assert.equal(r.status,200);return r.json()}
 const first=await get(),second=await get()
 assert.equal(first.paymentStatus,'paid');assert.equal(first.totalMinor,4999);assert.equal(first.currency,'AED');assert.deepEqual(first.items,['meta'])
 assert.match(first.paymentEventId,/^[a-f0-9]{64}$/);assert.equal(first.paymentEventId,second.paymentEventId);assert.notEqual(first.paymentEventId,a.order.receiptToken)
 assert.equal(first.email,undefined);assert.equal(first.secret,undefined)
 const wrong=await h.request(`/api/courses/paid/orders/${a.order.id}`,{headers:{'x-course-receipt':first.paymentEventId}});assert.equal(wrong.status,404)
 const other=await h.buy(['ai'],'other@example.com');h.paid(other.order);await h.payments.confirm(other.order.id)
 const b=await(await h.request(`/api/courses/paid/orders/${other.order.id}`,{headers:{'x-course-receipt':other.order.receiptToken}})).json();assert.notEqual(first.paymentEventId,b.paymentEventId)
})
test('raw signed events reject tampering and stale timestamps and durably deduplicate before acknowledgment',async t=>{
 const h=await harness(t),a=await h.buy(),row=h.paid(a.order),event={type:'charge.completed',eventId:randomUUID(),data:{id:row.charges[0].id}},payload=JSON.stringify(event,null,2)+'\n'
 assert.equal((await h.webhook(event,{payload,tamper:true})).status,400);assert.equal((await h.webhook(event,{date:new Date(Date.now()-600000)})).status,400);assert.equal((await h.request(nomodWebhookPath,{body:payload})).status,400)
 assert.equal((await h.webhook(event,{payload})).status,200);assert.equal((await h.db.prepare('SELECT state FROM course_payment_events WHERE event_id=?').get(event.eventId)).state,'queued');assert.equal(h.mails.length,0)
 assert.equal((await h.webhook(event,{payload})).status,200);assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM course_payment_events').get()).n,1)
 await h.payments.tick();await h.payments.tick();assert.equal(h.mails.length,1);assert.equal((await h.db.prepare('SELECT state FROM course_payment_events WHERE event_id=?').get(event.eventId)).state,'processed')
})
test('an uncorrelated signed event is quarantined, while a full refund revokes later downloads',async t=>{
 const h=await harness(t),a=await h.buy(),row=h.paid(a.order);await h.webhook({type:'charge.completed',eventId:randomUUID(),data:{id:randomUUID()}});await h.payments.tick();assert.equal(h.mails.length,0)
 await h.payments.confirm(a.order.id);await h.payments.deliver(a.order.id);assert.equal(h.mails.length,1);const url=h.mails[0].text.match(/https:\/\/ascore\.test\/api\/courses\/paid\/download\/[^\s]+/)[0],path=new URL(url).pathname+new URL(url).search
 assert.equal((await h.request(path,{method:'HEAD'})).status,200);assert.equal((await h.db.prepare('SELECT uses FROM course_paid_downloads WHERE order_id=? AND course_id=?').get(a.order.id,'meta')).uses,0);assert.equal((await h.request(path)).status,200)
 await h.webhook({type:'charge.refunded',eventId:randomUUID(),data:{id:row.charges[0].id}});await h.payments.tick();assert.equal((await h.request(path)).status,404);assert.equal(h.mails.length,1)
})
test('separate workers persist delivery claims and never duplicate or retry uncertain mail',async t=>{
 const h=await harness(t),a=await h.buy();h.paid(a.order);await h.payments.confirm(a.order.id);const second=await createNomodCourses(h.services);t.after(()=>second.close());await Promise.all([h.payments.deliver(a.order.id),second.deliver(a.order.id)]);await second.tick();assert.equal(h.mails.length,1)
 const uncertain=await harness(t,{mailFailure:true}),b=await uncertain.buy();uncertain.paid(b.order);await uncertain.payments.confirm(b.order.id);await uncertain.payments.deliver(b.order.id);await uncertain.payments.tick();assert.equal(uncertain.mails.length,1);assert.equal(JSON.parse((await uncertain.db.prepare('SELECT delivery FROM course_paid_orders WHERE id=?').get(b.order.id)).delivery).status,'uncertain')
})
test('production application keeps Nomod closed and only the signed webhook path is origin-exempt',async t=>{
 const db=createSqliteStore();await initializePaymentSchema(db);let calls=0;const app=await createPortalServer({store:db,env:{...configured,ASCORE_ORIGIN:origin},nomodFetch:async()=>{calls++;throw Error('No network allowed')},courseSender:async()=>{throw Error('No email allowed')},coursePdfReader:async()=>Buffer.from('%PDF-test')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 assert.deepEqual(await(await fetch(base+'/api/courses/config')).json(),{freeCheckoutReady:false,paidCheckoutEnabled:false})
 assert.equal((await fetch(base+'/api/courses/paid/orders',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({items:['meta'],email:'learner@example.com',requestId:randomUUID()})})).status,503)
 assert.equal((await fetch(base+'/api/courses/paid/orders',{method:'POST',body:'{}'})).status,403)
 assert.equal((await fetch(base+nomodWebhookPath,{method:'POST',body:'{}'})).status,400)
 assert.equal((await fetch(base+'/api/courses/admin/assets/meta',{method:'PUT',body:'%PDF-test'})).status,403);assert.equal(calls,0)
})
