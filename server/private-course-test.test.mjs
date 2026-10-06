import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {createPrivateCourseTest} from './private-course-test.mjs'
import {createPortalServer} from './app.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex'),email='approved-owner@example.test',owner={id:'fixture-owner',username:'aswinfrn',role:'admin'},origin='https://ascore.test'
async function fixture(t,{uncertain=false,send=true,pdf=true}={}){
 const db=createSqliteStore();t.after(()=>db.close());await db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL, role TEXT NOT NULL); CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT,at BIGINT,actor_id TEXT,action TEXT,target_id TEXT)');await db.prepare('INSERT INTO users VALUES (?,?,?)').run(owner.id,owner.username,owner.role)
 const bytes=Buffer.from('%PDF-1.7\nSynthetic isolated Meta delivery fixture.'),meta={bytes:bytes.length,sha256:hash(bytes),file:'Meta-fixture.pdf'},mails=[],env={}
 const audit=async(actor,action,target)=>db.prepare('INSERT INTO audit(at,actor_id,action,target_id) VALUES (?,?,?,?)').run(Date.now(),actor,action,target)
 const options={db,env,readJson:async r=>r.body,audit,meta,recipientHash:hash(email),pdfReader:async()=>{if(!pdf)throw Error('Missing private PDF');return bytes},...(send?{sendEmail:async message=>{mails.push(message);if(uncertain)throw Error('Private SMTP failure must never leak');return {reference:'synthetic-accepted'}}}:{})}
 const create=()=>createPrivateCourseTest(options),service=create()
 const request=async(body={email},user=owner,method='POST')=>{let result;try{await service.adminHandle({method,body},null,'/api/courses/admin/private-meta-test',user,(_r,status,data)=>{result={status,...data}});return result}catch(e){return {status:e.status||500,error:e.message}}}
 return {db,bytes,meta,mails,env,options,service,create,request}
}
test('owner test sends exactly one verified Meta attachment to the approved recipient with no public order or charge',async t=>{
 const h=await fixture(t);assert.equal((await h.service.status(owner)).ready,true);const r=await h.request();assert.equal(r.state,'accepted');assert.equal(r.alreadyAttempted,false);assert.equal(h.mails.length,1);const m=h.mails[0]
 assert.equal(m.to,email);assert.equal(m.from.address,'orders@ascore.ae');assert.deepEqual(m.envelope,{from:'orders@ascore.ae',to:[email]});assert.equal(m.attachments.length,1);assert.deepEqual(m.attachments[0].content,h.bytes);assert.equal(m.attachments[0].contentType,'application/pdf');assert.ok(!m.text.includes('/api/courses/download/'));assert.match(m.text,/No payment/)
 assert.equal((await h.db.prepare("SELECT COUNT(*) AS count FROM audit WHERE action LIKE 'private_meta_test_%'").get()).count,2)
 assert.equal((await h.service.status(owner)).ready,false);assert.equal((await h.service.status(owner)).state,'accepted')
 assert.equal((await h.request()).alreadyAttempted,true);assert.equal(h.mails.length,1)
 assert.equal(await h.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'course_%'").get(),undefined)
})
test('test refuses other roles, recipients, browser configuration, unavailable SMTP/PDF and enabled checkout before claiming',async t=>{
 const h=await fixture(t)
 assert.equal((await h.request({email},{...owner,username:'another_admin'})).status,403);assert.equal((await h.request({email},{...owner,role:'client'})).status,403)
 for(const body of [{email:'different@example.test'},{email:email+'\r\nInjected'},{email,items:['ai']},{email,sender:'different@example.test'},{recipient:email}])assert.ok([400,403].includes((await h.request(body)).status))
 h.env.ASCORE_ENABLE_FREE_COURSES='1';assert.equal((await h.request()).status,403);h.env.ASCORE_ENABLE_FREE_COURSES='0';h.env.ASCORE_ENABLE_PAID_COURSES='1';assert.equal((await h.request()).status,403)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM audit').get()).count,0);assert.equal(h.mails.length,0)
 for(const options of [{send:false},{pdf:false}]){const missing=await fixture(t,options);assert.equal((await missing.request()).status,503);assert.equal((await missing.db.prepare('SELECT COUNT(*) AS count FROM audit').get()).count,0);assert.equal(missing.mails.length,0)}
})
test('durable claims survive another worker/restart and uncertain SMTP is never automatically resent',async t=>{
 for(const uncertain of [false,true]){const h=await fixture(t,{uncertain}),second=h.create();const invoke=async service=>{let value;await service.adminHandle({method:'POST',body:{email}},null,'/api/courses/admin/private-meta-test',owner,(_r,_s,data)=>{value=data});return value};const results=await Promise.all([invoke(h.service),invoke(second)]);assert.equal(h.mails.length,1);assert.ok(results.some(r=>r.alreadyAttempted));assert.equal((await h.create().status(owner)).state,uncertain?'uncertain':'accepted');await invoke(h.create());assert.equal(h.mails.length,1)}
})
test('SMTP acceptance followed by audit failure retains the claim and prevents a second send',async t=>{
 const h=await fixture(t),audit=h.options.audit;h.options.audit=async(a,action,target)=>{if(action==='private_meta_test_accepted')throw Error('Synthetic write failure');return audit(a,action,target)};const broken=h.create();await assert.rejects(broken.adminHandle({method:'POST',body:{email}},null,'/api/courses/admin/private-meta-test',owner,()=>{}),{status:503});assert.equal(h.mails.length,1);assert.equal((await h.create().status(owner)).state,'claimed');let result;await h.service.adminHandle({method:'POST',body:{email}},null,'/api/courses/admin/private-meta-test',owner,(_r,_s,data)=>{result=data});assert.equal(result.alreadyAttempted,true);assert.equal(h.mails.length,1)
})
test('real HTTP private test endpoint keeps existing session, owner, origin and CSRF restrictions',async t=>{
 const token='isolated-mail-owner-grant',env={ASCORE_ORIGIN:origin,ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:hash(token),expiresAt:new Date(Date.now()+60000).toISOString()}})},db=createSqliteStore();let sends=0
 const app=await createPortalServer({store:db,env,courseSender:async()=>{sends++},coursePdfReader:async()=>{throw Error('No production PDF')},nomodFetch:async()=>{throw Error('No payment request')}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 const request=async(path,{body,session={},headers={},method=body?'POST':'GET'}={})=>{const r=await fetch(base+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'x-csrf-token':session.csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const a=await request('/api/auth/admin-setup',{body:{username:'aswinfrn',name:'Synthetic owner',password:'Synthetic isolated password',setupToken:token}}),session={cookie:a.cookie,csrf:a.data.csrf};assert.equal(a.status,201)
 const path='/api/courses/admin/private-meta-test';assert.equal((await request(path)).status,401);assert.equal((await request(path,{body:{email},session:{cookie:session.cookie}})).status,403);assert.equal((await request(path,{body:{email},session,headers:{Origin:'https://foreign.test'}})).status,403)
 const client=await request('/api/auth/register',{body:{username:'private_test_client',name:'Synthetic client',email:'client@example.test',password:'Synthetic isolated password'}});assert.equal((await request(path,{session:{cookie:client.cookie}})).status,403)
 assert.equal((await request(path,{session})).data.pdfVerified,false);assert.equal((await request(path,{body:{email},session})).status,403);assert.equal((await request('/api/courses/config')).data.freeCheckoutReady,false);assert.equal(sends,0)
})
