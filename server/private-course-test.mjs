import {createHash} from 'node:crypto'
import {courseCatalog,privateCoursePdf,smtpConfigured,sender} from './courses.mjs'
const hash=value=>createHash('sha256').update(value).digest('hex')
// Digest of the single recipient explicitly authorized for this delivery test.
// The actual address is supplied privately by the owner, never in public assets.
const approvedRecipient='df59863d1cac9ec7111ed81a4fd2594f40e1ddfb2a12331f0b8de9b3cc85722c'
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const owner=user=>user?.role==='admin'&&user.username==='aswinfrn'
export function createPrivateCourseTest({db,env,readJson,audit,pdfReader=privateCoursePdf,sendEmail,meta=courseCatalog.meta,recipientHash=approvedRecipient}){
 const configured=!!sendEmail||smtpConfigured(env),mail=sendEmail||(configured?sender(env):null)
 const target='meta-test:'+recipientHash+':'+meta.sha256
 const closed=()=>env.ASCORE_ENABLE_FREE_COURSES!=='1'&&env.ASCORE_ENABLE_PAID_COURSES!=='1'
 async function prior(){const row=await db.prepare("SELECT action FROM audit WHERE target_id=? AND action IN ('private_meta_test_claimed','private_meta_test_accepted','private_meta_test_uncertain') ORDER BY id DESC LIMIT 1").get(target);return row?.action.replace('private_meta_test_','')||'not_sent'}
 async function verifiedPdf(){const bytes=await pdfReader(env,'meta');if(!Buffer.isBuffer(bytes)||bytes.length!==meta.bytes||!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(bytes)!==meta.sha256)throw Error('The approved Meta PDF is not verified.');return bytes}
 async function status(user){
  if(!owner(user))return {ownerAllowed:false,ready:false}
  let pdfVerified=false;try{await verifiedPdf();pdfVerified=true}catch{}
  const state=await prior()
  return {ownerAllowed:true,ready:configured&&pdfVerified&&closed()&&state==='not_sent',senderConfigured:configured,pdfVerified,checkoutClosed:closed(),state}
 }
 return {status,async adminHandle(req,res,path,user,json){
  if(path!=='/api/courses/admin/private-meta-test')return false
  if(!owner(user))fail(403,'The private Meta PDF test is restricted to aswinfrn.')
  if(req.method==='GET'){json(res,200,await status(user));return true}
  if(req.method!=='POST')fail(405,'Method not allowed.')
  const body=await readJson(req)
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==1||typeof body.email!=='string'||body.email.length>254||/[\r\n\u0000-\u001f\u007f]/.test(body.email))fail(400,'Enter only the previously approved recipient email.')
  const email=body.email.trim().toLowerCase()
  if(hash(email)!==recipientHash)fail(403,'This test can send only to the previously approved recipient.')
  if(!closed())fail(403,'Keep paid and public zero-payment checkout disabled for this private test.')
  if(!configured)fail(503,'The independent orders mailbox is not configured.')
  let bytes;try{bytes=await verifiedPdf()}catch{fail(503,'Install and verify the approved Meta PDF before this test.')}
  // The existing owner row serializes the durable audit claim across processes.
  // No new schema, public FREE order, sale or conversion event is created.
  const claim=await db.transaction(async()=>{
   const row=await db.prepare(db.lock('SELECT id,username,role FROM users WHERE id=?')).get(user.id)
   if(!row||row.username!=='aswinfrn'||row.role!=='admin')fail(403,'The existing approved owner account is required.')
   const state=await prior();if(state!=='not_sent')return {claimed:false,state}
   await audit(user.id,'private_meta_test_claimed',target);return {claimed:true}
  })
  if(!claim.claimed){json(res,200,{state:claim.state,alreadyAttempted:true});return true}
  let state='uncertain'
  try{
   await mail({from:{name:'Ascore Creative',address:'orders@ascore.ae'},to:email,envelope:{from:'orders@ascore.ae',to:[email]},messageId:`<private-meta-test-${hash(target)}@ascore.ae>`,subject:'Ascore private Meta PDF delivery test',text:'This is the single private delivery test you requested. No payment was taken and public course checkout remains disabled.\n\nAttached: the approved 54-page Meta Ads PDF. Please confirm receipt and that the PDF opens correctly.\n\nAscore Creative',attachments:[{filename:meta.file,content:bytes,contentType:'application/pdf'}]})
   state='accepted'
  }catch{/* Unknown SMTP outcomes must not be retried or expose private errors. */}
  try{await audit(user.id,'private_meta_test_'+state,target)}catch{fail(503,'Test outcome needs review. Check the inbox and existing claim before any further action.')}
  json(res,200,{state,alreadyAttempted:false});return true
 }}
}
