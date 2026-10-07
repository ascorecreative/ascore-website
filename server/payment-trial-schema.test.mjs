import test from 'node:test'
import assert from 'node:assert/strict'
import {enablePublicTrialAmounts,paymentTables} from './payment-schema.mjs'
function fixture({owned=true,clause='`total_minor` in (4999,9998,5000,10000)',race=false,level='Table',column={type:'int(11)',nullable:'NO',defaultValue:null,extra:'',comment:''},applied=true}={}){
 const ddl=[];let altered=false
 const db={kind:'mariadb',prepare(sql){return {async get(){if(sql.includes('information_schema.COLUMNS'))return column;return owned?{application:'ascore-payments',version:1}:null},async all(){if(sql.includes('information_schema.tables'))return paymentTables.map(name=>({name}));return [{level,name:altered?'ascore_paid_amount':'total_minor',clause:altered?'`total_minor` in (200,400,4999,9998,5000,10000)':clause}]} }},async exec(sql){ddl.push(sql);altered=applied;if(race)throw Error('Another process already applied the migration')}}
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

test('inline MariaDB amount checks use MODIFY with preserved column attributes and verified postcondition',async()=>{
 const h=fixture({level:'Column'});await enablePublicTrialAmounts(h.db);await enablePublicTrialAmounts(h.db)
 assert.equal(h.ddl.length,1);assert.equal(h.ddl[0],'ALTER TABLE course_paid_orders MODIFY COLUMN total_minor INTEGER NOT NULL CHECK(total_minor IN (200,400,4999,9998,5000,10000))')
 const raced=fixture({level:'Column',race:true});await enablePublicTrialAmounts(raced.db)
 for(const column of [{type:'bigint',nullable:'NO',defaultValue:null,extra:'',comment:''},{type:'int(11)',nullable:'YES',defaultValue:null,extra:'',comment:''}]){
  const bad=fixture({level:'Column',column});await assert.rejects(enablePublicTrialAmounts(bad.db));assert.equal(bad.ddl.length,0)
 }
 const unchanged=fixture({level:'Column',applied:false});await assert.rejects(enablePublicTrialAmounts(unchanged.db),/not verified/)
})
