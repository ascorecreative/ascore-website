import test from 'node:test'
import assert from 'node:assert/strict'
import { createSqliteStore } from './sqlite-store.mjs'
import { createZohoSync } from './zoho-sync.mjs'

test('Zoho sync uses verified organizations, reviewed payloads and persistent duplicate protection',async t=>{
  const db=createSqliteStore(':memory:');t.after(()=>db.close())
  await db.exec("CREATE TABLE leads(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT,company TEXT,role TEXT);CREATE TABLE documents(id TEXT PRIMARY KEY,client_id TEXT,kind TEXT,currency TEXT,data TEXT);")
  ;(await db.prepare('INSERT INTO leads VALUES (?,?)').run('lead-test',JSON.stringify({name:'Sample Lead',email:'sample@example.test',status:'new',company:'Test only'})))
  const calls=[],env={ZOHO_API_ORIGIN:'https://www.zohoapis.com',ZOHO_CRM_ACCESS_TOKEN:'synthetic-fixture',ZOHO_CRM_ORGANIZATION_ID:'123456',ZOHO_CRM_LEAD_STATUS_MAP:'{"new":"Not Contacted"}'}
  const fetcher=async(url,options)=>{calls.push({url,options});const data=url.pathname.endsWith('/org')?{org:[{id:'123456'}]}:options.method==='POST'?{data:[{status:'success',details:{id:'987654'}}]}:{data:[{id:'987654'}]};return {ok:true,status:200,json:async()=>data}}
  const sync=await createZohoSync({db,env,fetcher,readJson:async req=>req.body,audit:()=>{}})
  const action=async(name,body)=>{let result;await sync.handle({method:'POST',body},{},`/api/integrations/zoho/${name}`,{id:'synthetic-actor'},(_,__,data)=>{result=data});return result}
  assert.equal((await sync.status()).crm.connected,false)
  const plan=await action('preview',{localId:'lead-test',resource:'crmLead'})
  assert.equal(calls.length,0);assert.equal(plan.payload.data[0].Last_Name,'Lead');assert.deepEqual(plan.payload.trigger,[])
  await assert.rejects(action('sync',{localId:'lead-test',resource:'crmLead',confirmDigest:plan.digest}),/writes are disabled/)
  env.ASCORE_ENABLE_ZOHO_WRITES='1'
  await assert.rejects(action('sync',{localId:'lead-test',resource:'crmLead',confirmDigest:plan.digest}),/Verify this server/)
  await action('verify',{service:'crm'});assert.equal((await sync.status()).crm.connected,true)
  await assert.rejects(action('sync',{localId:'lead-test',resource:'crmLead',confirmDigest:'stale'}),/fresh sync preview/)
  const saved=await action('sync',{localId:'lead-test',resource:'crmLead',confirmDigest:plan.digest})
  assert.equal(saved.externalId,'987654');assert.equal(calls.filter(c=>c.options.method==='POST').length,1)
  const update=await sync.preview('lead-test','crmLead');assert.equal(update.method,'PUT');assert.match(update.path,/987654$/)
  assert.equal(calls[0].options.redirect,'error');assert.match(calls[0].options.headers.Authorization,/Zoho-oauthtoken/)
})

test('uncertain writes cannot auto-retry and missing Books mapping fails before any call',async t=>{
  const db=createSqliteStore(':memory:');t.after(()=>db.close());await db.exec("CREATE TABLE leads(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT,company TEXT,role TEXT);CREATE TABLE documents(id TEXT PRIMARY KEY,client_id TEXT,kind TEXT,currency TEXT,data TEXT);")
  ;(await db.prepare('INSERT INTO leads VALUES (?,?)').run('lead-test',JSON.stringify({name:'Test',status:'new'})))
  ;(await db.prepare('INSERT INTO documents VALUES (?,?,?,?,?)').run('doc-test','client-test','invoice','AED',JSON.stringify({items:[{description:'Test',amount:1}],taxRate:0})))
  const env={ZOHO_API_ORIGIN:'https://www.zohoapis.com',ZOHO_CRM_ACCESS_TOKEN:'synthetic-fixture',ZOHO_CRM_ORGANIZATION_ID:'123456',ZOHO_CRM_LEAD_STATUS_MAP:'{"new":"New"}',ASCORE_ENABLE_ZOHO_WRITES:'1'}
  let writes=0
  const sync=await createZohoSync({db,env,fetcher:async(_,options)=>{if(options.method==='POST'){writes++;throw Error('synthetic timeout')}return {ok:true,status:200,json:async()=>({org:[{id:'123456'}]})}},readJson:async req=>req.body,audit:()=>{}})
  const action=(name,body)=>sync.handle({method:'POST',body},{},`/api/integrations/zoho/${name}`,{id:'synthetic-actor'},()=>{})
  await assert.rejects(()=>sync.preview('doc-test','invoice'),/link the correct Books/)
  await action('verify',{service:'crm'});const plan=await sync.preview('lead-test','crmLead')
  await assert.rejects(action('sync',{localId:'lead-test',resource:'crmLead',confirmDigest:plan.digest}),/needs review/)
  assert.equal((await sync.preview('lead-test','crmLead')).state,'uncertain')
  await assert.rejects(action('sync',{localId:'lead-test',resource:'crmLead',confirmDigest:plan.digest}),/already attempted/)
  assert.equal(writes,1)
})
