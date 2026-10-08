import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {createCloudMetaSessions} from './course-session-cloud.mjs'
import {privateNomodRequestId} from './nomod-private-test.mjs'
const friday=Date.parse('2026-10-09T05:00:00Z'),key='d'.repeat(64),owner={id:'owner',username:'aswinfrn',role:'admin'}
async function harness(t){
 const db=createSqliteStore();await initializePaymentSchema(db);t.after(()=>db.close());let time=friday,ready=true
 const service=await createCloudMetaSessions({db,readJson:async r=>r.body,now:()=>time,paymentReady:()=>ready})
 const call=async(body,auth=key)=>{let result;await service.publicHandle({method:'POST',headers:{authorization:'Bearer '+auth},body:{sender:'ascorecreative@gmail.com',...body}},null,'/api/courses/sessions/cloud',(_,status,data)=>{result={status,...data}});return result}
 const configure=async(user=owner)=>service.adminHandle({method:'POST',body:{enabled:true,joinUrl:'https://meet.google.com/abc-defg-hij',key}},null,'/api/courses/admin/sessions',user,()=>{})
 const buyer=async(items=['meta'],status='paid',email='buyer@example.com',request=randomUUID())=>{const id=randomUUID();await db.prepare('INSERT INTO course_paid_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,request,'a'.repeat(64),email,JSON.stringify(items),4999,'AED','b'.repeat(64),null,null,status,friday-86400000,friday-3600000,0,'{"status":"accepted"}',null);return id}
 return {db,service,call,configure,buyer,time:v=>time=v,ready:v=>ready=v}
}
test('only the verified owner configures cloud access; wrong credentials/account are rejected',async t=>{
 const h=await harness(t);await assert.rejects(h.configure({...owner,username:'other'}),{status:403});await h.configure();await assert.rejects(h.call({action:'status'},'e'.repeat(64)),{status:403});await assert.rejects(h.call({action:'status',sender:'accurweb@gmail.com'}),{status:403});assert.equal((await h.service.status(owner)).enabled,true)
})
test('duplicate purchases and concurrent workers produce only one weekly claim per eligible paid Meta email',async t=>{
 const h=await harness(t);await h.configure();await h.buyer();await h.buyer(['meta','ai']);await h.buyer(['ai'],'paid','ai@example.com');await h.buyer(['meta'],'pending','pending@example.com');await h.buyer(['meta'],'review','review@example.com');await h.buyer(['meta'],'paid','private@example.com',privateNomodRequestId)
 const claims=(await Promise.all([h.call({action:'claim'}),h.call({action:'claim'})])).map(v=>v.claim).filter(Boolean);assert.equal(claims.length,1);const c=claims[0];assert.equal(c.to,'buyer@example.com');assert.match(c.text,/2 PM UAE/);assert.match(c.text,/971568555626/)
 assert.equal((await h.call({action:'validate',week:c.week,recipient:c.recipient,token:c.token})).valid,true)
 await h.call({action:'complete',week:c.week,recipient:c.recipient,token:c.token,state:'accepted'});await h.call({action:'complete',week:c.week,recipient:c.recipient,token:c.token,state:'uncertain'});assert.equal((await h.db.prepare('SELECT state FROM course_session_emails').get()).state,'accepted');assert.equal((await h.call({action:'claim'})).claim,null)
 h.time(friday+7*86400000);assert.ok((await h.call({action:'claim'})).claim)
})
test('Friday/time gates, refund recheck and uncertain-send hold prevent incorrect or repeated mail',async t=>{
 const h=await harness(t);await h.configure();const id=await h.buyer();for(const time of [friday-1,friday-86400000,friday+5*3600000]){h.time(time);assert.equal((await h.call({action:'claim'})).claim,null)}h.time(friday);h.ready(false);assert.equal((await h.call({action:'claim'})).claim,null);h.ready(true)
 const c=(await h.call({action:'claim'})).claim;await h.db.prepare("UPDATE course_paid_orders SET payment_status='review' WHERE id=?").run(id);assert.equal((await h.call({action:'validate',week:c.week,recipient:c.recipient,token:c.token})).valid,false);await assert.rejects(h.call({action:'complete',week:c.week,recipient:c.recipient,token:'e'.repeat(64),state:'accepted'}),{status:403});await h.call({action:'complete',week:c.week,recipient:c.recipient,token:c.token,state:'uncertain'});await h.db.prepare("UPDATE course_paid_orders SET payment_status='paid' WHERE id=?").run(id);assert.equal((await h.call({action:'claim'})).claim,null)
})
