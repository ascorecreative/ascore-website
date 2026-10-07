import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {mkdtempSync,rmSync,writeFileSync,chmodSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createPortalServer} from './app.mjs'
import {privateCoursePdf,courseCatalog} from './courses.mjs'
const origin='http://127.0.0.1:5173'
const fixture=Buffer.from('%PDF-1.7\nSynthetic test fixture, not a course PDF.')
async function start(options={}){
 const messages=[],time={value:Date.now()},grant='synthetic-test-grant'
 const env={ASCORE_ENABLE_FREE_COURSES:'1',ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(grant).digest('hex'),expiresAt:new Date(Date.now()+3600000).toISOString()}}),...options.env}
 const portal=await createPortalServer({dbPath:':memory:',origin,env,coursePdfReader:async()=>fixture,courseSender:async m=>{messages.push(m);return {reference:'synthetic-mail'}},now:()=>time.value,...options,env})
 await new Promise(r=>portal.server.listen(0,'127.0.0.1',r))
 const base=`http://127.0.0.1:${portal.server.address().port}`,call=async(path,body,headers={})=>{const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {response,status:response.status,data:await response.json()}}
 const post=body=>call('/api/courses/orders',body),body=()=>({requestId:randomUUID(),items:['meta','ai'],coupon:'FREE',email:'customer@example.com'}),status=order=>call('/api/courses/orders/'+order.id,null,{'x-course-receipt':order.receiptToken})
 async function settled(order){for(let n=0;n<100;n++){const r=await status(order);if(!['pending','sending'].includes(r.data.delivery))return r;await new Promise(r=>setTimeout(r,5))}throw Error('Test delivery did not settle')}
 async function auth(admin=false){const r=await call(admin?'/api/auth/admin-setup':'/api/auth/register',admin?{username:'aswinfrn',name:'Synthetic admin',password:'synthetic test password 123',setupToken:grant}:{username:'testclient',email:'client@example.com',name:'Synthetic client',company:'Test',password:'synthetic test password 123'});assert.equal(r.status,201);return {Cookie:r.response.headers.get('set-cookie').split(';')[0],'x-csrf-token':r.data.csrf}}
 return {portal,base,call,post,body,status,settled,messages,time,auth}
}
test('FREE quote is server-priced, deduplicated and refuses client-controlled totals or paid checkout',async t=>{
 const a=await start();t.after(()=>a.portal.close())
 const one=await a.call('/api/courses/quote',{items:['meta'],coupon:' free '});assert.equal(one.status,200);assert.deepEqual([one.data.subtotalMinor,one.data.discountMinor,one.data.totalMinor],[200,200,0])
 const both=await a.call('/api/courses/quote',{items:['ai','meta'],coupon:'FREE'});assert.equal(both.data.subtotalMinor,400)
 for(const payload of [{items:['meta','meta'],coupon:'FREE'},{items:['unknown'],coupon:'FREE'},{items:[],coupon:'FREE'},{items:['meta'],coupon:''},{items:['meta'],coupon:'FREE',total:0}])assert.equal((await a.call('/api/courses/quote',payload)).status,400)
 assert.equal((await a.post({...a.body(),coupon:''})).status,400);assert.equal((await a.post({...a.body(),totalMinor:0})).status,400);assert.equal(a.messages.length,0)
})
test('zero-value order persists once, emails the customer privately, and rejects changed/invalid retries',async t=>{
 const a=await start();t.after(()=>a.portal.close());const body=a.body(),orders=await Promise.all([a.post(body),a.post(body)])
 orders.forEach(r=>assert.equal(r.status,202));const order=orders[0].data;assert.equal(order.totalMinor,0);assert.equal(order.paymentStatus,'free');assert.equal((await a.settled(order)).data.delivery,'accepted');assert.equal(a.messages.length,1)
 assert.equal(a.messages[0].to,body.email);assert.equal(a.messages[0].envelope.to[0],body.email);assert.match(a.messages[0].text,/FREE coupon applied/);assert.match(a.messages[0].text,/\/api\/courses\/download/);assert.ok(!a.messages[0].attachments)
 assert.equal((await a.post(body)).status,202);assert.equal(a.messages.length,1)
 assert.equal((await a.post({...body,email:'other@example.com'})).status,409);assert.equal((await a.post({...a.body(),email:'bad\r\nBcc: victim@example.com'})).status,400);assert.equal((await a.post({...a.body(),email:'bad\u0000@example.com'})).status,400)
 assert.equal((await a.call('/api/courses/orders/'+order.id)).status,404)
})
test('downloads bind course and order, block tampering/expiry, avoid caching and do not consume HEAD',async t=>{
 const a=await start();t.after(()=>a.portal.close());const order=(await a.post({...a.body(),items:['meta']})).data;await a.settled(order)
 const link=a.messages[0].text.match(/http[^\s]+\/download\/[^\s]+/)[0],url=new URL(link);url.host=new URL(a.base).host
 const get=()=>fetch(url);let r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.equal(r.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await r.arrayBuffer()),fixture)
 const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0)
 const other=new URL(url);other.pathname=other.pathname.replace('/meta','/ai');assert.equal((await fetch(other)).status,404)
 const tamper=new URL(url);tamper.searchParams.set('token','0'.repeat(64));assert.equal((await fetch(tamper)).status,404)
 for(let n=1;n<10;n++)assert.equal((await get()).status,200);assert.equal((await get()).status,410)
 a.time.value+=86400001;assert.equal((await get()).status,410)
})
test('disabled or incomplete delivery cannot create orders or report sent mail, and wrong origin is refused',async t=>{
 const a=await start({env:{ASCORE_ENABLE_FREE_COURSES:'0'},courseSender:undefined});t.after(()=>a.portal.close());assert.equal((await a.call('/api/courses/config')).data.freeCheckoutReady,false);assert.equal((await a.post(a.body())).status,503)
 const r=await fetch(a.base+'/api/courses/orders',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body:JSON.stringify(a.body())});assert.equal(r.status,403)
 const b=await start({coursePdfReader:async()=>{throw Error('Missing private assets')}});t.after(()=>b.portal.close());assert.equal((await b.post(b.body())).status,503);assert.equal(b.messages.length,0)
})
test('persistent email limits prevent free checkout from becoming a spam endpoint',async t=>{
 const a=await start();t.after(()=>a.portal.close());for(let i=0;i<3;i++)assert.equal((await a.post(a.body())).status,202);assert.equal((await a.post(a.body())).status,429)
})
test('separate instances share order and delivery claims, survive restart and do not duplicate email',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'ascore-courses-')),dbPath=join(directory,'orders.sqlite');let sends=0
 const opts={dbPath,courseSender:async()=>{sends++;await new Promise(r=>setTimeout(r,30));return {reference:'synthetic'}}}
 const a=await start(opts),b=await start(opts);t.after(async()=>{await b.portal.close();rmSync(directory,{recursive:true,force:true})})
 const body=a.body(),results=await Promise.all([a.post(body),b.post(body)]);results.forEach(r=>assert.equal(r.status,202));assert.equal((await a.settled(results[0].data)).data.delivery,'accepted');assert.equal(sends,1);await a.portal.close()
 const restarted=await start(opts);t.after(()=>restarted.portal.close());assert.equal((await restarted.post(body)).status,202);assert.equal((await restarted.settled(results[0].data)).data.delivery,'accepted');assert.equal(sends,1)
})
test('uncertain email is never resent; confirmed temporary rejection obeys cooldown and retry safety',async t=>{
 let sends=0;const a=await start({courseSender:async()=>{sends++;throw Error('Unknown outcome after SMTP DATA')}});t.after(()=>a.portal.close());const body=a.body(),order=(await a.post(body)).data;assert.equal((await a.settled(order)).data.delivery,'uncertain');a.time.value+=180000;await a.post(body);await new Promise(r=>setTimeout(r,20));assert.equal(sends,1)
 let attempts=0;const b=await start({courseSender:async()=>{attempts++;if(attempts===1)throw Object.assign(Error('Confirmed SMTP rejection'),{responseCode:450});return {reference:'accepted'}}});t.after(()=>b.portal.close());const payload=b.body(),receipt=(await b.post(payload)).data;assert.equal((await b.settled(receipt)).data.delivery,'failed');await b.post(payload);assert.equal(attempts,1);b.time.value+=61000;await b.post(payload);assert.equal((await b.settled(receipt)).data.delivery,'accepted');assert.equal(attempts,2)
})
test('team analytics enforce existing role and CSRF checks, report genuine zero revenue and redact capabilities',async t=>{
 const a=await start();t.after(()=>a.portal.close());const order=(await a.post(a.body())).data;await a.settled(order)
 assert.equal((await a.call('/api/courses/admin/orders')).status,401);const client=await a.auth();assert.equal((await a.call('/api/courses/admin/orders',null,client)).status,403)
 const admin=await a.auth(true),result=await a.call('/api/courses/admin/orders',null,admin);assert.equal(result.status,200);assert.equal(result.data.summary.freeOrders,1);assert.equal(result.data.summary.paidOrders,0);assert.equal(result.data.summary.paidRevenueMinor,0);assert.equal(result.data.summary.emailsAccepted,1);assert.equal(result.data.orders[0].email,'customer@example.com');assert.ok(!JSON.stringify(result.data).includes(order.receiptToken));assert.ok(!Object.hasOwn(result.data.orders[0],'secret'))
 assert.equal((await a.call('/api/courses/admin/orders/'+order.id+'/retry',{}, {Cookie:admin.Cookie})).status,403);assert.equal((await a.call('/api/courses/admin/orders/'+order.id+'/retry',{},admin)).status,409)
})
test('private payment configuration is boolean-only and role-protected without enabling checkout or making provider requests',async t=>{
 for(const mode of [null,'hosted-checkout','api-links']){
  const configured=mode!==null
  const privateKey='fixture-private-nomod-key',privateSecret='whsec_'+Buffer.alloc(32,7).toString('base64');let calls=0
  const a=await start({env:{ASCORE_ENABLE_FREE_COURSES:'0',ASCORE_ENABLE_PAID_COURSES:'0',ASCORE_ENABLE_PAID_COURSE_DELIVERY:'0',ASCORE_ENABLE_NOMOD_WEBHOOKS:'0',...(configured?{NOMOD_CHECKOUT_HOSTS:'checkout.nomod.example',...(mode==='api-links'?{NOMOD_PAYMENT_MODE:'api-links',NOMOD_API_KEY:privateKey,NOMOD_API_WEBHOOK_SIGNING_SECRET:privateSecret}:{NOMOD_HOSTED_CHECKOUT_API_KEY:privateKey,NOMOD_WEBHOOK_SIGNING_SECRET:privateSecret})}:{})},nomodFetch:async()=>{calls++;throw Error('No provider request is authorized')}});t.after(()=>a.portal.close())
  assert.equal((await a.call('/api/courses/admin/orders')).status,401)
  const client=await a.auth();assert.equal((await a.call('/api/courses/admin/orders',null,client)).status,403)
  const admin=await a.auth(true),result=await a.call('/api/courses/admin/orders',null,admin);assert.equal(result.status,200)
  const status=result.data.payments;assert.equal(status.ready,false);assert.equal(status.webhooksEnabled,false);assert.equal(status.paymentMode,mode||'hosted-checkout')
  assert.equal(status.requirements.apiKeyConfigured,configured);assert.equal(status.requirements.webhookSecretConfigured,configured);assert.equal(status.requirements.checkoutHostsConfigured,configured)
  for(const field of ['enabled','deliveryEnabled','liveRequestsApproved','termsApproved','contractVerified','schemaReady'])assert.equal(status.requirements[field],false)
  for(const value of Object.values(status.requirements))assert.equal(typeof value,'boolean')
  const serialized=JSON.stringify(result.data);for(const value of [privateKey,privateSecret,'checkout.nomod.example'])assert.ok(!serialized.includes(value))
  assert.deepEqual((await a.call('/api/courses/config')).data,{freeCheckoutReady:false,paidCheckoutEnabled:false})
  assert.equal(calls,0);assert.equal(a.messages.length,0)
 }
})
test('private PDF loader rejects public/repository directories, loose permissions, symlinks and wrong editions',async()=>{
 await assert.rejects(privateCoursePdf({ASCORE_COURSE_PDF_DIR:process.cwd()},'meta'))
 const directory=mkdtempSync(join(tmpdir(),'ascore-pdf-'));try{chmodSync(directory,0o700);const path=join(directory,courseCatalog.meta.file);writeFileSync(path,fixture,{mode:0o600});await assert.rejects(privateCoursePdf({ASCORE_COURSE_PDF_DIR:directory},'meta'),/edition/);chmodSync(path,0o644);await assert.rejects(privateCoursePdf({ASCORE_COURSE_PDF_DIR:directory},'meta'),/unavailable/);rmSync(path);symlinkSync('/etc/hosts',path);await assert.rejects(privateCoursePdf({ASCORE_COURSE_PDF_DIR:directory},'meta'))}finally{rmSync(directory,{recursive:true,force:true})}
})

