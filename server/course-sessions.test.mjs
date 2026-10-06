import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {createWeeklyMetaSessions,initializeSessionSchema,fridaySession} from './course-sessions.mjs'
const friday=Date.parse('2026-10-09T05:00:00Z')
const env={ASCORE_ENABLE_WEEKLY_META_EMAILS:'1',ASCORE_META_SESSION_EMAILS_APPROVED:'1',ASCORE_META_SESSION_DELIVERY_VERIFIED:'1',ASCORE_META_SESSION_JOIN_URL:'https://meeting.example/ascore-fixture',ASCORE_META_SESSION_PLATFORM:'Mock video meeting',ASCORE_META_SESSION_EMAIL_HOUR_UAE:'9'}
async function harness(t,{failure=false}={}){
 const db=createSqliteStore();await initializePaymentSchema(db);await initializeSessionSchema(db)
 const mails=[],audit=[],services={db,env,paymentReady:()=>true,sendEmail:async m=>{mails.push(m);if(failure)throw Error('Uncertain mock mail');return {reference:'mock'}},now:()=>friday,workerInterval:3600000,audit:async(...args)=>audit.push(args)}
 const job=await createWeeklyMetaSessions(services);t.after(async()=>{await job.close();await db.close()})
 const buyer=async(items=['meta'],status='paid',email='student@example.com')=>{const id=randomUUID();await db.prepare('INSERT INTO course_paid_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,randomUUID(),'a'.repeat(64),email,JSON.stringify(items),items.length*4999,'AED','b'.repeat(64),null,null,status,friday-86400000,friday-3600000,0,'{"status":"accepted"}',null);return id}
 return {db,job,services,mails,audit,buyer}
}
test('Friday sessions use Asia/Dubai 2 PM and require every separate approval/configuration gate',async t=>{
 assert.deepEqual(fridaySession(friday),{friday:true,hour:9,weekKey:'2026-10-09',starts:'2026-10-09T14:00:00+04:00'})
 const h=await harness(t);await h.buyer()
 for(const key of Object.keys(env)){const job=await createWeeklyMetaSessions({...h.services,env:{...env,[key]:''}});assert.equal(job.ready(),false);await job.tick();await job.close()}
 const off=await createWeeklyMetaSessions({...h.services,paymentReady:()=>false});await off.tick();await off.close();assert.equal(h.mails.length,0)
})
test('ongoing paid Meta buyers receive at most one audited Friday email across workers and duplicate purchases',async t=>{
 const h=await harness(t);await h.buyer();await h.buyer(['meta','ai']);await h.buyer(['ai'],'paid','ai@example.com');await h.buyer(['meta'],'pending','pending@example.com');await h.buyer(['meta'],'review','refund@example.com')
 const other=await createWeeklyMetaSessions(h.services);t.after(()=>other.close());await Promise.all([h.job.tick(),other.tick()]);await h.job.tick()
 assert.equal(h.mails.length,1);assert.equal(h.mails[0].to,'student@example.com');assert.match(h.mails[0].text,/2 PM UAE/);assert.match(h.mails[0].text,/Q&A/);assert.match(h.mails[0].text,/No recurring course charge/)
 assert.deepEqual((await h.db.prepare('SELECT state FROM course_session_emails').all()).map(r=>r.state),['accepted']);assert.equal(h.audit.length,2)
 const next=await createWeeklyMetaSessions({...h.services,now:()=>friday+7*86400000});t.after(()=>next.close());await next.tick();assert.equal(h.mails.length,2)
})
test('uncertain Friday mail is held without retry, and non-Friday / post-session times send nothing',async t=>{
 const h=await harness(t,{failure:true});await h.buyer();await h.job.tick();await h.job.tick();assert.equal(h.mails.length,1);assert.equal((await h.db.prepare('SELECT state FROM course_session_emails').get()).state,'uncertain')
 for(const time of [friday-86400000,friday+5*3600000,friday+6*3600000]){const job=await createWeeklyMetaSessions({...h.services,now:()=>time});await job.tick();await job.close()}
 assert.equal(h.mails.length,1)
})
