import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createPortalServer} from './app.mjs'
import {createSqliteStore} from './sqlite-store.mjs'

// MariaDB-shaped adapter over isolated in-memory fixtures. No production DB,
// credentials, provider requests, account changes or SMTP are used by these tests.
async function harness(t,{gate='1',foreign=false,failDDL=false,delayDDL=false}={}){
 const base=createSqliteStore(),ddl=[],audits=[],env={DB_NAME:'ascore_setup_fixture',ASCORE_ORIGIN:'https://ascore.test',ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP:gate}
 const fixtureToken='isolated-in-memory-fixture-only',grant={tokenHash:createHash('sha256').update(fixtureToken).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}
 env.ASCORE_ADMIN_SETUP_GRANTS=JSON.stringify({aswinfrn:grant,sachindinesh:grant})
 const store={...base,kind:'sqlite',databaseName:env.DB_NAME,failDDL,
  prepare(sql){
   if(sql.includes('information_schema.tables'))return base.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
   if(sql.startsWith('SELECT DATABASE()'))return {async get(){return {databaseName:store.databaseName,serverVersion:'10.11.6-MariaDB'}}}
   return base.prepare(sql.replaceAll("JSON_UNQUOTE(JSON_EXTRACT(delivery,'$.status'))","json_extract(delivery,'$.status')"))
  },
  async exec(sql){
   if(sql.startsWith('CREATE TABLE IF NOT EXISTS course_')){ddl.push(sql);if(delayDDL)await new Promise(r=>setTimeout(r,15));if(store.failDDL&&sql.includes('course_paid_downloads'))throw Error('Synthetic interrupted DDL')}
   return base.exec(sql.replace(/ ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/,''))
  }
 }
 const app=await createPortalServer({store,env,origin:env.ASCORE_ORIGIN,courseSender:async()=>{throw Error('No mail may be sent')},nomodFetch:async()=>{throw Error('No provider call allowed')},coursePdfReader:async()=>Buffer.from('%PDF-local-fixture')})
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const url=`http://127.0.0.1:${app.server.address().port}/api`
 const request=async(path,{body,session={},method=body?'POST':'GET',headers={}}={})=>{
  const response=await fetch(url+path,{method,headers:{Origin:env.ASCORE_ORIGIN,...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})})
  return {...await response.json(),status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]}
 }
 const password='Synthetic fixture password only'
 const owner=await request('/auth/admin-setup',{body:{username:'aswinfrn',name:'Fixture owner',setupToken:fixtureToken,password}})
 const other=await request('/auth/admin-setup',{body:{username:'sachindinesh',name:'Fixture other',setupToken:fixtureToken,password}})
 // Grants are single-use globally; give the second fixture its own synthetic grant.
 if(other.status!==201){const secondToken='different-isolated-memory-fixture';env.ASCORE_ADMIN_SETUP_GRANTS=JSON.stringify({sachindinesh:{...grant,tokenHash:createHash('sha256').update(secondToken).digest('hex')}});Object.assign(other,await request('/auth/admin-setup',{body:{username:'sachindinesh',name:'Fixture other',setupToken:secondToken,password}}))}
 const client=await request('/auth/register',{body:{username:'fixture_client',name:'Fixture client',email:'fixture@example.test',password}})
 assert.equal(owner.status,201);assert.equal(other.status,201);assert.equal(client.status,201)
 env.ASCORE_ALLOW_ADMIN_SETUP='0';env.ASCORE_ADMIN_SETUP_GRANTS='{}'
 await base.exec('CREATE TABLE ascore_schema_versions (application TEXT NOT NULL, version INTEGER NOT NULL, applied_at INTEGER NOT NULL, PRIMARY KEY(application,version))')
 await base.prepare('INSERT INTO ascore_schema_versions VALUES (?,?,?)').run('ascore-platform',1,1)
 if(foreign)await base.exec('CREATE TABLE course_paid_orders (foreign_id INTEGER)')
 store.kind='mariadb';store.readiness={identityVerified:true,schemaVersion:1,schemaAppliedAt:1}
 // Capture only action names, never fixture password hashes, cookies or tokens.
 const prepare=store.prepare.bind(store);store.prepare=sql=>{const statement=prepare(sql);if(sql.startsWith('INSERT INTO audit')){const run=statement.run;return {...statement,async run(...args){audits.push(args[2]);return run(...args)}}}return statement}
 return {base,store,ddl,audits,env,owner,other,client,request,setup:(session=owner,body={})=>request('/courses/admin/payments/setup',{body,session})}
}

