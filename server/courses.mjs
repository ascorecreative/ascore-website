import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto'
import {open,realpath,stat,mkdtemp,rename,rm,mkdir} from 'node:fs/promises'
import {constants} from 'node:fs'
import {resolve,sep,isAbsolute,dirname,relative} from 'node:path'
import {initializeCourseSchema,verifyCourseSchema} from './course-schema.mjs'
import {uniqueConflict} from './persistence.mjs'
import {verifyDatabaseIdentity} from './database-preflight.mjs'
import {verifyMariaDbSchema} from './mariadb-schema.mjs'

export const courseCatalog=Object.freeze({
 meta:{name:'Mastering Facebook Ads: Meta Ads — Beginner to Expert',priceMinor:4999,regularPriceMinor:8900,bytes:2710796,pages:54,file:'Mastering Facebook Ads - Meta Ads - Beginner to Expert.pdf',sha256:'213035507992b62cd373a920a583dab76df300ca68db75d64c65868e480925b5'},
 ai:{name:'Practical AI Course',priceMinor:4999,regularPriceMinor:8900,bytes:6854862,pages:42,file:'Ascore Practical AI Course.pdf',sha256:'e2a3116af5428c4893401d9fbb7b0293370563f89e2f329c2ce7485cc1a2f1e5'}
})
const hash=s=>createHash('sha256').update(s).digest('hex')
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const equals=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const token=(row,purpose)=>hash(`${row.secret}:${row.id}:${purpose}`)
function quote(body){
 if(!Array.isArray(body.items)||!body.items.length||body.items.length>2||body.items.some(id=>typeof id!=='string'||!Object.hasOwn(courseCatalog,id))||new Set(body.items).size!==body.items.length)fail(400,'Choose one or both courses.')
 if(typeof body.coupon!=='string'||body.coupon.trim().toUpperCase()!=='FREE')fail(400,'Enter the valid FREE coupon to use free checkout.')
 const items=[...body.items].sort(),subtotalMinor=items.reduce((sum,id)=>sum+courseCatalog[id].priceMinor,0)
 return {items,coupon:'FREE',currency:'AED',subtotalMinor,discountMinor:subtotalMinor,totalMinor:0}
}
function strictFields(body,fields){if(Object.keys(body).some(key=>!fields.includes(key)))fail(400,'Checkout values must be calculated by the server.')}
async function privateStorageRoot(env,{create=false}={}){
 const directory=env.ASCORE_COURSE_PDF_DIR;if(!directory||!isAbsolute(directory))throw Error('Private course storage is not configured.');
 const requested=resolve(directory),project=await realpath(process.cwd());let ancestor=requested;
 while(true){try{await stat(ancestor);break}catch(error){if(error.code!=='ENOENT'||dirname(ancestor)===ancestor)throw error;ancestor=dirname(ancestor)}}
 const resolved=resolve(await realpath(ancestor),relative(ancestor,requested));
 if(resolved===project||resolved.startsWith(project+sep))throw Error('Course storage must be outside the repository and public webroot.');
 if(create)await mkdir(resolved,{recursive:true,mode:0o700});
 const root=await realpath(resolved),info=await stat(root);
 if(root===project||root.startsWith(project+sep)||!info.isDirectory()||(info.mode&0o077)!==0||(process.getuid&&info.uid!==process.getuid()))throw Error('Private course directory requires owner-only permissions.');
 return root;
}
export async function privateCoursePdf(env,id){
 const p=courseCatalog[id];if(!p)throw Error('Unknown course.');const root=await privateStorageRoot(env);
 const file=resolve(root,p.file),handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW)
 try{
  const s=await handle.stat()
  if(!s.isFile()||(s.mode&0o077)!==0||(process.getuid&&s.uid!==process.getuid())||s.size<8||s.size>20*1024*1024)throw Error('Private course file is unavailable.')
  const bytes=await handle.readFile()
  if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(bytes)!==p.sha256)throw Error('Private course edition verification failed.')
  return bytes
 }finally{await handle.close()}
}
export function smtpConfigured(env){return env.COURSE_SMTP_HOST==='smtp.hostinger.com'&&Number(env.COURSE_SMTP_PORT)===465&&env.COURSE_SMTP_USER==='orders@ascore.ae'&&typeof env.COURSE_SMTP_PASSWORD==='string'&&!!env.COURSE_SMTP_PASSWORD}
export function courseEmail(row,origin){
 const items=JSON.parse(row.items),links=items.map(id=>({name:courseCatalog[id].name,url:`${origin}/api/courses/download/${row.id}/${id}?token=${token(row,'download:'+id)}`}))
 return {from:{name:'Ascore Creative',address:'orders@ascore.ae'},to:row.email,messageId:`<course-${row.id}@ascore.ae>`,subject:'Your Ascore course downloads',text:`Thank you for learning with Ascore.\n\nOrder: ${row.id}\nFREE coupon applied. Total paid: AED 0.\n\n${links.map(x=>`${x.name}\n${x.url}`).join('\n\n')}\n\nThese private links expire at ${new Date(Number(row.expires_at)).toISOString()} and allow up to 10 downloads per course.\nFor help, contact info@ascore.ae.`,envelope:{from:'orders@ascore.ae',to:[row.email]}}
}
export function sender(env){
 let mail
 return async message=>{
  if(!mail){const {default:nodemailer}=await import('nodemailer');mail=nodemailer.createTransport({host:env.COURSE_SMTP_HOST,port:465,secure:true,auth:{user:env.COURSE_SMTP_USER,pass:env.COURSE_SMTP_PASSWORD},tls:{minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true})}
  const result=await mail.sendMail(message)
  if(!result.accepted?.includes(message.to))throw Object.assign(Error('Recipient rejected'),{responseCode:550})
  return {reference:result.messageId}
 }
}
export async function createCourses({db,env={},readJson,origin,sendEmail,pdfReader=privateCoursePdf,now=Date.now,audit=async()=>{},workerInterval=60000,paidReady=()=>false,paymentReadiness=()=>null,pdfStorage=null,privateTestStatus=async()=>null}){
 const enabled=env.ASCORE_ENABLE_FREE_COURSES==='1',requirements={enabled,schemaReady:false,privatePdfsReady:false,senderConfigured:!!sendEmail||smtpConfigured(env)}
 try{if(enabled&&db.kind==='sqlite')await initializeCourseSchema(db);else await verifyCourseSchema(db);requirements.schemaReady=true}catch{}
 if(enabled){try{await Promise.all(Object.keys(courseCatalog).map(id=>pdfReader(env,id)));requirements.privatePdfsReady=true}catch{}}
 let uploading=false,schemaSetupFlight=null
 const approvedRuntime=()=>db.kind==='mariadb'&&db.readiness?.identityVerified===true&&db.readiness?.schemaVersion===1
 const schemaSetupState=user=>({allowed:!requirements.schemaReady&&user?.username==='aswinfrn'&&env.ASCORE_ALLOW_COURSE_SCHEMA_SETUP==='1'&&env.ASCORE_ENABLE_FREE_COURSES!=='1'&&approvedRuntime(),inProgress:!!schemaSetupFlight,reason:requirements.schemaReady?'already_initialized':user?.username!=='aswinfrn'?'owner_required':env.ASCORE_ALLOW_COURSE_SCHEMA_SETUP!=='1'?'operator_flag_required':env.ASCORE_ENABLE_FREE_COURSES==='1'?'delivery_must_be_disabled':!approvedRuntime()?'runtime_not_verified':'ready'})
 async function setupSchema(user){
  if(user?.username!=='aswinfrn')fail(403,'This setup action is restricted to the approved administrator.')
  if(env.ASCORE_ALLOW_COURSE_SCHEMA_SETUP!=='1')fail(403,'The operator must enable the temporary course schema setup flag.')
  if(env.ASCORE_ENABLE_FREE_COURSES==='1')fail(403,'Keep public zero-payment checkout disabled while initializing the course database.')
  if(!approvedRuntime())fail(503,'The approved production database is not verified. No setup was performed.')
  if(schemaSetupFlight)return schemaSetupFlight
  const task=(async()=>{
   try{await verifyDatabaseIdentity(db,env);await verifyMariaDbSchema(db)}catch{fail(503,'The approved application database could not be verified. No setup was performed.')}
   if(requirements.schemaReady){await verifyCourseSchema(db);return {schemaReady:true,initialized:false}}
   await audit(user.id,'course_schema_setup_started','ascore-courses')
   try{
    await initializeCourseSchema(db,env);await verifyCourseSchema(db);requirements.schemaReady=true
    await audit(user.id,'course_schema_setup_completed','ascore-courses')
    return {schemaReady:true,initialized:true}
   }catch{
    try{await verifyCourseSchema(db);requirements.schemaReady=true}catch{requirements.schemaReady=false}
    await audit(user.id,'course_schema_setup_needs_review','ascore-courses')
    fail(409,'Course setup needs review. DDL may have partially completed; refresh readiness before retrying.')
   }
  })();schemaSetupFlight=task;try{return await task}finally{if(schemaSetupFlight===task)schemaSetupFlight=null}
 }
 async function assetStatus(){const assets=await Promise.all(Object.entries(courseCatalog).map(async([id,p])=>{let installed=false;try{await pdfReader(env,id);installed=true}catch{}return {id,name:p.name,installed}}));requirements.privatePdfsReady=assets.every(a=>a.installed);return assets}
 const ready=()=>Object.values(requirements).every(Boolean)
 async function paymentStatus(user){
  const status=await paymentReadiness(user);if(!status)return null
  const fields=['enabled','schemaReady','contractVerified','apiKeyConfigured','webhookSecretConfigured','checkoutHostsConfigured','liveRequestsApproved','deliveryEnabled','termsApproved','senderConfigured','privatePdfsReady','originReady']
  return {setup:status.setup,diagnostic:status.diagnostic,privateNomodTest:status.privateNomodTest,ready:status.ready===true,webhooksEnabled:status.webhooksEnabled===true,requirements:Object.fromEntries(fields.map(field=>[field,status.requirements?.[field]===true]))}
 }

 const mail=sendEmail||(requirements.senderConfigured?sender(env):null),flights=new Map()
 const rowFor=id=>db.prepare('SELECT * FROM course_orders WHERE id=?').get(id)
 const receipt=row=>({retryScheduled:(()=>{const d=JSON.parse(row.delivery);return d.status==='failed'&&d.retryable&&d.attempts<5&&Number(row.expires_at)>now()})(),id:row.id,currency:'AED',subtotalMinor:Number(row.subtotal_minor),discountMinor:Number(row.discount_minor),totalMinor:Number(row.total_minor),paymentStatus:row.payment_status,delivery:JSON.parse(row.delivery).status,expiresAt:Number(row.expires_at)})
 async function limit(key,max,window){
  const time=now(),row=await db.prepare(db.lock('SELECT count,expires FROM course_limits WHERE `key`=?')).get(key)
  if(row&&Number(row.expires)>time){if(Number(row.count)>=max)fail(429,'Too many requests. Please try again later.');await db.prepare('UPDATE course_limits SET count=count+1 WHERE `key`=?').run(key)}
  else if(row)await db.prepare('UPDATE course_limits SET count=1,expires=? WHERE `key`=?').run(time+window,key)
  else await db.prepare('INSERT INTO course_limits VALUES (?,?,?)').run(key,1,time+window)
 }
 async function deliver(id){
  if(!ready())return
  if(flights.has(id))return flights.get(id)
  if(flights.size>=2)return
  const flight=(async()=>{
   const claim=await db.transaction(async()=>{
    const row=await db.prepare(db.lock('SELECT * FROM course_orders WHERE id=?')).get(id);if(!row)return null
    const d=JSON.parse(row.delivery)
    if(d.status==='sending'&&now()-d.lastAttempt>120000){d.status='uncertain';d.retryable=false;await db.prepare('UPDATE course_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id);return null}
    if(!['pending','failed'].includes(d.status)||d.status==='failed'&&!d.retryable||d.attempts>=5||Number(row.expires_at)<=now()||d.nextAttempt>now())return null
    d.status='sending';d.attempts++;d.lastAttempt=now();d.claim=randomUUID();await db.prepare('UPDATE course_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id)
    return {row,claim:d.claim}
   })
   if(!claim)return
   let result,error
   try{result=await mail(courseEmail(claim.row,origin))}catch(e){error=e}
   await db.transaction(async()=>{
    const row=await db.prepare(db.lock('SELECT * FROM course_orders WHERE id=?')).get(id),d=JSON.parse(row.delivery)
    if(d.claim!==claim.claim||d.status!=='sending')return
    if(!error){d.status='accepted';d.retryable=false;d.reference=typeof result?.reference==='string'?result.reference.slice(0,200):null}
    else{
     const code=Number(error.responseCode),preSend=['EAUTH','EENVELOPE','EDNS','ECONNECTION'].includes(error.code)
     d.status=preSend||code>=400?'failed':'uncertain';d.retryable=preSend||code>=400&&code<500;d.nextAttempt=now()+Math.min(3600000,60000*2**(d.attempts-1));d.reason=d.status==='uncertain'?'Delivery outcome needs review':'Mail provider rejected the attempt'
    }
    delete d.claim;await db.prepare('UPDATE course_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id)
   })
  })();flights.set(id,flight)
  try{return await flight}finally{flights.delete(id)}
 }
 function enqueue(id){queueMicrotask(()=>{deliver(id).catch(()=>{})})}
 async function tick(){if(!ready())return;const state=db.kind==='sqlite'?"json_extract(delivery,'$.status')":"JSON_UNQUOTE(JSON_EXTRACT(delivery,'$.status'))",retry=db.kind==='sqlite'?"json_extract(delivery,'$.retryable')=1":"JSON_UNQUOTE(JSON_EXTRACT(delivery,'$.retryable'))='true'";const rows=await db.prepare(`SELECT id FROM course_orders WHERE expires_at>? AND (${state} IN ('pending','sending') OR (${state}='failed' AND ${retry})) ORDER BY created_at ASC LIMIT 100`).all(now());for(const r of rows)await deliver(r.id)}
 const interval=enabled&&requirements.schemaReady?setInterval(()=>{tick().catch(()=>{})},workerInterval):null;interval?.unref();if(ready())queueMicrotask(()=>{tick().catch(()=>{})})
 return {
  requirements,deliver,tick,
  async close(){if(interval)clearInterval(interval);await Promise.allSettled([...flights.values(),...(schemaSetupFlight?[schemaSetupFlight]:[])])},
  async publicHandle(req,res,path,json){
   if(path==='/api/courses/config'&&req.method==='GET'){json(res,200,{freeCheckoutReady:ready(),paidCheckoutEnabled:paidReady()});return true}
   if(path==='/api/courses/quote'&&req.method==='POST'){const body=await readJson(req);strictFields(body,['items','coupon']);json(res,200,{...quote(body),freeCheckoutReady:ready()});return true}
   if(path==='/api/courses/orders'&&req.method==='POST'){
    if(!ready())fail(503,'Free course delivery is being prepared. Please try again later.')
    const body=await readJson(req);strictFields(body,['requestId','email','items','coupon']);const q=quote(body)
    if(!uuid(body.requestId))fail(400,'Refresh checkout and try again.')
    if(typeof body.email!=='string'||body.email.length>254||/[\u0000-\u001f\u007f]/.test(body.email)||! /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(body.email.trim()))fail(400,'Enter a valid email address.')
    const email=body.email.trim().toLowerCase(),id=body.requestId.toLowerCase(),fingerprint=hash(JSON.stringify({...q,email}))
    const save=()=>db.transaction(async()=>{
     await limit('ip:'+hash(req.socket.remoteAddress||'local'),100,3600000)
     const existing=await db.prepare(db.lock('SELECT * FROM course_orders WHERE id=?')).get(id)
     if(existing){if(existing.payload_hash!==fingerprint)fail(409,'This checkout reference belongs to a different order.');return}
     await limit('email:'+hash(email),3,3600000);await limit('global',100,86400000)
     const time=now(),delivery={status:'pending',attempts:0,retryable:true,nextAttempt:0}
     await db.prepare('INSERT INTO course_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,fingerprint,email,JSON.stringify(q.items),q.subtotalMinor,q.discountMinor,0,'FREE','free',randomBytes(32).toString('hex'),time+86400000,time,JSON.stringify(delivery))
     for(const item of q.items)await db.prepare('INSERT INTO course_downloads VALUES (?,?,?)').run(id,item,0)
    })
    try{await save()}catch(error){if(!uniqueConflict(error)&&!['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code))throw error;const row=await rowFor(id);if(!row||row.payload_hash!==fingerprint)fail(409,'Checkout is busy or changed. Retry the same request.')}
    const row=await rowFor(id);enqueue(id);json(res,202,{...receipt(row),receiptToken:token(row,'receipt')});return true
   }
   if(/^\/api\/courses\/orders\/[0-9a-f-]+$/i.test(path)&&req.method==='GET'){
    if(!requirements.schemaReady)fail(503,'Course delivery is being prepared.')
    const row=await rowFor(path.split('/').at(-1));if(!row||!equals(req.headers['x-course-receipt'],token(row,'receipt')))fail(404,'Order not found.')
    if(Number(row.expires_at)<=now())fail(410,'This order link has expired. Contact info@ascore.ae for help.')
    json(res,200,receipt(row));return true
   }
   if(path.startsWith('/api/courses/download/')&&['GET','HEAD'].includes(req.method)){
    if(!requirements.schemaReady)fail(503,'Course delivery is being prepared.')
    const match=/^\/api\/courses\/download\/([0-9a-f-]+)\/(meta|ai)$/i.exec(path);if(!match)fail(404,'Download not found.')
    const [,id,item]=match,row=await rowFor(id),provided=new URL(req.url,'http://local.invalid').searchParams.get('token')
    if(!row||row.payment_status!=='free'||Number(row.total_minor)!==0||!JSON.parse(row.items).includes(item)||!equals(provided,token(row,'download:'+item)))fail(404,'Download not found.')
    if(Number(row.expires_at)<=now())fail(410,'This download has expired. Contact info@ascore.ae for help.')
    let bytes;try{bytes=await pdfReader(env,item)}catch{fail(503,'Your course file is temporarily unavailable. Please try again later.')}
    await db.transaction(()=>limit('download:'+hash(req.socket.remoteAddress||'local'),100,3600000))
    if(req.method==='GET')await db.transaction(async()=>{const r=await db.prepare(db.lock('SELECT uses FROM course_downloads WHERE order_id=? AND course_id=?')).get(id,item);if(!r||Number(r.uses)>=10)fail(410,'This download limit has been reached. Contact info@ascore.ae for help.');await db.prepare('UPDATE course_downloads SET uses=uses+1 WHERE order_id=? AND course_id=?').run(id,item)})
    res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Ascore-${item}-course.pdf"`,'Content-Length':bytes.length,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:bytes);return true
   }
   return false
  },
  async adminHandle(req,res,path,user,json){
   const upload=/^\/api\/courses\/admin\/assets\/(meta|ai)$/.exec(path)
   if(path!=='/api/courses/admin/orders'&&path!=='/api/courses/admin/setup'&&!/^\/api\/courses\/admin\/orders\/[0-9a-f-]+\/retry$/i.test(path)&&!upload)return false
   if(user?.role!=='admin')fail(403,'Agency access is required.')
   if(path==='/api/courses/admin/setup'){
    if(req.method!=='POST')fail(405,'Method not allowed.')
    const body=await readJson(req);if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length)fail(400,'Setup accepts no SQL, database, path or configuration values.')
    json(res,200,await setupSchema(user));return true
   }
   if(upload){
    if(req.method!=='PUT')fail(405,'Method not allowed.')
    if(uploading)fail(429,'Another course upload is in progress. Please try again shortly.')
    if((req.headers['content-type']||'').split(';')[0]!=='application/pdf')fail(415,'Upload the approved PDF file.')
    const length=req.headers['content-length'];if(length&&(!/^\d+$/.test(length)||Number(length)>8*1024*1024))fail(413,'PDF uploads must be no larger than 8 MB.')
    uploading=true;let temporary
    try{
     if(pdfStorage?.mode==='mariadb'){
      if(user.username!=='aswinfrn')fail(403,'Private database PDF installation requires the approved owner.')
      const chunks=[];let size=0
      for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)fail(413,'PDF uploads must be no larger than 8 MB.');chunks.push(chunk)}
      const result=await pdfStorage.install(upload[1],Buffer.concat(chunks),user);await assetStatus();json(res,200,result);return true
     }
     let root;try{root=await privateStorageRoot(env,{create:true})}catch{fail(503,'Private course storage is not ready. Configure an owner-only directory outside the public site.')}
     const chunks=[];let size=0
     for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)fail(413,'PDF uploads must be no larger than 8 MB.');chunks.push(chunk)}
     const bytes=Buffer.concat(chunks),product=courseCatalog[upload[1]]
     if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(bytes)!==product.sha256)fail(400,'Choose the approved PDF edition for this course.')
     temporary=await mkdtemp(resolve(root,'.course-upload-'));const path=resolve(temporary,'verified.pdf'),handle=await open(path,'wx',0o600)
     try{await handle.writeFile(bytes);await handle.sync()}finally{await handle.close()}
     await rename(path,resolve(root,product.file));await audit(user.id,'install_private_course_pdf',upload[1]);await assetStatus();json(res,200,{id:upload[1],installed:true});return true
    }finally{uploading=false;if(temporary)await rm(temporary,{recursive:true,force:true})}
   }
   const assets=await assetStatus(),storageConfigured=pdfStorage?.mode==='mariadb'?pdfStorage.ready():!!env.ASCORE_COURSE_PDF_DIR
   if(!requirements.schemaReady){if(req.method!=='GET')fail(503,'Course database setup is not ready.');json(res,200,{ready:false,requirements,storageConfigured,pdfStorage:pdfStorage?.status(user),privateTest:await privateTestStatus(user),assets,payments:await paymentStatus(user),schemaSetup:schemaSetupState(user),orders:[],summary:null});return true}
   if(path==='/api/courses/admin/orders'&&req.method==='GET'){
    const encoded=new URL(req.url,'http://local.invalid').searchParams.get('cursor');let cursor={time:now()+1,id:'ffffffff-ffff-4fff-8fff-ffffffffffff'}
    if(encoded){try{if(!/^[A-Za-z0-9_-]{1,200}$/.test(encoded))throw Error();cursor=JSON.parse(Buffer.from(encoded,'base64url'));if(!Number.isSafeInteger(cursor.time)||cursor.time<0||!uuid(cursor.id))throw Error()}catch{fail(400,'Choose a valid page.')}}
    const rows=await db.prepare('SELECT * FROM course_orders WHERE created_at<? OR (created_at=? AND id<?) ORDER BY created_at DESC,id DESC LIMIT 51').all(cursor.time,cursor.time,cursor.id)
    const statusSql=db.kind==='sqlite'?"json_extract(delivery,'$.status')":"JSON_UNQUOTE(JSON_EXTRACT(delivery,'$.status'))"
    const totals=await db.prepare(`SELECT COUNT(*) AS totalOrders,COALESCE(SUM(CASE WHEN payment_status='free' THEN 1 ELSE 0 END),0) AS freeOrders,COALESCE(SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END),0) AS paidOrders,COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_minor ELSE 0 END),0) AS paidRevenueMinor,COALESCE(SUM(CASE WHEN ${statusSql}='accepted' THEN 1 ELSE 0 END),0) AS emailsAccepted FROM course_orders`).get()
    const since=now()-7*86400000,recent=await db.prepare('SELECT created_at,payment_status,total_minor,items FROM course_orders WHERE created_at>=? ORDER BY created_at').all(since),daily={}
    for(const r of recent){const day=new Date(Number(r.created_at)).toISOString().slice(0,10),v=daily[day]||(daily[day]={date:day,freeOrders:0,paidOrders:0,paidRevenueMinor:0});if(r.payment_status==='free')v.freeOrders++;if(r.payment_status==='paid'){v.paidOrders++;v.paidRevenueMinor+=Number(r.total_minor)}}
    const orders=rows.slice(0,50).map(row=>{const d=JSON.parse(row.delivery);return {...receipt(row),email:row.email,items:JSON.parse(row.items),coupon:row.coupon,createdAt:Number(row.created_at),attempts:d.attempts,lastAttempt:d.lastAttempt||null,canRetry:d.status==='failed'&&d.retryable&&d.attempts<5&&Number(row.expires_at)>now()&&(!d.nextAttempt||d.nextAttempt<=now()),reason:d.reason||null}})
    json(res,200,{ready:ready(),requirements,storageConfigured,pdfStorage:pdfStorage?.status(user),privateTest:await privateTestStatus(user),assets,payments:await paymentStatus(user),schemaSetup:schemaSetupState(user),summary:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Number(v)])),daily:Object.values(daily),orders,nextCursor:rows.length>50?Buffer.from(JSON.stringify({time:Number(rows[49].created_at),id:rows[49].id})).toString('base64url'):null});return true
   }
   if(req.method==='POST'){
    if(!ready())fail(503,'Course delivery is not ready.')
    const id=path.split('/')[5],row=await rowFor(id);if(!row)fail(404,'Order not found.')
    await db.transaction(async()=>{const current=await db.prepare(db.lock('SELECT * FROM course_orders WHERE id=?')).get(id),d=JSON.parse(current.delivery);if(d.status!=='failed'||!d.retryable||d.attempts>=5||Number(current.expires_at)<=now())fail(409,'Only a confirmed, retryable rejection can be retried.');if(d.nextAttempt>now())fail(429,'Wait for the retry cooldown.');d.status='pending';await db.prepare('UPDATE course_orders SET delivery=? WHERE id=?').run(JSON.stringify(d),id);await audit(user.id,'retry_course_email',id)})
    enqueue(id);json(res,202,{id,status:'queued'});return true
   }
   fail(405,'Method not allowed.')
  }
 }
}
