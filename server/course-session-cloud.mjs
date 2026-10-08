import {createHash,createHmac,timingSafeEqual} from 'node:crypto'
import {fridaySession,initializeSessionSchema,verifySessionSchema} from './course-sessions.mjs'
import {isPrivateNomodTest} from './nomod-private-test.mjs'
import {verifyPaymentSchema} from './payment-schema.mjs'
import {verifyDatabaseIdentity} from './database-preflight.mjs'
import {verifyMariaDbSchema} from './mariadb-schema.mjs'
const hash=v=>createHash('sha256').update(v).digest('hex')
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
export const cloudSessionPath='/api/courses/sessions/cloud'
const owner=u=>u?.role==='admin'&&u.username==='aswinfrn'
export const eligibleSessionBuyer=row=>{try{return !isPrivateNomodTest(row)&&row?.payment_status==='paid'&&row.currency==='AED'&&JSON.parse(row.items).includes('meta')&&typeof row.email==='string'&&/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(row.email)}catch{return false}}
const meet=url=>typeof url==='string'&&/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url)
const tables=['course_session_cloud_config']
export async function initializeCloudSessionSchema(db,env={}){
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_SESSION_SCHEMA_SETUP!=='1'||db.readiness?.identityVerified!==true||db.readiness?.schemaVersion!==1)throw Error('Verified owner setup is required.')
  await verifyDatabaseIdentity(db,env);await verifyMariaDbSchema(db);await verifyPaymentSchema(db)
 }
 await initializeSessionSchema(db,env)
 if(db.kind==='mariadb'){
  const owned=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-session-cloud',1)
  if(owned){await db.prepare('SELECT * FROM course_session_cloud_config LIMIT 0').all();return}
  const partial=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-session-cloud',0)
  const names=await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()
  if(!partial&&names.some(r=>tables.includes(r.name)))throw Error('Unowned session configuration exists.')
  if(!partial)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-session-cloud',0,Date.now())
 }
 await db.exec(`CREATE TABLE IF NOT EXISTS course_session_cloud_config (id INTEGER PRIMARY KEY, enabled INTEGER NOT NULL, join_url VARCHAR(128) NOT NULL, key_hash CHAR(64) NOT NULL, sender_email VARCHAR(254) NOT NULL, updated_at BIGINT NOT NULL, last_check_at BIGINT)${db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''}`)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-session-cloud',1,Date.now())
}
export async function createCloudMetaSessions({db,env={},readJson,audit=async()=>{},now=Date.now,paymentReady=()=>false}){
 let schemaReady=false,paymentsReady=false,setupFlight=null
 try{await verifySessionSchema(db);await db.prepare('SELECT * FROM course_session_cloud_config LIMIT 0').all();if(db.kind==='mariadb'&&!await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-session-cloud',1))throw Error();schemaReady=true}catch{}
 try{await verifyPaymentSchema(db);paymentsReady=true}catch{}
 const config=async()=>schemaReady?await db.prepare('SELECT * FROM course_session_cloud_config WHERE id=1').get():null
 const verifiedRuntime=()=>db.kind==='mariadb'?db.readiness?.identityVerified===true&&db.readiness?.schemaVersion===1:db.kind==='sqlite'&&env.NODE_ENV!=='production'
 const inWindow=()=>{const s=fridaySession(now());return s.friday&&s.hour>=9&&s.hour<14}
 const status=async user=>{const c=await config();return {schemaReady,enabled:c?.enabled===1||Number(c?.enabled)===1,joinUrl:c?.join_url||'',sender:'ascorecreative@gmail.com',emailTime:'Friday 09:00 Asia/Dubai',meetingTime:'Friday 14:00 Asia/Dubai',lastCheckAt:c?.last_check_at?Number(c.last_check_at):null,setupAllowed:owner(user)&&verifiedRuntime()&&paymentsReady,deliveries:schemaReady?await db.prepare('SELECT week_key AS week,state,COUNT(*) AS count FROM course_session_emails GROUP BY week_key,state ORDER BY week_key DESC LIMIT 20').all():[]}}
 const claimToken=(key,week,recipient)=>createHmac('sha256',key).update(`ascore:friday:v1:${week}:${recipient}`).digest('hex')
 return {status,async configured(){return !!Number((await config())?.enabled)},async adminHandle(req,res,path,user,json){
  if(path!=='/api/courses/admin/sessions')return false
  if(req.method==='GET'){json(res,200,await status(user));return true}
  if(req.method!=='POST')return false
  if(!owner(user)||!verifiedRuntime()||!paymentsReady)fail(403,'Only the verified agency owner can configure Friday emails.')
  const body=await readJson(req)
  if(Object.keys(body).some(k=>!['enabled','joinUrl','key'].includes(k))||typeof body.enabled!=='boolean'||!meet(body.joinUrl)||typeof body.key!=='string'||!/^[a-f0-9]{64}$/.test(body.key))fail(400,'Use a Google Meet link and a private 64-character automation key.')
  if(!schemaReady){if(!setupFlight)setupFlight=initializeCloudSessionSchema(db,{...env,ASCORE_ALLOW_SESSION_SCHEMA_SETUP:'1'}).then(()=>{schemaReady=true}).finally(()=>{setupFlight=null});await setupFlight}
  await db.transaction(async()=>{
   const c=await config();if(c)await db.prepare('UPDATE course_session_cloud_config SET enabled=?,join_url=?,key_hash=?,sender_email=?,updated_at=?,last_check_at=NULL WHERE id=1').run(body.enabled?1:0,body.joinUrl,hash(body.key),'ascorecreative@gmail.com',now())
   else await db.prepare('INSERT INTO course_session_cloud_config VALUES (?,?,?,?,?,?,?)').run(1,body.enabled?1:0,body.joinUrl,hash(body.key),'ascorecreative@gmail.com',now(),null)
   await audit(user.id,body.enabled?'friday_gmail_configured':'friday_gmail_paused','ascore-session-cloud')
  });json(res,200,await status(user));return true
 },async publicHandle(req,res,path,json){
  if(path!==cloudSessionPath||req.method!=='POST')return false
  const key=String(req.headers.authorization||'').replace(/^Bearer /,'')
  const c=await config();if(!c||!Number(c.enabled)||!/^[a-f0-9]{64}$/.test(key)||!equal(hash(key),c.key_hash))fail(403,'Session automation access is unavailable.')
  const body=await readJson(req);if(Object.keys(body).some(k=>!['action','sender','week','recipient','token','state'].includes(k))||body.sender!==c.sender_email)fail(403,'The Ascore sender is required.')
  if(body.action==='status'){
   await db.prepare('UPDATE course_session_cloud_config SET last_check_at=? WHERE id=1').run(now())
   json(res,200,{ready:paymentReady()===true,window:inWindow(),meeting:c.join_url,emailTime:'Friday 09:00 Asia/Dubai',meetingTime:'Friday 14:00 Asia/Dubai'});return true
  }
  if(['validate','complete'].includes(body.action)){
   if(typeof body.week!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.week)||typeof body.recipient!=='string'||!/^[a-f0-9]{64}$/.test(body.recipient)||!equal(body.token,claimToken(key,body.week,body.recipient)))fail(403,'Session claim verification failed.')
   const row=await db.prepare('SELECT * FROM course_session_emails WHERE week_key=? AND recipient_hash=?').get(body.week,body.recipient)
   if(!row)fail(404,'Session claim not found.')
   if(body.action==='validate'){json(res,200,{valid:row.state==='sending'&&body.week===fridaySession(now()).weekKey&&inWindow()&&paymentReady()===true&&eligibleSessionBuyer(await db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(row.order_id))});return true}
   if(!['accepted','uncertain','skipped'].includes(body.state))fail(400,'Use an email acceptance state.')
   await db.transaction(async()=>{const latest=await db.prepare(db.lock('SELECT * FROM course_session_emails WHERE week_key=? AND recipient_hash=?')).get(body.week,body.recipient);if(latest.state==='sending'){await db.prepare('UPDATE course_session_emails SET state=?,finished_at=? WHERE week_key=? AND recipient_hash=?').run(body.state,now(),body.week,body.recipient);await audit('course-sessions','weekly_gmail_'+body.state,`${body.week}:${body.recipient}`)}})
   json(res,200,{recorded:true});return true
  }
  if(body.action!=='claim')fail(400,'Unknown session action.')
  await db.prepare('UPDATE course_session_cloud_config SET last_check_at=? WHERE id=1').run(now())
  if(!inWindow()||paymentReady()!==true){json(res,200,{claim:null});return true}
  const week=fridaySession(now()).weekKey
  const claim=await db.transaction(async()=>{
   const rows=await db.prepare(db.lock("SELECT * FROM course_paid_orders WHERE payment_status='paid' ORDER BY created_at ASC")).all()
   for(const row of rows){
    if(!eligibleSessionBuyer(row))continue
    const recipient=hash(row.email.trim().toLowerCase())
    if(await db.prepare(db.lock('SELECT state FROM course_session_emails WHERE week_key=? AND recipient_hash=?')).get(week,recipient))continue
    await db.prepare('INSERT INTO course_session_emails VALUES (?,?,?,?,?,?)').run(week,recipient,row.id,'sending',now(),null)
    await audit('course-sessions','weekly_gmail_claimed',`${week}:${recipient}`)
    return {week,recipient,token:claimToken(key,week,recipient),to:row.email.trim().toLowerCase(),subject:`Your Ascore Meta Ads live session · ${week} · 2 PM UAE`,text:`Hi,\n\nYour weekly Meta Ads live session is today, Friday ${week}, at 2 PM UAE time (Asia/Dubai).\n\nJoin on Google Meet:\n${c.join_url}\n\nWe will cover live campaign setup and answer your questions. This session is included in your one-time Meta Ads course purchase.\n\nFor enquiries, WhatsApp or call +971568555626.\n\nSee you at 2 PM,\nAscore Creative\nhttps://ascore.ae`}
   }return null
  }).catch(e=>{if(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(e.code))return null;throw e})
  json(res,200,{claim});return true
 }}
}
