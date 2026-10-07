import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {courseOrderHistory} from './course-order-history.mjs'
import {privateNomodRequestId} from './nomod-private-test.mjs'
test('all-order history merges customer and test ledgers, pages tied dates without gaps, hides capabilities and rejects non-admins',async t=>{
 const db=createSqliteStore();t.after(()=>db.close())
 for(const table of ['course_paid_orders','course_orders','course_private_nomod_tests'])await db.exec(`CREATE TABLE ${table}(id TEXT,request_id TEXT,email TEXT,items TEXT,total_minor INTEGER,currency TEXT,payment_status TEXT,created_at INTEGER,expires_at INTEGER,delivery TEXT,review_reason TEXT,secret TEXT)`)
 for(let i=0;i<120;i++){
  const source=i%3,table=['course_paid_orders','course_orders','course_private_nomod_tests'][source]
  await db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(),i===0?privateNomodRequestId:randomUUID(),'buyer@example.test','["meta"]',source===1?0:200,'AED',i%2?'pending':'paid',1000+Math.floor(i/4),999999,JSON.stringify({status:'accepted',customerName:'Ascore buyer',providerReference:'private-reference',claim:'private-claim'}),null,'never-expose-this')
 }
 const seen=[];let cursor=null
 do{const page=await courseOrderHistory(db,{role:'admin'},cursor);seen.push(...page.orders);cursor=page.nextCursor}while(cursor)
 assert.equal(seen.length,120);assert.equal(new Set(seen.map(o=>o.source+o.id)).size,120)
 assert.equal(seen.filter(o=>o.kind==='private_test').length,41);assert.equal(seen.filter(o=>o.kind==='zero_payment_test').length,40)
 assert.ok(seen.some(o=>o.includedInSales));assert.ok(seen.filter(o=>o.kind!=='purchase').every(o=>!o.includedInSales))
 const output=JSON.stringify(seen);for(const secret of ['never-expose-this','private-claim','private-reference','receiptToken','downloadToken'])assert.ok(!output.includes(secret))
 await assert.rejects(courseOrderHistory(db,{role:'client'}),e=>e.status===403)
 await assert.rejects(courseOrderHistory(db,{role:'admin'},'invalid'),e=>e.status===400)
})
