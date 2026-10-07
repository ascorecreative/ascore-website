import {isPrivateNomodTest,privateNomodRequestId,privateNomodReason,replacementNomodRequestId,replacementNomodReason} from './nomod-private-test.mjs'
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto'
import {verifyPaymentSchema} from './payment-schema.mjs'
import {verifyDatabaseIdentity} from './database-preflight.mjs'
import {verifyMariaDbSchema} from './mariadb-schema.mjs'
import {uniqueConflict} from './persistence.mjs'
const hash=value=>createHash('sha256').update(value).digest('hex')
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const known=id=>['meta','ai'].includes(id)
export const courseReviewToken=row=>hash(`ascore:review:v1:${row.id}:${row.secret}`)
const tokenMatches=(token,row)=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)&&timingSafeEqual(Buffer.from(token),Buffer.from(courseReviewToken(row)))
const tables=['course_reviews','course_review_limits']
export async function verifyReviewSchema(db){
 for(const name of tables)await db.prepare(`SELECT * FROM ${name} LIMIT 0`).all()
 if(db.kind==='mariadb'&&!await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-reviews',1))throw Error('Review ownership is unverified.')
}
export async function initializeReviewSchema(db,env={}){
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_REVIEW_SCHEMA_SETUP!=='1'||db.readiness?.identityVerified!==true||db.readiness?.schemaVersion!==1)throw Error('Review setup requires explicit verified database approval.')
  await verifyDatabaseIdentity(db,env);await verifyMariaDbSchema(db);await verifyPaymentSchema(db)
  const complete=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-reviews',1)
  if(complete){await verifyReviewSchema(db);return}
  const partial=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-reviews',0)
  const names=await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()
  if(!partial&&names.some(r=>tables.includes(r.name)))throw Error('Existing review tables have no verified ownership marker.')
  if(!partial)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-reviews',0,Date.now())
 }
 const suffix=db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''
 await db.exec(`CREATE TABLE IF NOT EXISTS course_reviews (id VARCHAR(36) PRIMARY KEY, order_id VARCHAR(36) NOT NULL, course_id VARCHAR(16) NOT NULL, recipient_hash CHAR(64) NOT NULL, author VARCHAR(80) NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL, state VARCHAR(16) NOT NULL, created_at BIGINT NOT NULL, moderated_at BIGINT, moderated_by VARCHAR(36), UNIQUE(recipient_hash,course_id), FOREIGN KEY(order_id) REFERENCES course_paid_orders(id))${suffix}`)
 await db.exec(`CREATE TABLE IF NOT EXISTS course_review_limits (ip_hash CHAR(64) PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL)${suffix}`)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-reviews',1,Date.now())
}
export async function createCourseReviews({db,env={},readJson,audit=async()=>{},now=Date.now}){
 let schemaReady=false,paymentsReady=false,setupFlight=null
 try{await verifyReviewSchema(db);schemaReady=true}catch{}
 try{await verifyPaymentSchema(db);paymentsReady=true}catch{}
 let activated=false
 try{activated=!!await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-reviews',2)}catch{}
 const enabled=()=>env.ASCORE_ENABLE_COURSE_REVIEWS==='1'||activated,ready=()=>enabled()&&schemaReady&&paymentsReady
 // Owner approval is recorded durably; additive review tables do not alter checkout.
 const verifiedRuntime=()=>db.kind==='mariadb'?db.readiness?.identityVerified===true&&db.readiness?.schemaVersion===1:db.kind==='sqlite'&&env.NODE_ENV!=='production'
 const setup=user=>({allowed:user?.role==='admin'&&user.username==='aswinfrn'&&verifiedRuntime()&&paymentsReady,inProgress:!!setupFlight,reason:!paymentsReady?'payment_schema_required':!verifiedRuntime()?'runtime_not_verified':'owner_approval_required'})
 const view=row=>({id:row.id,courseId:row.course_id,author:row.author,rating:Number(row.rating),body:row.body,createdAt:Number(row.created_at)})
 async function buyer(req,id,course){
  if(!uuid(id)||!known(course))fail(403,'A verified course purchase is required.')
  const row=await db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(id)
  if(!row||isPrivateNomodTest(row)||row.payment_status!=='paid'||row.currency!=='AED'||!JSON.parse(row.items).includes(course)||!tokenMatches(req.headers['x-course-review'],row))fail(403,'A verified course purchase is required.')
  return row
 }
 function fields(body,allowed){if(!body||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))fail(400,'Review fields are invalid.')}
 return {ready,async publicHandle(req,res,path,json){
  const list=/^\/api\/courses\/reviews\/(meta|ai)$/.exec(path)
  if(list&&req.method==='GET'){
   if(!ready()){json(res,200,{ready:false,reviews:[],count:0,rating:null});return true}
   const where=`FROM course_reviews r JOIN course_paid_orders o ON o.id=r.order_id WHERE r.course_id=? AND r.state='published' AND o.payment_status='paid' AND o.request_id NOT IN ('${privateNomodRequestId}','${replacementNomodRequestId}') AND COALESCE(o.review_reason,'') NOT IN ('${privateNomodReason}','${replacementNomodReason}')`
   const total=await db.prepare('SELECT COUNT(*) AS count,AVG(r.rating) AS rating '+where).get(list[1]),rows=await db.prepare('SELECT r.* '+where+' ORDER BY r.created_at DESC LIMIT 20').all(list[1])
   json(res,200,{ready:true,count:Number(total.count),rating:Number(total.count)>0?Math.round(Number(total.rating)*10)/10:null,reviews:rows.map(view)});return true
  }
  const eligibility=/^\/api\/courses\/reviews\/eligibility\/(meta|ai)$/.exec(path)
  if(eligibility&&req.method==='GET'){
   if(!ready())fail(503,'Verified-buyer reviews are being prepared.')
   const row=await buyer(req,req.headers['x-course-order'],eligibility[1]),existing=await db.prepare('SELECT id FROM course_reviews WHERE recipient_hash=? AND course_id=?').get(hash(row.email.trim().toLowerCase()),eligibility[1])
   json(res,200,{eligible:true,alreadySubmitted:!!existing});return true
  }
  if(path==='/api/courses/reviews'&&req.method==='POST'){
   if(!ready())fail(503,'Verified-buyer reviews are being prepared.')
   const body=await readJson(req);fields(body,['courseId','orderId','author','rating','body','consent'])
   if(!known(body.courseId)||typeof body.author!=='string'||!body.author.trim()||body.author.trim().length>80||/[\u0000-\u001f\u007f@]/.test(body.author)||!Number.isInteger(body.rating)||body.rating<1||body.rating>5||typeof body.body!=='string'||body.body.trim().length<20||body.body.trim().length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.body)||body.consent!==true)fail(400,'Enter a name, a rating from 1 to 5, a review of 20–2,000 characters and publication consent.')
   const row=await buyer(req,body.orderId,body.courseId),recipient=hash(row.email.trim().toLowerCase()),ip=hash(req.socket.remoteAddress||'local'),id=randomUUID()
   try{await db.transaction(async()=>{
    await buyer(req,body.orderId,body.courseId)
    const limit=await db.prepare(db.lock('SELECT * FROM course_review_limits WHERE ip_hash=?')).get(ip)
    if(limit&&Number(limit.expires_at)>now()){if(Number(limit.count)>=10)fail(429,'Please try another day.');await db.prepare('UPDATE course_review_limits SET count=count+1 WHERE ip_hash=?').run(ip)}
    else if(limit)await db.prepare('UPDATE course_review_limits SET count=1,expires_at=? WHERE ip_hash=?').run(now()+86400000,ip)
    else await db.prepare('INSERT INTO course_review_limits VALUES (?,?,?)').run(ip,1,now()+86400000)
    await db.prepare('INSERT INTO course_reviews VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,row.id,body.courseId,recipient,body.author.trim(),body.rating,body.body.trim(),'pending',now(),null,null)
    await audit('course-buyer','course_review_submitted',id)
   })}catch(e){if(uniqueConflict(e))fail(409,'A review for this course has already been submitted.');throw e}
   json(res,201,{id,state:'pending'});return true
  }return false
 },async adminHandle(req,res,path,user,json){
  if(!path.startsWith('/api/courses/admin/reviews'))return false
  if(user?.role!=='admin')fail(403,'Agency access is required.')
  if(path==='/api/courses/admin/reviews'&&req.method==='GET'){
   const rows=schemaReady?await db.prepare('SELECT * FROM course_reviews ORDER BY created_at DESC LIMIT 100').all():[]
   json(res,200,{ready:ready(),schemaReady,enabled:enabled(),setup:setup(user),reviews:rows.map(r=>({...view(r),state:r.state,moderatedAt:r.moderated_at?Number(r.moderated_at):null}))});return true
  }
  if(path==='/api/courses/admin/reviews/schema'&&req.method==='POST'){
   const body=await readJson(req);fields(body,[])
   if(!setup(user).allowed)fail(403,'Enabling reviews requires the agency owner and verified application and payment storage.')
   if(!setupFlight)setupFlight=(async()=>{
    try{
     await audit(user.id,'course_review_activation_started','ascore-course-reviews')
     await initializeReviewSchema(db,{...env,ASCORE_ALLOW_REVIEW_SCHEMA_SETUP:'1'});await verifyReviewSchema(db);schemaReady=true
     if(db.kind==='sqlite')await db.exec('CREATE TABLE IF NOT EXISTS ascore_schema_versions (application VARCHAR(32) NOT NULL,version INTEGER NOT NULL,applied_at BIGINT NOT NULL,PRIMARY KEY(application,version))')
     await db.transaction(async()=>{
      const marker=await db.prepare(db.lock('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?')).get('ascore-course-reviews',2)
      if(!marker)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-reviews',2,now())
      await audit(user.id,'course_review_activation_completed','ascore-course-reviews')
     });activated=true
    }catch{await audit(user.id,'course_review_activation_needs_review','ascore-course-reviews');fail(503,'Review setup needs team review.')}finally{setupFlight=null}
   })()
   await setupFlight;json(res,200,{initialized:true,ready:ready()});return true
  }
  const moderate=/^\/api\/courses\/admin\/reviews\/([0-9a-f-]+)$/.exec(path)
  if(moderate&&req.method==='PATCH'){
   if(!schemaReady)fail(503,'Review storage is not ready.')
   const body=await readJson(req);fields(body,['state']);if(!['published','rejected'].includes(body.state))fail(400,'Choose publish or reject.')
   await db.transaction(async()=>{const row=await db.prepare(db.lock('SELECT * FROM course_reviews WHERE id=?')).get(moderate[1]);if(!row)fail(404,'Review not found.');if(body.state==='published'){const order=await db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(row.order_id);if(isPrivateNomodTest(order)||order?.payment_status!=='paid')fail(409,'The purchase is no longer eligible.')}await db.prepare('UPDATE course_reviews SET state=?,moderated_at=?,moderated_by=? WHERE id=?').run(body.state,now(),user.id,row.id);await audit(user.id,'course_review_'+body.state,row.id)})
   json(res,200,{updated:true});return true
  }return false
 }}
}
