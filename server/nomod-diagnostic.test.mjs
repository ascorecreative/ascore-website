import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {createNomodDiagnostic} from './nomod-diagnostic.mjs'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {createPortalServer} from './app.mjs'
const owner={id:'synthetic-owner',username:'aswinfrn',role:'admin'},id=randomUUID(),charge=randomUUID(),key='synthetic-private-api-key',origin='https://ascore.test'
const paid={id,url:'https://checkout.nomod.com/private-checkout-capability',status:'paid',currency:'AED',amount:49.99,reference_id:'private-external-reference',customer:{email:'private-buyer@example.test'},charges:[{id:charge,status:'paid',amount:49.99}]}
function fixture({details=paid,status=200,event=true,schema=true,env={}}={}){
 const calls=[],sql=[],config={NOMOD_HOSTED_CHECKOUT_API_KEY:key,NOMOD_CHECKOUT_HOSTS:'checkout.nomod.com',...env}
 const db={prepare:q=>{sql.push(q);assert.match(q,/^SELECT COUNT\(\*\)/);return {get:async(...args)=>{assert.equal(args[0],'charge.completed');return {n:event?1:0}}}}}
 const service=createNomodDiagnostic({db,env:config,isSchemaReady:()=>schema,readJson:async r=>r.body,fetcher:async(url,options)=>{calls.push({url,...options});return new Response(JSON.stringify(details),{status})}})
 return {service,calls,sql,env:config,read:(body={checkoutId:id},user=owner)=>service.inspect(user,body)}
}
test('the documented pay.nomodapp.com host is accepted exactly, while suffix lookalikes and other subdomains remain untrusted',async()=>{
 const r=await fixture({details:{...paid,url:'https://pay.nomodapp.com/en/l/synthetic'},env:{NOMOD_CHECKOUT_HOSTS:'pay.nomodapp.com'}}).read()
 assert.equal(r.nomodOwnedHost,true);assert.equal(r.configuredHostMatches,true);assert.equal(r.paidShapeVerified,true);assert.equal(r.contractApproved,false)
 for(const host of ['pay.nomodapp.com.evil.test','other.nomodapp.com','nomodapp.com']){
  const result=await fixture({details:{...paid,url:`https://${host}/synthetic`},env:{NOMOD_CHECKOUT_HOSTS:host}}).read()
  assert.equal(result.nomodOwnedHost,false);assert.equal(result.configuredHostMatches,false);assert.equal(result.paidShapeVerified,false)
 }
})
test('existing checkout diagnostic GETs only the fixed provider endpoint and redacts customer, keys, references and URL capabilities',async()=>{
 const h=fixture(),r=await h.read();assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'https://api.nomod.com/v1/checkout/'+id);assert.equal(h.calls[0].method,'GET');assert.equal(h.calls[0].headers['X-API-KEY'],key);assert.equal(h.calls[0].redirect,'error');assert.equal(h.calls[0].body,undefined)
 assert.equal(r.apiAuthenticated,true);assert.equal(r.paidShapeVerified,true);assert.equal(r.signedCompletedEventMatched,true);assert.equal(r.checkoutHost,'checkout.nomod.com');assert.equal(r.configuredHostMatches,true);assert.equal(r.amountMinor,4999);assert.equal(r.contractApproved,false)
 const output=JSON.stringify(r);for(const secret of [key,id,charge,paid.reference_id,paid.customer.email,'private-checkout-capability'])assert.ok(!output.includes(secret))
 await h.read();assert.equal(h.calls.length,1,'A short repeated lookup reuses its result');assert.ok(h.sql.every(q=>q.startsWith('SELECT')))
})
test('diagnostic rejects other owners, config injection, wrong IDs, active checkout and missing prerequisites before network reads',async()=>{
 const h=fixture();for(const body of [{checkoutId:id,url:'https://evil.test'},{checkoutId:id,key:'unapproved'},{checkoutId:'../../admin'},{checkoutId:id,enabled:true},null,[]])await assert.rejects(h.read(body),{status:400})
 for(const user of [{...owner,role:'client'},{...owner,username:'another_admin'},null])await assert.rejects(h.read({checkoutId:id},user),{status:403})
 assert.equal(h.calls.length,0);for(const env of [{ASCORE_ENABLE_FREE_COURSES:'1'},{ASCORE_ENABLE_PAID_COURSES:'1'}]){const f=fixture({env});await assert.rejects(f.read(),{status:403});assert.equal(f.calls.length,0)}
 for(const options of [{schema:false},{env:{NOMOD_HOSTED_CHECKOUT_API_KEY:''}}]){const f=fixture(options);await assert.rejects(f.read(),{status:503});assert.equal(f.calls.length,0)}
})
test('authorisation, amount mismatch, missing reference/charge, unrelated host, wrong ID and absent signed event never establish the captured contract',async()=>{
 for(const change of [{status:'created'},{charges:[{id:charge,status:'authorised',amount:49.99}]},{amount:50},{currency:'USD'},{reference_id:''},{charges:[]},{charges:[{id:charge,status:'paid',amount:49.99},{id:charge,status:'paid',amount:49.99}]},{url:'https://nomod.com.evil.test/payment'},{url:'https://user:password@checkout.nomod.com/payment'},{id:randomUUID()}]){const h=fixture({details:{...paid,...change}}),r=await h.read();assert.equal(r.paidShapeVerified,false);assert.equal(r.contractApproved,false)}
 const unmatched=await fixture({event:false,env:{NOMOD_CHECKOUT_HOSTS:''}}).read();assert.equal(unmatched.paidShapeVerified,true);assert.equal(unmatched.signedCompletedEventMatched,false);assert.equal(unmatched.configuredHostMatches,false);assert.equal(unmatched.contractApproved,false)
 for(const status of [401,403,404,500]){const h=fixture({status});await assert.rejects(h.read(),e=>[404,502].includes(e.status)&&!e.message.includes(key))}
 const oversized=fixture({details:{...paid,unneeded:'x'.repeat(140000)}});await assert.rejects(oversized.read(),{status:502})
})
test('real HTTP diagnostic preserves session, owner, exact origin and CSRF, leaving all payment rows and public gates unchanged',async t=>{
 const db=createSqliteStore();await initializePaymentSchema(db);const token='synthetic-owner-activation',hash=s=>createHash('sha256').update(s).digest('hex'),env={ASCORE_ORIGIN:origin,NOMOD_HOSTED_CHECKOUT_API_KEY:key,ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:hash(token),expiresAt:new Date(Date.now()+60000).toISOString()}})};let calls=0
 const app=await createPortalServer({store:db,env,nomodFetch:async(_url,options)=>{calls++;assert.equal(options.method,'GET');return new Response(JSON.stringify(paid))},courseSender:async()=>{throw Error('Diagnostic must send no mail')},coursePdfReader:async()=>{throw Error('No PDF read needed')}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 const request=async(path,{body,session={},headers={},method=body?'POST':'GET'}={})=>{const r=await fetch(base+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'x-csrf-token':session.csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const a=await request('/api/auth/admin-setup',{body:{username:'aswinfrn',name:'Synthetic owner',password:'Synthetic isolated password',setupToken:token}}),session={cookie:a.cookie,csrf:a.data.csrf};assert.equal(a.status,201);const path='/api/courses/admin/payments/verify-existing-checkout',body={checkoutId:id}
 assert.equal((await request(path,{body})).status,401);assert.equal((await request(path,{body,session:{cookie:session.cookie}})).status,403);assert.equal((await request(path,{body,session,headers:{Origin:'https://foreign.test'}})).status,403);assert.equal((await request(path,{session})).status,405);assert.equal(calls,0)
 const r=await request(path,{body,session});assert.equal(r.status,200);assert.equal(r.data.paidShapeVerified,true);assert.equal(r.data.signedCompletedEventMatched,false);assert.equal(calls,1)
 for(const table of ['course_paid_orders','course_paid_downloads','course_payment_events','course_payment_limits'])assert.equal(Number((await db.prepare('SELECT COUNT(*) AS n FROM '+table).get()).n),0)
 const rejected=await request('/api/courses/payments/nomod/webhook',{body:{privatePayload:'Must never appear in diagnostics'}});assert.equal(rejected.status,503)
 const admin=await request('/api/courses/admin/orders',{session});assert.equal(admin.status,200)
 assert.equal(admin.data.payments.webhookDelivery.status,503);assert.equal(admin.data.payments.webhookDelivery.reason,'receiver_unconfigured');assert.equal(typeof admin.data.payments.webhookDelivery.at,'number')
 const diagnostic=JSON.stringify(admin.data.payments.webhookDelivery);assert.ok(!diagnostic.includes(key));assert.ok(!diagnostic.includes('Must never appear'))
 assert.deepEqual((await request('/api/courses/config')).data,{freeCheckoutReady:false,paidCheckoutEnabled:false})
})
