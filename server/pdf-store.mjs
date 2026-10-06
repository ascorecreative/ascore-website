import {createHash} from 'node:crypto'
import {initializePdfSchema,verifyPdfSchema} from './pdf-schema.mjs'
import {verifyDatabaseIdentity} from './database-preflight.mjs'
import {verifyMariaDbSchema} from './mariadb-schema.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const chunkSize=524288
export async function createPdfStore({db,env,catalog,readJson,audit=async()=>{}}){
 const mode=env.ASCORE_COURSE_STORAGE==='mariadb'?'mariadb':'filesystem'
 let schemaReady=false,packetReady=false,setupFlight=null,installBusy=false
 const reads=new Map()
 async function verifyPacket(){
  if(db.kind!=='mariadb'){packetReady=true;return}
  const row=await db.prepare('SELECT @@max_allowed_packet AS packetBytes').get()
  packetReady=Number.isSafeInteger(Number(row?.packetBytes))&&Number(row.packetBytes)>=2*1024*1024
  if(!packetReady)throw Error('Private PDF storage requires verified database packet headroom.')
 }
 if(mode==='mariadb'){try{await verifyPdfSchema(db);schemaReady=true;await verifyPacket()}catch{}}
 const ready=()=>mode==='mariadb'&&schemaReady&&packetReady
 const runtime=()=>db.kind==='mariadb'&&db.readiness?.identityVerified===true&&db.readiness?.schemaVersion===1
 const setupState=user=>({allowed:mode==='mariadb'&&!schemaReady&&user?.role==='admin'&&user.username==='aswinfrn'&&env.ASCORE_ALLOW_PDF_SCHEMA_SETUP==='1'&&env.ASCORE_ENABLE_PAID_COURSES!=='1'&&env.ASCORE_ENABLE_FREE_COURSES!=='1'&&runtime(),inProgress:!!setupFlight,reason:mode!=='mariadb'?'select_database_storage':schemaReady?'already_initialized':user?.username!=='aswinfrn'?'owner_required':env.ASCORE_ALLOW_PDF_SCHEMA_SETUP!=='1'?'operator_flag_required':!runtime()?'runtime_not_verified':'checkout_must_be_disabled_or_ready'})
 const status=user=>({mode,schemaReady,packetReady,ready:ready(),canInstall:ready()&&user?.role==='admin'&&user.username==='aswinfrn',setup:setupState(user)})
 async function readNow(id){
  if(!ready()||!Object.hasOwn(catalog,id))throw Error('Private course database storage is unavailable.')
  // Snapshot all chunks with metadata, so no partial concurrent install can be read.
  return db.transaction(async()=>{
   const p=catalog[id],row=await db.prepare(db.lock('SELECT * FROM course_pdf_editions WHERE course_id=?')).get(id)
   if(!row||row.sha256!==p.sha256||Number(row.byte_count)!==p.bytes||Number(row.chunk_count)!==Math.ceil(p.bytes/chunkSize))throw Error('Approved private PDF edition is not installed.')
   const count=await db.prepare('SELECT COUNT(*) AS count FROM course_pdf_chunks WHERE course_id=?').get(id)
   if(Number(count.count)!==Number(row.chunk_count))throw Error('Private PDF chunk count verification failed.')
   const chunks=[]
   for(let i=0;i<Number(row.chunk_count);i++){
    const chunk=await db.prepare('SELECT sha256,content FROM course_pdf_chunks WHERE course_id=? AND chunk_index=?').get(id,i)
    if(!chunk||!(chunk.content instanceof Uint8Array))throw Error('Private PDF chunk is unavailable.')
    const b=Buffer.from(chunk.content),expected=Math.min(chunkSize,p.bytes-i*chunkSize)
    if(b.length!==expected||hash(b)!==chunk.sha256)throw Error('Private PDF chunk verification failed.')
    chunks.push(b)
   }
   const bytes=Buffer.concat(chunks)
   if(bytes.length!==p.bytes||!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(bytes)!==p.sha256)throw Error('Private PDF edition verification failed.')
   return bytes
  })
 }
 async function read(id){if(reads.has(id))return reads.get(id);const task=readNow(id);reads.set(id,task);try{return await task}finally{if(reads.get(id)===task)reads.delete(id)}}
 async function install(id,bytes,user){
  if(!ready())fail(503,'Initialize private database storage and verify packet capacity first.')
  if(user?.role!=='admin'||user.username!=='aswinfrn')fail(403,'Private database PDF installation requires the approved owner.')
  const p=catalog[id];if(!p||!Buffer.isBuffer(bytes)||bytes.length!==p.bytes||bytes.length>8*1024*1024||!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(bytes)!==p.sha256)fail(400,'Choose the approved PDF edition for this course.')
  if(installBusy)fail(429,'Another private PDF installation is in progress.')
  installBusy=true
  try{return await db.transaction(async()=>{
   const existing=await db.prepare(db.lock('SELECT * FROM course_pdf_editions WHERE course_id=?')).get(id)
   // Rewrite the bounded approved chunks transactionally even on retry. This
   // repairs corrupted storage and never accepts a different edition.
   if(existing){await db.prepare('DELETE FROM course_pdf_chunks WHERE course_id=?').run(id);await db.prepare('UPDATE course_pdf_editions SET sha256=?,byte_count=?,chunk_count=?,installed_at=?,installed_by=? WHERE course_id=?').run(p.sha256,p.bytes,Math.ceil(p.bytes/chunkSize),Date.now(),user.id,id)}
   else await db.prepare('INSERT INTO course_pdf_editions VALUES (?,?,?,?,?,?)').run(id,p.sha256,p.bytes,Math.ceil(p.bytes/chunkSize),Date.now(),user.id)
   for(let i=0;i<Math.ceil(p.bytes/chunkSize);i++){const b=bytes.subarray(i*chunkSize,(i+1)*chunkSize);await db.prepare('INSERT INTO course_pdf_chunks VALUES (?,?,?,?)').run(id,i,hash(b),b)}
   await audit(user.id,'install_private_database_pdf',id)
   return {id,installed:true}
  })}finally{installBusy=false}
 }
 async function adminHandle(req,res,path,user,json){
  if(path!=='/api/courses/admin/pdf-storage/setup')return false
  if(req.method!=='POST')fail(405,'Method not allowed.')
  const body=await readJson(req);if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length)fail(400,'Private storage setup accepts an empty object only.')
  if(mode!=='mariadb'||user?.role!=='admin'||user.username!=='aswinfrn'||env.ASCORE_ALLOW_PDF_SCHEMA_SETUP!=='1'||env.ASCORE_ENABLE_PAID_COURSES==='1'||env.ASCORE_ENABLE_FREE_COURSES==='1')fail(403,'Private storage setup requires aswinfrn, database storage mode, temporary approval, verified database and disabled checkout.')
  if(!runtime())fail(503,'The approved production database is not verified. No storage setup was performed.')
  if(!setupFlight)setupFlight=(async()=>{
   try{await verifyDatabaseIdentity(db,env);await verifyMariaDbSchema(db);await verifyPacket()}catch{fail(503,'Database identity, ownership or packet capacity could not be verified. No storage setup was performed.')}
   if(schemaReady){await verifyPdfSchema(db);return {schemaReady:true,packetReady,initialized:false}}
   await audit(user.id,'pdf_schema_setup_started','ascore-course-pdfs')
   try{await initializePdfSchema(db,env);await verifyPdfSchema(db);schemaReady=true;await audit(user.id,'pdf_schema_setup_completed','ascore-course-pdfs');return {schemaReady:true,packetReady,initialized:true}}
   catch{await audit(user.id,'pdf_schema_setup_needs_review','ascore-course-pdfs');fail(409,'Private PDF storage setup needs review; DDL may have partially completed.')}
  })()
  try{json(res,200,await setupFlight)}finally{setupFlight=null}return true
 }
 return {mode,ready,status,read,install,adminHandle}
}
