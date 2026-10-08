import {isPrivateNomodTest} from './nomod-private-test.mjs'
import {createHash} from 'node:crypto'
import {smtpConfigured,sender} from './courses.mjs'

const hash=value=>createHash('sha256').update(value).digest('hex')
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'})
export function fridaySession(now=Date.now()){
 const p=Object.fromEntries(parts.formatToParts(new Date(now)).map(p=>[p.type,p.value]))
 return {friday:p.weekday==='Fri',hour:Number(p.hour),weekKey:`${p.year}-${p.month}-${p.day}`,starts:`${p.year}-${p.month}-${p.day}T14:00:00+04:00`}
}
export async function verifySessionSchema(db){
 if(db.kind==='mariadb'&&!await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-sessions',1))throw Error('Session email schema is unverified.')
 await db.prepare('SELECT week_key,recipient_hash,order_id,state,claimed_at,finished_at FROM course_session_emails LIMIT 0').all()
}
// Preparation only: production never calls this migration automatically.
export async function initializeSessionSchema(db,env={}){
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_SESSION_SCHEMA_SETUP!=='1'||db.readiness?.identityVerified!==true)throw Error('Session email setup requires explicit approved database access.')
  for(const application of ['ascore-platform','ascore-payments'])if(!await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,1))throw Error('Platform and payment ownership must be verified before session setup.')
  const owned=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-sessions',1)
  if(owned){await verifySessionSchema(db);return}
  const partial=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-sessions',0)
  const names=await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()
  if(!partial&&names.some(r=>r.name==='course_session_emails'))throw Error('Existing session email table has no verified ownership marker.')
  if(!partial)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-sessions',0,Date.now())
 }
 await db.exec(`CREATE TABLE IF NOT EXISTS course_session_emails (week_key CHAR(10) NOT NULL, recipient_hash CHAR(64) NOT NULL, order_id VARCHAR(36) NOT NULL, state VARCHAR(16) NOT NULL, claimed_at BIGINT NOT NULL, finished_at BIGINT, PRIMARY KEY(week_key,recipient_hash))${db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''}`)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-sessions',1,Date.now())
}
export async function createWeeklyMetaSessions({db,env={},paymentReady=()=>false,sendEmail,now=Date.now,audit=async()=>{},workerInterval=60000,cloudConfigured=async()=>false}){
 let schemaReady=false;try{await verifySessionSchema(db);schemaReady=true}catch{}
 const hour=env.ASCORE_META_SESSION_EMAIL_HOUR_UAE
 const platform=env.ASCORE_META_SESSION_PLATFORM
 const join=env.ASCORE_META_SESSION_JOIN_URL
 const joinReady=(()=>{try{const u=new URL(join);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&u.hostname.includes('.')}catch{return false}})()
 const requirements={enabled:env.ASCORE_ENABLE_WEEKLY_META_EMAILS==='1',approved:env.ASCORE_META_SESSION_EMAILS_APPROVED==='1',deliveryVerified:env.ASCORE_META_SESSION_DELIVERY_VERIFIED==='1',schemaReady,meetingReady:joinReady&&typeof platform==='string'&&platform.trim().length>0&&platform.length<80&&!/[\r\n]/.test(platform),sendHourConfigured:typeof hour==='string'&&/^(?:[0-9]|1[0-3])$/.test(hour),senderConfigured:!!sendEmail||smtpConfigured(env)}
 const ready=()=>Object.values(requirements).every(Boolean)&&paymentReady()===true
 const mail=sendEmail||(requirements.senderConfigured?sender(env):null)
 let flight=null
 const eligible=row=>{try{return !isPrivateNomodTest(row)&&row?.payment_status==='paid'&&row.currency==='AED'&&JSON.parse(row.items).includes('meta')&&typeof row.email==='string'&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(row.email)}catch{return false}}
 async function run(){
  const session=fridaySession(now());if(await cloudConfigured()||!ready()||!session.friday||session.hour<Number(hour)||session.hour>=14)return
  // Ongoing access: PDF-link expiry does not end weekly session eligibility.
  const rows=await db.prepare("SELECT * FROM course_paid_orders WHERE payment_status='paid' ORDER BY created_at ASC").all()
  for(const row of rows){
   if(!eligible(row))continue
   const recipientHash=hash(row.email.trim().toLowerCase()),week=session.weekKey
   const claimed=await db.transaction(async()=>{
    if(await db.prepare(db.lock('SELECT state FROM course_session_emails WHERE week_key=? AND recipient_hash=?')).get(week,recipientHash))return false
    const latest=await db.prepare(db.lock('SELECT * FROM course_paid_orders WHERE id=?')).get(row.id);if(!eligible(latest))return false
    await db.prepare('INSERT INTO course_session_emails (week_key,recipient_hash,order_id,state,claimed_at,finished_at) VALUES (?,?,?,?,?,?)').run(week,recipientHash,row.id,'sending',now(),null)
    await audit('course-sessions','weekly_session_email_claimed',`${week}:${recipientHash}`);return true
   }).catch(error=>{if(['SQLITE_CONSTRAINT_PRIMARYKEY','SQLITE_CONSTRAINT_UNIQUE','ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code))return false;throw error})
   if(!claimed)continue
   let state='uncertain'
   try{
    if(!ready()||!eligible(await db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(row.id))){state='skipped'}
    else{await mail({from:{name:'Ascore Creative',address:'orders@ascore.ae'},to:row.email,messageId:`<meta-session-${week}-${recipientHash}@ascore.ae>`,subject:`Friday Meta Ads session · ${week} · 2 PM UAE`,text:`Your ongoing weekly Meta Ads session is included in your one-time course purchase.\n\nFriday ${week}, 2 PM UAE time (Asia/Dubai).\nLive campaign setup demo and audience questions / Q&A.\n\nJoin via ${platform.trim()}:\n${join}\n\nNo recurring course charge. Advertising spend is separate.\nQuestions: info@ascore.ae`,envelope:{from:'orders@ascore.ae',to:[row.email]}});state='accepted'}
   }catch{/* An uncertain SMTP result must never be automatically sent again. */}
   await db.transaction(async()=>{await db.prepare('UPDATE course_session_emails SET state=?,finished_at=? WHERE week_key=? AND recipient_hash=?').run(state,now(),week,recipientHash);await audit('course-sessions','weekly_session_email_'+state,`${week}:${recipientHash}`)})
  }
 }
 async function tick(){if(flight)return flight;flight=run();try{await flight}finally{flight=null}}
 const interval=ready()?setInterval(()=>tick().catch(()=>{}),workerInterval):null;interval?.unref()
 return {requirements,ready,tick,async close(){if(interval)clearInterval(interval);if(flight)await Promise.allSettled([flight])}}
}
