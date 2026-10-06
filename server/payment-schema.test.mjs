import test from 'node:test'
import assert from 'node:assert/strict'
import {initializePaymentSchema,verifyPaymentSchema,paymentTables} from './payment-schema.mjs'

function maria({names=['ascore_schema_versions'],markers=[]}={}){
 const tables=new Set(names),versions=new Set(['ascore-platform:1',...markers]),writes=[]
 return {kind:'mariadb',writes,prepare(sql){return {async all(){assert.match(sql,/information_schema/);return [...tables].map(name=>({name}))},async get(application,version){assert.match(sql,/ascore_schema_versions/);return versions.has(application+':'+version)?{application,version}:undefined},async run(application,version){writes.push(sql);versions.add(application+':'+version)}}},async exec(sql){writes.push(sql);tables.add(/CREATE TABLE IF NOT EXISTS (\w+)/.exec(sql)[1])}}
}
test('payment schema needs explicit approval and refuses conflicting unowned tables before writing',async()=>{
 const noApproval=maria();await assert.rejects(initializePaymentSchema(noApproval),/explicit runtime approval/);assert.equal(noApproval.writes.length,0)
 const conflict=maria({names:['ascore_schema_versions',paymentTables[0]]});await assert.rejects(initializePaymentSchema(conflict,{ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP:'1'}),/ownership marker/);assert.equal(conflict.writes.length,0)
})
test('payment schema creates only its four optional tables and ownership markers; rerun and verification are read-only',async()=>{
 const db=maria();await initializePaymentSchema(db,{ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP:'1'});assert.equal(db.writes.filter(s=>s.startsWith('CREATE TABLE')).length,4);assert.equal(db.writes.length,6);for(const name of paymentTables)assert.ok(db.writes.some(s=>s.startsWith('CREATE TABLE IF NOT EXISTS '+name+' ')))
 const before=db.writes.length;await initializePaymentSchema(db,{ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP:'1'});await verifyPaymentSchema(db);assert.equal(db.writes.length,before)
 const missing=maria({names:['ascore_schema_versions'],markers:['ascore-payments:1']});await assert.rejects(verifyPaymentSchema(missing),/not initialized/);assert.equal(missing.writes.length,0)
})
