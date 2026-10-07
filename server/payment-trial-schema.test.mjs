import test from 'node:test'
import assert from 'node:assert/strict'
import {enablePublicTrialAmounts,paymentTables} from './payment-schema.mjs'
function fixture({owned=true,clause='`total_minor` in (4999,9998,5000,10000)',race=false}={}){
 const ddl=[];let altered=false
 const db={kind:'mariadb',prepare(sql){return {async get(){return owned?{application:'ascore-payments',version:1}:null},async all(){if(sql.includes('information_schema.tables'))return paymentTables.map(name=>({name}));return [{name:altered?'ascore_paid_amount':'total_minor',clause:altered?'`total_minor` in (200,400,4999,9998,5000,10000)':clause}]} }},async exec(sql){ddl.push(sql);altered=true;if(race)throw Error('Another process already applied the migration')}}
 return {db,ddl}
}
test('public trial expands only the owned known amount constraint and reruns without further DDL',async()=>{
 const h=fixture();await enablePublicTrialAmounts(h.db);await enablePublicTrialAmounts(h.db)
 assert.equal(h.ddl.length,1);assert.match(h.ddl[0],/^ALTER TABLE course_paid_orders DROP CONSTRAINT `total_minor`, ADD CONSTRAINT ascore_paid_amount CHECK\(total_minor IN \(200,400,4999,9998,5000,10000\)\)$/)
})
test('public trial refuses unknown or unowned constraints before any DDL and tolerates a verified concurrent migration',async()=>{
 for(const opts of [{owned:false},{clause:'`total_minor` > 0'}]){const h=fixture(opts);await assert.rejects(enablePublicTrialAmounts(h.db));assert.equal(h.ddl.length,0)}
 const h=fixture({race:true});await enablePublicTrialAmounts(h.db);assert.equal(h.ddl.length,1)
})
