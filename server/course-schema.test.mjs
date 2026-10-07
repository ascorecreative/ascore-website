import test from 'node:test'
import assert from 'node:assert/strict'
import {initializeCourseSchema,courseTables} from './course-schema.mjs'
import {mariaDbSchema,verifyMariaDbSchema} from './mariadb-schema.mjs'
function fixture({owned=false,foreign=false}={}){
 const names=new Set(mariaDbSchema.map(t=>t.name)),markers=new Set(['ascore-platform:1']),writes=[]
 if(owned){courseTables.forEach(n=>names.add(n));markers.add('ascore-courses:1')}
 if(foreign)courseTables.forEach(n=>names.add(n))
 const db={kind:'mariadb',prepare(sql){return {async all(){if(sql.includes('information_schema.tables'))return [...names].map(name=>({name}));throw Error('Unexpected read')},async get(app,version){if(sql.startsWith('SELECT application,version'))return markers.has(`${app}:${version}`)?{application:app,version}:undefined;throw Error('Unexpected read')},async run(...args){writes.push(sql);if(sql.startsWith('INSERT INTO ascore_schema_versions'))markers.add(`${args[0]}:${args[1]}`);return {affectedRows:1}}}},async exec(sql){writes.push(sql);const name=/CREATE TABLE IF NOT EXISTS (\w+)/.exec(sql)[1];names.add(name)}}
 return {db,names,markers,writes}
}
test('normal production verification accepts owned course tables and refuses unmarked tables without writes',async()=>{
 const owned=fixture({owned:true});await verifyMariaDbSchema(owned.db);assert.deepEqual(owned.writes,[])
 const foreign=fixture({foreign:true});await assert.rejects(verifyMariaDbSchema(foreign.db),/ownership/);assert.deepEqual(foreign.writes,[])
})
test('production startup accepts the owned private AED 2 ledger and still refuses foreign or unmarked tables',async()=>{
 const owned=fixture({owned:true});owned.names.add('course_private_nomod_tests');owned.markers.add('ascore-nomod-small-test:1')
 assert.deepEqual(await verifyMariaDbSchema(owned.db),{version:1});assert.deepEqual(owned.writes,[])
 owned.markers.delete('ascore-nomod-small-test:1');await assert.rejects(verifyMariaDbSchema(owned.db),/private test table.*ownership/)
 owned.markers.add('ascore-nomod-small-test:1');owned.names.add('foreign_payments');await assert.rejects(verifyMariaDbSchema(owned.db),/dedicated/)
 assert.deepEqual(owned.writes,[])
})
test('course migration needs explicit approval and refuses a conflicting unowned inventory',async()=>{
 const initial=fixture();await assert.rejects(initializeCourseSchema(initial.db,{}),/approval/);assert.deepEqual(initial.writes,[])
 const foreign=fixture({foreign:true});await assert.rejects(initializeCourseSchema(foreign.db,{ASCORE_ALLOW_COURSE_SCHEMA_SETUP:'1'}),/ownership/);assert.deepEqual(foreign.writes,[])
})
test('course migration creates only its three tables and ownership markers; reruns perform no writes',async()=>{
 const state=fixture(),env={ASCORE_ALLOW_COURSE_SCHEMA_SETUP:'1'};await initializeCourseSchema(state.db,env);assert.ok(courseTables.every(n=>state.names.has(n)));assert.equal(state.writes.filter(s=>s.startsWith('CREATE TABLE')).length,3);assert.ok(state.markers.has('ascore-courses:1'));await verifyMariaDbSchema(state.db);state.writes.length=0;await initializeCourseSchema(state.db,env);assert.deepEqual(state.writes,[])
})
