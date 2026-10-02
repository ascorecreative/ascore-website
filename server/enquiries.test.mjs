import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPortalServer } from './app.mjs'
import { createSqliteStore } from './sqlite-store.mjs'
import { createCrmTokenProvider, CRM_ORIGIN, CRM_ORG_ID, ACCOUNTS_ORIGIN } from './credentials.mjs'

const enquiry=()=>({requestId:randomUUID(),name:'ASCORE INTEGRATION TEST',email:'synthetic@example.invalid',company:'Test only',phone:'',service:'digital-experiences',message:'Synthetic local verification only.',website:'',consent:true})
async function start(options={}){const portal=await createPortalServer({dbPath:':memory:',env:{},...options});await new Promise(r=>portal.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${portal.server.address().port}/api/enquiries`;return {portal,post:async(body,headers={})=>{const response=await fetch(url,{method:'POST',headers:{Origin:'http://127.0.0.1:5173','Content-Type':'application/json',...headers},body:JSON.stringify(body)});return {status:response.status,data:await response.json()}}}}
test('public enquiry validates, persists without credentials and has an idempotent capability',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'ascore-enquiry-test-')),dbPath=join(directory,'test.sqlite')
 let instance=await start({dbPath});t.after(async()=>{await instance.portal.close();rmSync(directory,{recursive:true,force:true})})
 const body=enquiry()
 assert.equal((await instance.post(body,{Origin:'https://untrusted.invalid'})).status,403)
 assert.equal((await instance.post({...body,website:'spam'})).status,400)
 assert.equal((await instance.post({...body,consent:false})).status,400)
 assert.equal((await instance.post({...body,email:'bad\r\nBcc: bad@example.invalid'})).status,400)
 assert.equal((await instance.post({...body,company:''})).status,400)
 assert.equal((await instance.post({...body,service:'unverified-service'})).status,400)
 const saved=await instance.post(body);assert.equal(saved.status,202);assert.equal(saved.data.status,'pending');assert.equal(saved.data.id,body.requestId)
 assert.equal(statSync(dbPath).mode&0o077,0)
 await instance.portal.close();instance=await start({dbPath})
 assert.deepEqual((await instance.post(body)).data,saved.data)
 assert.equal((await instance.post({...body,message:'A changed payload must not reuse the reference.'})).status,409)
 for(let i=0;i<2;i++)assert.equal((await instance.post(enquiry())).status,202)
 assert.equal((await instance.post(enquiry())).status,429)
})
test('concurrent retries send each destination once; only a failed destination retries',async t=>{
 let emailCalls=0,crmCalls=0,time=Date.now()
 const instance=await start({now:()=>time,enquiryAdapters:{email:async()=>{emailCalls++;await new Promise(r=>setTimeout(r,20));return {reference:'synthetic-mail',proof:'test'}},crm:async()=>{crmCalls++;if(crmCalls===1)throw Object.assign(Error('Explicit rejection'),{retryable:true});return {reference:'synthetic-crm',proof:'test'}}}});t.after(()=>instance.portal.close())
 const body=enquiry(),results=await Promise.all([instance.post(body),instance.post(body)])
 assert.equal(emailCalls,1);assert.equal(crmCalls,1);results.forEach(r=>assert.equal(r.data.status,'pending'))
 time+=31000;const delivered=await instance.post(body)
 assert.equal(delivered.status,201);assert.equal(delivered.data.status,'delivered');assert.equal(emailCalls,1);assert.equal(crmCalls,2)
 await instance.post(body);assert.equal(emailCalls,1);assert.equal(crmCalls,2)
})
test('unknown external write outcome is persisted and never automatically retried',async t=>{
 let count=0,time=Date.now()
 const instance=await start({now:()=>time,enquiryAdapters:{email:async()=>({reference:'mail',proof:'test'}),crm:async()=>{count++;throw Error('Connection ended after write')}}});t.after(()=>instance.portal.close())
 const body=enquiry();assert.equal((await instance.post(body)).data.status,'uncertain');time+=61000;assert.equal((await instance.post(body)).data.status,'uncertain');assert.equal(count,1)
})
test('refresh provider validates the data center, caches and coalesces approved refresh requests',async()=>{
 let count=0,time=1000000
 const credentials={organizationId:CRM_ORG_ID,apiOrigin:CRM_ORIGIN,accountsOrigin:ACCOUNTS_ORIGIN,clientId:'synthetic-id',clientSecret:'synthetic-secret',refreshToken:'synthetic-refresh'}
 const provider=createCrmTokenProvider({credentials,now:()=>time,fetcher:async(url,options)=>{count++;assert.equal(url,ACCOUNTS_ORIGIN+'/oauth/v2/token');assert.equal(options.method,'POST');assert.equal(options.body.get('refresh_token'),'synthetic-refresh');await new Promise(r=>setTimeout(r,10));return new Response(JSON.stringify({access_token:'synthetic-access',api_domain:CRM_ORIGIN,expires_in:3600}))}})
 assert.deepEqual(await Promise.all([provider(),provider()]),['synthetic-access','synthetic-access']);assert.equal(count,1);await provider();assert.equal(count,1);time+=3600000;await provider();assert.equal(count,2)
 assert.throws(()=>createCrmTokenProvider({credentials:{...credentials,organizationId:'other'}}))
 const bad=createCrmTokenProvider({credentials,fetcher:async()=>new Response(JSON.stringify({access_token:'test',api_domain:'https://other.invalid'}))});await assert.rejects(bad())
})

test('separate API instances share durable claims without repeating either external send',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'ascore-workers-')),dbPath=join(directory,'test.sqlite')
 let email=0,crm=0
 const options={dbPath,enquiryAdapters:{email:async()=>{email++;await new Promise(r=>setTimeout(r,30));return {reference:'local-mail',proof:'test'}},crm:async()=>{crm++;return {reference:'local-crm',proof:'test'}}}}
 const a=await start(options),b=await start(options)
 t.after(async()=>{await a.portal.close();await b.portal.close();rmSync(directory,{recursive:true,force:true})})
 const body=enquiry(),responses=await Promise.all([a.post(body),b.post(body)])
 responses.forEach(row=>assert.ok([201,202].includes(row.status)))
 const final=await b.post(body);assert.equal(final.data.status,'delivered');assert.equal(email,1);assert.equal(crm,1)
})
test('restarting preserves an expired external claim as uncertain instead of resending',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'ascore-expired-')),dbPath=join(directory,'test.sqlite'),body=enquiry()
 let instance=await start({dbPath});await instance.post(body);await instance.portal.close()
 const store=createSqliteStore(dbPath)
 await store.prepare('UPDATE enquiries SET delivery=? WHERE id=?').run(JSON.stringify({email:{status:'sending',attempts:1,lastAttempt:Date.now()-180000,claimToken:'synthetic-crash'},crm:{status:'accepted',attempts:1}}),body.requestId)
 await store.close()
 let sends=0;instance=await start({dbPath,enquiryAdapters:{email:async()=>{sends++;return {reference:'should-not-send',proof:'test'}}}})
 t.after(async()=>{await instance.portal.close();rmSync(directory,{recursive:true,force:true})})
 assert.equal((await instance.post(body)).data.status,'uncertain');assert.equal(sends,0)
})
