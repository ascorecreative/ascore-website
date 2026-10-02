import test from 'node:test'
import assert from 'node:assert/strict'
import { createMariaDbStore,mariaDbPoolOptions } from './mariadb-store.mjs'
import { initializeMariaDbSchema,verifyMariaDbSchema,mariaDbSchema } from './mariadb-schema.mjs'

const env={DB_NAME:'synthetic_ascore_app',DB_USER:'synthetic_ascore_api',DB_PASSWORD:'synthetic test only'}
test('pool is bounded/local; connection credentials are required; prepared values remain separate',async()=>{
 assert.throws(()=>mariaDbPoolOptions({}));assert.throws(()=>mariaDbPoolOptions({...env,DB_HOST:'remote.invalid'}));assert.throws(()=>mariaDbPoolOptions({...env,DB_NAME:'bad;DROP database'}))
 const calls=[];let config,ended=0
 const store=await createMariaDbStore({env,poolFactory:options=>{config=options;return {execute:async(sql,parameters)=>{calls.push({sql,parameters});return [sql.startsWith('SELECT')?[{healthy:1}]:{affectedRows:1,insertId:4}]},end:async()=>{ended++}}}})
 assert.equal(config.connectionLimit,5);assert.equal(config.queueLimit,50);assert.equal(config.multipleStatements,false);assert.equal(config.host,'localhost')
 const value="safe value'; DROP TABLE users;"
 assert.deepEqual(await store.prepare('INSERT INTO leads VALUES (?,?)').run('synthetic',value),{changes:1,lastInsertRowid:4});assert.deepEqual(calls[0].parameters,['synthetic',value]);assert.ok(!calls[0].sql.includes(value));assert.equal(await store.health(),true)
 await assert.rejects(store.exec('PRAGMA foreign_keys=ON'));await assert.rejects(store.exec('INSERT INTO leads VALUES (?) ON CONFLICT(id) DO UPDATE SET data=excluded.data'))
 await store.close();await store.close();assert.equal(ended,1);await assert.rejects(store.health())
})
test('concurrent transactions hold separate connections; failures rollback and always release',async()=>{
 const traces=[];let next=0
 const pool={execute:async()=>{throw Error('Query escaped its transaction')},end:async()=>{},getConnection:async()=>{const id=++next,events=[];traces.push(events);return {beginTransaction:async()=>events.push('begin'),execute:async(sql,args)=>{events.push({sql,args,id});await new Promise(r=>setTimeout(r,10));return [[{id}]]},commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release')}}}
 const store=await createMariaDbStore({env,poolFactory:()=>pool})
 const ids=await Promise.all([store.transaction(async()=>{const first=await store.prepare('SELECT id').get();const second=await store.prepare('SELECT id').get();assert.equal(first.id,second.id);return first.id}),store.transaction(async()=>{const first=await store.prepare('SELECT id').get();assert.equal(first.id,(await store.prepare('SELECT id').get()).id);return first.id})]);assert.notEqual(ids[0],ids[1])
 await assert.rejects(store.transaction(async()=>{await store.prepare('SELECT id').get();throw Error('Synthetic failure')}),/Synthetic failure/)
 assert.ok(traces[0].includes('commit'));assert.ok(traces[1].includes('commit'));assert.ok(traces[2].includes('rollback'));traces.forEach(events=>assert.equal(events.at(-1),'release'))
 await assert.rejects(store.transaction(()=>store.transaction(async()=>{})),/Nested/);await store.close()
})
test('schema initialization refuses unapproved or unrelated databases before any write',async()=>{
 let writes=0
 const store={prepare:()=>({all:async()=>[{name:'unrelated_customer_data'}],get:async()=>null,run:async()=>{writes++}}),exec:async()=>{writes++}}
 await assert.rejects(initializeMariaDbSchema(store,{}),/approval/);await assert.rejects(initializeMariaDbSchema(store,{ASCORE_ALLOW_SCHEMA_SETUP:'1'}),/not empty/);assert.equal(writes,0)
 const ambiguous={...store,prepare:()=>({all:async()=>[{name:'users'}]})};await assert.rejects(initializeMariaDbSchema(ambiguous,{ASCORE_ALLOW_SCHEMA_SETUP:'1'}),/not empty/);assert.equal(writes,0)
})
test('schema prepares all existing storage groups without destructive DDL or account seeding',async()=>{
 const writes=[]
 const store={prepare:sql=>({all:async()=>[],run:async(...args)=>{writes.push({sql,args});return {changes:1}}}),exec:async sql=>writes.push({sql})}
 assert.deepEqual(await initializeMariaDbSchema(store,{ASCORE_ALLOW_SCHEMA_SETUP:'1'}),{version:1,created:true});assert.equal(writes.length,mariaDbSchema.length+2)
 writes.forEach(({sql})=>assert.ok(!/\b(DROP|TRUNCATE|CREATE\s+(DATABASE|USER)|GRANT)\b/i.test(sql)))
 assert.ok(mariaDbSchema.some(t=>t.name==='enquiries'));assert.ok(mariaDbSchema.some(t=>t.name==='zoho_sync_operations'));assert.ok(mariaDbSchema.some(t=>t.name==='sessions'))
})

test('normal production startup verifies every application table and ownership without issuing DDL',async()=>{
 let names=mariaDbSchema.map(table=>({name:table.name})),version={application:'ascore-platform',version:1},writes=0
 const store={prepare:()=>({all:async()=>names,get:async()=>version,run:async()=>{writes++}}),exec:async()=>{writes++}}
 assert.deepEqual(await verifyMariaDbSchema(store),{version:1})
 names=names.filter(table=>table.name!=='sessions');await assert.rejects(verifyMariaDbSchema(store),/initialization/)
 names=mariaDbSchema.map(table=>({name:table.name}));names.push({name:'unrelated_data'});await assert.rejects(verifyMariaDbSchema(store),/dedicated/)
 names=mariaDbSchema.map(table=>({name:table.name}));version=null;await assert.rejects(verifyMariaDbSchema(store),/ownership/)
 assert.equal(writes,0)
})