test('private PDF upload requires admin role, CSRF, correct content type, bounded bytes and the approved edition',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'ascore-upload-'));chmodSync(directory,0o700)
 const a=await start({env:{ASCORE_ENABLE_FREE_COURSES:'1',ASCORE_COURSE_PDF_DIR:directory}});t.after(async()=>{await a.portal.close();rmSync(directory,{recursive:true,force:true})})
 const put=(path,body,headers={})=>fetch(a.base+path,{method:'PUT',headers:{Origin:origin,'Content-Type':'application/pdf',...headers},body})
 const endpoint='/api/courses/admin/assets/meta';assert.equal((await put(endpoint,fixture)).status,401)
 const client=await a.auth();assert.equal((await put(endpoint,fixture,client)).status,403)
 const admin=await a.auth(true);assert.equal((await put(endpoint,fixture,{Cookie:admin.Cookie})).status,403)
 assert.equal((await put(endpoint,fixture,{...admin,'Content-Type':'text/plain'})).status,415)
 assert.equal((await put(endpoint,Buffer.alloc(8*1024*1024+1),admin)).status,413)
 assert.equal((await put(endpoint,fixture,admin)).status,400)
 assert.equal((await put('/api/courses/admin/assets/%2E%2E%2Fmeta',fixture,admin)).status,404)
 const {readdirSync}=await import('node:fs');assert.deepEqual(readdirSync(directory),[])
})

test('order pagination preserves rows sharing a timestamp',async t=>{
 const {createSqliteStore}=await import('./sqlite-store.mjs'),store=createSqliteStore(':memory:');const a=await start({store});t.after(()=>a.portal.close())
 const time=Date.now()-1000
 for(let i=0;i<52;i++)await store.prepare('INSERT INTO course_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),'a'.repeat(64),`record-${i}@example.com`,JSON.stringify(['meta']),5000,5000,0,'FREE','free','b'.repeat(64),time+86400000,time,JSON.stringify({status:'accepted',attempts:1,retryable:false}))
 const admin=await a.auth(true),first=await a.call('/api/courses/admin/orders',null,admin);assert.equal(first.data.orders.length,50);assert.ok(first.data.nextCursor)
 const second=await a.call('/api/courses/admin/orders?cursor='+first.data.nextCursor,null,admin);assert.equal(second.data.orders.length,2);assert.equal(new Set([...first.data.orders,...second.data.orders].map(o=>o.id)).size,52);assert.equal(second.data.summary.freeOrders,52)
 assert.equal((await a.call('/api/courses/admin/orders?cursor=invalid',null,admin)).status,400)
})
