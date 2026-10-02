import test from 'node:test'
import assert from 'node:assert/strict'
import {supportedDatabaseEngine} from './database-preflight.mjs'
import {createPersistence} from './persistence.mjs'
import {createPortalServer} from './app.mjs'

const env={NODE_ENV:'production',ASCORE_DATABASE:'mariadb',ASCORE_ORIGIN:'https://ascore.ae',DB_NAME:'u678643193_ascore_app',DB_USER:'u678643193_ascore_app',DB_PASSWORD:'synthetic only',ASCORE_ALLOW_SCHEMA_SETUP:'1',ASCORE_ALLOW_REGISTRATION:'0',ASCORE_ALLOW_ADMIN_SETUP:'0',ASCORE_ADMIN_SETUP_GRANTS:'{}',ASCORE_ENABLE_ENQUIRY_DELIVERY:'0',ASCORE_ENABLE_ZOHO_WRITES:'0'}
function syntheticDatabase(){
 const state={databaseName:env.DB_NAME,serverVersion:'10.11.12-MariaDB',names:new Set(),versions:new Map(),calls:[],closed:0}
 state.poolFactory=()=>({end:async()=>{state.closed++},execute:async(sql,args=[])=>{
  state.calls.push({sql,args})
  if(sql.startsWith('SELECT DATABASE()'))return [[{databaseName:state.databaseName,serverVersion:state.serverVersion}]]
  if(sql==='SELECT 1 AS healthy')return [[{healthy:1}]]
  if(sql.includes('FROM information_schema.tables'))return [[...state.names].map(name=>({name}))]
  if(sql.startsWith('SELECT application,version'))return [[...(state.versions.has(args[1])?[{application:args[0],version:args[1]}]:[])]]
  if(sql.startsWith('SELECT applied_at'))return [[{applied_at:state.versions.get(1)}]]
  if(sql.startsWith('CREATE TABLE')){state.names.add(/CREATE TABLE IF NOT EXISTS `([^`]+)`/.exec(sql)[1]);return [{affectedRows:0}]}
  if(sql.startsWith('INSERT INTO ascore_schema_versions')){state.versions.set(args[1],args[2]);return [{affectedRows:1}]}
  throw Error('Unexpected operation in synthetic startup')
 }})
 return state
}
test('engine gate distinguishes MariaDB/MySQL and rejects versions with unsupported schema constraints',()=>{
 assert.deepEqual(supportedDatabaseEngine('10.11.12-MariaDB-0ubuntu0'),{engine:'mariadb',engineVersion:'10.11.12'})
 assert.deepEqual(supportedDatabaseEngine('5.5.5-10.6.20-MariaDB'),{engine:'mariadb',engineVersion:'10.6.20'})
 assert.deepEqual(supportedDatabaseEngine('8.0.16'),{engine:'mysql',engineVersion:'8.0.16'})
 assert.deepEqual(supportedDatabaseEngine('8.4.7'),{engine:'mysql',engineVersion:'8.4.7'})
 for(const value of ['5.7.44','8.0.15','10.5.29-MariaDB','unknown',undefined])assert.throws(()=>supportedDatabaseEngine(value))
})
test('wrong selected DB, unsupported engine, or foreign tables fail before any schema write',async()=>{
 for(const change of ['database','engine','tables']){
  const state=syntheticDatabase()
  if(change==='database')state.databaseName='another_database'
  if(change==='engine')state.serverVersion='5.7.44'
  if(change==='tables')state.names.add('unrelated_customer_data')
  await assert.rejects(createPersistence({env,poolFactory:state.poolFactory}))
  assert.ok(state.calls.every(({sql})=>sql.startsWith('SELECT')))
  assert.equal(state.closed,1)
 }
})
test('startup checks identity first, preserves the existing inventory guard, and exposes only nonsecret readiness',async()=>{
 const state=syntheticDatabase(),db=await createPersistence({env,poolFactory:state.poolFactory})
 assert.ok(state.calls[0].sql.startsWith('SELECT DATABASE()'))
 const firstWrite=state.calls.findIndex(({sql})=>!sql.startsWith('SELECT'))
 assert.ok(state.calls.slice(0,firstWrite).some(({sql})=>sql.includes('information_schema.tables')))
 assert.equal(state.names.size,15)
 assert.deepEqual(db.readiness,{engine:'mariadb',engineVersion:'10.11.12',identityVerified:true,schemaVersion:1,schemaAppliedAt:state.versions.get(1),initialization:'created'})
 assert.ok(!JSON.stringify(db.readiness).includes(env.DB_PASSWORD));assert.ok(!JSON.stringify(db.readiness).includes(env.DB_USER))
 await db.close();state.calls=[]
 const restarted=await createPersistence({env:{...env,ASCORE_ALLOW_SCHEMA_SETUP:'0'},poolFactory:state.poolFactory})
 assert.equal(restarted.readiness.schemaAppliedAt,state.versions.get(1));assert.equal(restarted.readiness.initialization,'verified')
 assert.ok(state.calls.every(({sql})=>sql.startsWith('SELECT')));await restarted.close()
})
test('production health reports verified schema marker while registration and setup remain disabled',async t=>{
 const state=syntheticDatabase(),portal=await createPortalServer({env,poolFactory:state.poolFactory})
 await new Promise(resolve=>portal.server.listen(0,'127.0.0.1',resolve));t.after(()=>portal.close())
 const base=`http://127.0.0.1:${portal.server.address().port}/api`
 const health=await fetch(base+'/health');assert.equal(health.status,200)
 const data=await health.json();assert.equal(data.status,'ok');assert.equal(data.databaseVerified,true);assert.equal(data.schemaVersion,1);assert.equal(data.schemaAppliedAt,state.versions.get(1))
 assert.ok(!JSON.stringify(data).includes(env.DB_NAME));assert.ok(!JSON.stringify(data).includes(env.DB_PASSWORD))
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{Origin:env.ASCORE_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(body)})
 assert.equal((await post('/auth/register',{username:'probeclient'})).status,503)
 assert.equal((await post('/auth/admin-setup',{username:'aswinfrn',setupToken:'invalid'})).status,403)
 assert.equal((await fetch(base+'/workspace')).status,401)
})
