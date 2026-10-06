import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {Webhook} from 'svix'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {createPrivateNomodTest,privateNomodRequestId,isPrivateNomodTest} from './nomod-private-test.mjs'
import {createNomodCourses} from './nomod-courses.mjs'
import {createPortalServer} from './app.mjs'
const owner={id:'fixture-owner',username:'aswinfrn',role:'admin'},origin='https://ascore.test',key='synthetic-key',secret='whsec_'+Buffer.from('synthetic-signing-secret').toString('base64'),body={confirmation:'meta-4999-v1'}
async function fixture(t,extra={}){
 const db=createSqliteStore();await initializePaymentSchema(db);await db.exec('CREATE TABLE users (id TEXT PRIMARY KEY,username TEXT,role TEXT); CREATE TABLE audit (id INTEGER PRIMARY KEY,actor_id TEXT,action TEXT,target_id TEXT)');await db.prepare('INSERT INTO users VALUES (?,?,?)').run(owner.id,owner.username,owner.role);t.after(()=>db.close())
 const env={NOMOD_HOSTED_CHECKOUT_API_KEY:key,NOMOD_WEBHOOK_SIGNING_SECRET:secret,ASCORE_ENABLE_NOMOD_WEBHOOKS:'1',ASCORE_ALLOW_NOMOD_PRIVATE_TEST:'1',...extra},calls=[],id=randomUUID()
 const options={db,env,origin,readJson:async req=>req.body,audit:(actor,action,target)=>db.prepare('INSERT INTO audit(actor_id,action,target_id) VALUES(?,?,?)').run(actor,action,target),isSchemaReady:()=>true,fetcher:async(url,options)=>{const payload=JSON.parse(options.body);calls.push({url,...options,payload});return new Response(JSON.stringify({id,reference_id:payload.reference_id,amount:'49.99',currency:'AED',status:'created',url:'https://checkout.nomod.com/synthetic-private-test'}))}}
 return {db,env,calls,id,options,service:createPrivateNomodTest(options)}
}
test('private creation requires exact owner, explicit temporary gate, closed public gates and fixed approval without customer PII',async t=>{
 const h=await fixture(t);for(const user of [null,{...owner,username:'another_admin'},{...owner,role:'client'}])await assert.rejects(h.service.create(user,body),{status:403})
 for(const injected of [{},null,{...body,amount:'1.00'},{...body,email:'owner@example.test'},{confirmation:'other'}])await assert.rejects(h.service.create(owner,injected),{status:400})
 for(const flag of ['ASCORE_ENABLE_PAID_COURSES','ASCORE_ENABLE_FREE_COURSES','ASCORE_ENABLE_PAID_COURSE_DELIVERY','ASCORE_NOMOD_LIVE_REQUESTS_APPROVED']){h.env[flag]='1';await assert.rejects(h.service.create(owner,body),{status:403});delete h.env[flag]}
 for(const name of ['ASCORE_ALLOW_NOMOD_PRIVATE_TEST','ASCORE_ENABLE_NOMOD_WEBHOOKS']){h.env[name]='0';await assert.rejects(h.service.create(owner,body),{status:403});h.env[name]='1'}
 assert.equal(h.calls.length,0);const result=await h.service.create(owner,body);assert.equal(result.checkoutId,h.id);assert.equal(result.state,'created');assert.equal(h.calls.length,1)
 const call=h.calls[0];assert.equal(call.url,'https://api.nomod.com/v1/checkout');assert.equal(call.method,'POST');assert.equal(call.redirect,'error');assert.equal(call.payload.amount,'49.99');assert.equal(call.payload.currency,'AED');assert.equal(call.payload.items[0].unit_amount,'49.99');assert.equal(call.payload.items[0].quantity,1);assert.ok(!Object.hasOwn(call.payload,'customer'));assert.ok(!call.body.includes('@'));assert.equal(call.headers['X-API-KEY'],key)
 for(const returnKey of ['success_url','failure_url','cancelled_url'])assert.ok(call.payload[returnKey].startsWith(origin+'/portal/?view=courses&nomod_test='))
 const row=await h.db.prepare('SELECT * FROM course_paid_orders WHERE request_id=?').get(privateNomodRequestId);assert.equal(row.email,'');assert.equal(row.total_minor,4999);assert.equal(row.payment_status,'review');assert.equal(isPrivateNomodTest(row),true);assert.equal(JSON.parse(row.delivery).status,'held_private_test');assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM audit').get()).n,2)
})
test('concurrent requests and new instances reuse the durable claim; interrupted/invalid provider outcomes cannot retry',async t=>{
 const h=await fixture(t);const second=createPrivateNomodTest(h.options);await Promise.all([h.service.create(owner,body),second.create(owner,body)]);assert.equal(h.calls.length,1)
 h.env.ASCORE_ALLOW_NOMOD_PRIVATE_TEST='0';const restarted=createPrivateNomodTest(h.options);assert.equal((await restarted.status(owner)).allowed,false);assert.equal((await restarted.create(owner,body)).checkoutId,h.id);assert.equal(h.calls.length,1)
 const bad=await fixture(t);let attempts=0;const options={...bad.options,fetcher:async()=>{attempts++;throw Error('unknown outcome secret body')}};const service=createPrivateNomodTest(options);assert.equal((await service.create(owner,body)).state,'uncertain');assert.equal((await createPrivateNomodTest(options).create(owner,body)).alreadyAttempted,true);assert.equal(attempts,1);assert.equal((await service.status(owner)).url,null)
 const unsafe=await fixture(t);unsafe.options.fetcher=async()=>new Response(JSON.stringify({id:unsafe.id,reference_id:'wrong',amount:'49.99',currency:'AED',status:'created',url:'https://nomod.com.evil.test/path'}));assert.equal((await createPrivateNomodTest(unsafe.options).create(owner,body)).state,'uncertain')
})
test('private rows stay quarantined even with future public readiness and a paid status; fresh signed events can be stored with checkout off',async t=>{
 const h=await fixture(t);await h.service.create(owner,body);let requests=0,mails=0
 const options={db:h.db,env:h.env,origin,readJson:async req=>req.body,audit:h.options.audit,fetcher:async()=>{requests++;throw Error('No provider requests for private fulfilment')},sendEmail:async()=>{mails++},pdfReader:async()=>Buffer.from('fixture'),contractVerified:true}
 let service=await createNomodCourses(options);t.after(()=>service.close());const event={eventId:'synthetic-completed',type:'charge.completed',data:{id:randomUUID()}},raw=JSON.stringify(event),stamp=new Date(),svixId='synthetic_delivery'
 const req={method:'POST',headers:{'svix-id':svixId,'svix-timestamp':String(Math.floor(stamp.getTime()/1000)),'svix-signature':new Webhook(secret).sign(svixId,stamp,raw)},async *[Symbol.asyncIterator](){yield Buffer.from(raw)}};let response
 await service.publicHandle(req,{},'/api/courses/payments/nomod/webhook',(_res,status,data)=>{response={status,data}});assert.equal(response.status,200);assert.equal((await h.db.prepare('SELECT state FROM course_payment_events').get()).state,'needs_review');assert.equal(service.ready(),false);await service.close()
 Object.assign(h.env,{ASCORE_ENABLE_PAID_COURSES:'1',ASCORE_ENABLE_PAID_COURSE_DELIVERY:'1',ASCORE_NOMOD_LIVE_REQUESTS_APPROVED:'1',ASCORE_PAID_COURSE_TERMS_APPROVED:'1',NOMOD_CHECKOUT_HOSTS:'checkout.nomod.com'})
 service=await createNomodCourses(options);assert.equal(service.ready(),true)
 const row=await h.db.prepare('SELECT * FROM course_paid_orders').get();await h.db.prepare('UPDATE course_paid_orders SET payment_status=?,delivery=? WHERE id=?').run('paid','{"status":"pending"}',row.id)
 await service.confirm(row.id);await service.deliver(row.id);await service.tick();assert.equal(requests,0);assert.equal(mails,0);assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM course_paid_downloads').get()).n,0)
 const receipt=createHash('sha256').update(`${row.secret}:${row.id}:receipt`).digest('hex');await assert.rejects(service.publicHandle({method:'GET',headers:{'x-course-receipt':receipt}}, {},'/api/courses/paid/orders/'+row.id,()=>{}),{status:404})
 const token=createHash('sha256').update(`${row.secret}:${row.id}:download:meta`).digest('hex');await assert.rejects(service.publicHandle({method:'GET',url:'/?token='+token,socket:{remoteAddress:'local'}}, {},`/api/courses/paid/download/${row.id}/meta`,()=>{}),{status:404})
})
test('HTTP owner actions retain auth, origin and CSRF and expose diagnostic/private status through the real orders endpoint',async t=>{
 const db=createSqliteStore();await initializePaymentSchema(db);const activation='synthetic-activation',env={ASCORE_ORIGIN:origin,ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(activation).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}})}
 let requests=0;const app=await createPortalServer({store:db,env,nomodFetch:async()=>{requests++;throw Error('Disabled')},coursePdfReader:async()=>{throw Error('Not installed')}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 const call=async(path,body,headers={})=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const login=await call('/api/auth/admin-setup',{username:'aswinfrn',name:'Fixture owner',password:'Synthetic isolated password',setupToken:activation}),auth={Cookie:login.cookie,'x-csrf-token':login.data.csrf},path='/api/courses/admin/payments/private-test'
 assert.equal((await call(path,body)).status,401);assert.equal((await call(path,body,{Cookie:login.cookie})).status,403);assert.equal((await call(path,body,{...auth,Origin:'https://foreign.test'})).status,403);assert.equal((await call(path,body,auth)).status,403)
 const status=(await call('/api/courses/admin/orders',null,auth)).data;assert.equal(status.payments.diagnostic.ownerAllowed,true);assert.equal(status.payments.privateNomodTest.ownerAllowed,true);assert.equal(status.payments.privateNomodTest.allowed,false);assert.equal(requests,0);assert.deepEqual((await call('/api/courses/config')).data,{freeCheckoutReady:false,paidCheckoutEnabled:false})
})