test('schema setup requires the existing approved admin, exact origin, CSRF and temporary flag',async t=>{
 const h=await harness(t)
 assert.equal((await h.setup({})).status,401)
 assert.equal((await h.setup(h.client)).status,403)
 assert.equal((await h.setup(h.other)).status,403)
 assert.equal((await h.setup({cookie:h.owner.cookie})).status,403)
 assert.equal((await h.request('/courses/admin/payments/setup',{body:{},session:h.owner,headers:{Origin:'https://untrusted.test'}})).status,403)
 h.env.ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP='0';assert.equal((await h.setup()).status,403)
 assert.equal((await h.request('/courses/admin/payments/setup',{session:h.owner})).status,405)
 assert.equal((await h.request('/courses/admin/orders',{session:h.owner})).payments.setup.reason,'operator_flag_required')
 h.env.ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP='1';h.env.ASCORE_ENABLE_PAID_COURSES='1';assert.equal((await h.setup()).status,403);h.env.ASCORE_ENABLE_PAID_COURSES='0';h.env.ASCORE_ENABLE_FREE_COURSES='1';assert.equal((await h.setup()).status,403);assert.equal((await h.request('/courses/admin/orders',{session:h.owner})).payments.setup.reason,'checkout_must_be_disabled')
 assert.deepEqual(h.ddl,[]);assert.deepEqual(h.audits,[])
})
test('setup refuses browser SQL/path/configuration and unverified or mismatched runtime without DDL',async t=>{
 const h=await harness(t)
 for(const body of [{sql:'arbitrary'},{path:'/tmp/not-production'},{database:'other'},{enabled:true}])assert.equal((await h.setup(h.owner,body)).status,400)
 h.store.databaseName='different_fixture';assert.equal((await h.setup()).status,503)
 h.store.databaseName=h.env.DB_NAME;h.store.readiness.identityVerified=false;assert.equal((await h.setup()).status,503)
 assert.deepEqual(h.ddl,[]);assert.deepEqual(h.audits,[])
})
test('setup rejects conflicting unowned payment tables before any schema or audit write',async t=>{
 const h=await harness(t,{foreign:true});assert.equal((await h.setup()).status,503);assert.deepEqual(h.ddl,[]);assert.deepEqual(h.audits,[])
})
test('approved repeated and concurrent setup adds only four tables, preserves accounts and performs no delivery',async t=>{
 const h=await harness(t,{delayDDL:true}),before=await h.base.prepare('SELECT COUNT(*) AS count FROM users').get()
 const results=await Promise.all([h.setup(),h.setup()]);assert.ok(results.every(r=>r.status===200&&r.schemaReady===true));assert.equal(h.ddl.length,4)
 assert.deepEqual(h.ddl.map(sql=>/CREATE TABLE IF NOT EXISTS (\w+)/.exec(sql)[1]),['course_paid_orders','course_paid_downloads','course_payment_events','course_payment_limits'])
 assert.deepEqual(h.audits,['payment_schema_setup_started','payment_schema_setup_completed'])
 const repeat=await h.setup();assert.equal(repeat.status,200);assert.equal(repeat.initialized,false);assert.equal(h.ddl.length,4)
 assert.deepEqual(await h.base.prepare('SELECT COUNT(*) AS count FROM users').get(),before)
 assert.equal((await h.base.prepare('SELECT COUNT(*) AS count FROM course_paid_orders').get()).count,0)
 assert.deepEqual(await h.request('/courses/config'),{freeCheckoutReady:false,paidCheckoutEnabled:false,status:200,cookie:undefined})
 const status=await h.request('/courses/admin/orders',{session:h.owner});assert.equal(status.payments.requirements.schemaReady,true);assert.equal(status.payments.ready,false);assert.equal(status.payments.setup.reason,'already_initialized')
 assert.equal(h.env.ASCORE_ALLOW_ADMIN_SETUP,'0');assert.equal(h.env.ASCORE_ADMIN_SETUP_GRANTS,'{}')
})
test('partial DDL failure remains incomplete and auditable; explicit approved retry safely completes it',async t=>{
 const h=await harness(t,{failDDL:true}),failed=await h.setup();assert.equal(failed.status,409);assert.match(failed.error,/partially completed/)
 assert.equal((await h.request('/courses/admin/orders',{session:h.owner})).payments.requirements.schemaReady,false)
 assert.ok(await h.base.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',0))
 assert.equal(await h.base.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',1),undefined)
 assert.deepEqual(h.audits,['payment_schema_setup_started','payment_schema_setup_needs_review'])
 h.store.failDDL=false;const retry=await h.setup();assert.equal(retry.status,200);assert.equal(retry.schemaReady,true)
 assert.equal((await h.base.prepare('SELECT COUNT(*) AS count FROM course_paid_orders').get()).count,0)
})
