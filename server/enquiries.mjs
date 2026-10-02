import { createHash,randomUUID } from 'node:crypto'
import { uniqueConflict } from './persistence.mjs'
import { createCrmTokenProvider, deliveryCredentials, CRM_ORG_ID, CRM_ORIGIN } from './credentials.mjs'

const services=new Set(['digital-experiences','brand-creative','3d-immersive','growth-automation','uae-business-services','other'])
const hash=value=>createHash('sha256').update(value).digest('hex')
const failure=(status,message)=>{const error=Error(message);error.status=status;throw error}
function field(value,label,max,required=true){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))failure(400,`Enter a valid ${label}.`);return value.trim()}
function validate(body){
 if(typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))failure(400,'Refresh the form and try again.')
 if(body.website!==undefined&&body.website!=='')failure(400,'The enquiry could not be submitted.')
 if(body.consent!==true)failure(400,'Please agree to share your enquiry details.')
 const data={name:field(body.name,'name',100),email:field(body.email,'email',254).toLowerCase(),company:field(body.company,'company',160),phone:field(body.phone??'','phone',40,false),service:body.service,message:field(body.message,'message',4000),consent:true}
 if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(data.email))failure(400,'Enter a valid email address.')
 if(/[\r\n]/.test(data.name+data.company+data.phone)||!services.has(data.service)||data.message.length<10)failure(400,'Check your enquiry fields and try again.')
 return data
}
function configuredAdapters(env,fetcher){
 if(env.ASCORE_ENABLE_ENQUIRY_DELIVERY!=='1')return {}
 let token,mail,verified=false
 const {crm,smtp}=deliveryCredentials(env)
 if(crm)token=createCrmTokenProvider({credentials:crm,fetcher})
 return {
  ...(smtp?{email:async(data,id)=>{
   if(!mail){const {default:nodemailer}=await import('nodemailer');mail=nodemailer.createTransport({host:smtp.host,port:465,secure:true,auth:{user:smtp.user,pass:smtp.password},tls:{minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true})}
   try{
    const result=await mail.sendMail({from:{name:'Ascore website',address:'info@ascore.ae'},to:'info@ascore.ae',replyTo:data.email,messageId:`<enquiry-${id}@ascore.ae>`,subject:'Website project enquiry',text:`Reference: ${id}\nName: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company}\nPhone: ${data.phone||'Not provided'}\nService: ${data.service}\n\n${data.message}`,envelope:{from:'info@ascore.ae',to:['info@ascore.ae']}})
    if(!result.accepted?.includes('info@ascore.ae'))throw Object.assign(Error('Mail provider rejected recipient.'),{retryable:true})
    return {reference:result.messageId,proof:'smtp-accepted'}
   }catch(error){if(['EAUTH','EENVELOPE','EDNS','ECONNECTION'].includes(error.code)||Number(error.responseCode)>=400)error.retryable=true;throw error}
  }}:{}),
  ...(token?{crm:async(data,id)=>{
   let access;try{access=await token()}catch{throw Object.assign(Error('CRM access could not be refreshed.'),{retryable:true})}
   const headers={Authorization:`Zoho-oauthtoken ${access}`,'Content-Type':'application/json'}
   if(!verified){let response;try{response=await fetcher(`${CRM_ORIGIN}/crm/v8/org`,{headers,signal:AbortSignal.timeout(10000),redirect:'error'});const result=await response.json();if(!response.ok||result.org?.[0]?.id!==CRM_ORG_ID)throw Error()}catch{throw Object.assign(Error('CRM organization verification failed.'),{retryable:true})}verified=true}
   const response=await fetcher(`${CRM_ORIGIN}/crm/v8/Leads`,{method:'POST',headers,body:JSON.stringify({data:[{Last_Name:data.name,Company:data.company,Email:data.email,...(data.phone?{Phone:data.phone}:{}),Lead_Status:'Not Contacted',Description:`Website enquiry ${id}\nService: ${data.service}\n\n${data.message}`}],trigger:[]}),signal:AbortSignal.timeout(10000),redirect:'error'})
   const result=await response.json(),record=result.data?.[0]
   if(!response.ok||record?.status!=='success'||!record.details?.id)throw Object.assign(Error('CRM did not confirm the enquiry.'),{retryable:response.status>=400&&response.status<500||record?.status==='error'})
   return {reference:String(record.details.id),proof:'crm-created'}
  }}:{})
 }
}

export async function createEnquiries({db,env={},readJson,fetcher=fetch,adapters,now=Date.now}){
 if(db.kind==='sqlite')await db.exec(`CREATE TABLE IF NOT EXISTS enquiries (id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, data TEXT NOT NULL, delivery TEXT NOT NULL, created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS enquiry_limits (\`key\` TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`)
 let configured
 if(!adapters&&env.NODE_ENV==='production')deliveryCredentials(env)
 const getAdapters=()=>adapters??(configured??=configuredAdapters(env,fetcher))
 const flights=new Map(),leaseMs=120000
 const rowFor=id=>db.prepare('SELECT * FROM enquiries WHERE id=?').get(id)
 const result=row=>{const delivery=JSON.parse(row.delivery),states=Object.values(delivery).map(d=>d.status);return{id:row.id,status:states.every(s=>s==='accepted')?'delivered':states.includes('uncertain')?'uncertain':'pending',delivery:{email:delivery.email.status,crm:delivery.crm.status}}}
 async function limit(key,max,window,insideTransaction=false){
  const update=async()=>{
   const time=now();await db.prepare('DELETE FROM enquiry_limits WHERE expires<?').run(time)
   const row=await db.prepare(db.lock('SELECT count,expires FROM enquiry_limits WHERE `key`=?')).get(key)
   if(row&&row.count>=max)failure(429,'Too many enquiries. Please try later or email info@ascore.ae.')
   if(row)await db.prepare('UPDATE enquiry_limits SET count=count+1 WHERE `key`=?').run(key)
   else await db.prepare('INSERT INTO enquiry_limits VALUES (?,?,?)').run(key,1,time+window)
  }
  return insideTransaction?update():db.transaction(update)
 }
 async function claim(id,channel){
  return db.transaction(async()=>{
   const row=await db.prepare(db.lock('SELECT * FROM enquiries WHERE id=?')).get(id),delivery=JSON.parse(row.delivery),item=delivery[channel]
   if(item.status==='sending'&&now()-(item.lastAttempt||0)>leaseMs){item.status='uncertain';await db.prepare('UPDATE enquiries SET delivery=? WHERE id=?').run(JSON.stringify(delivery),id)}
   if(['accepted','uncertain','sending'].includes(item.status)||item.attempts>=10||item.lastAttempt&&now()-item.lastAttempt<30000)return null
   item.status='sending';item.attempts++;item.lastAttempt=now();item.claimToken=randomUUID()
   await db.prepare('UPDATE enquiries SET delivery=? WHERE id=?').run(JSON.stringify(delivery),id)
   return {data:JSON.parse(row.data),claimToken:item.claimToken}
  })
 }
 async function settle(id,channel,claimToken,receipt,error){
  await db.transaction(async()=>{
   const row=await db.prepare(db.lock('SELECT * FROM enquiries WHERE id=?')).get(id),delivery=JSON.parse(row.delivery),item=delivery[channel]
   if(item.claimToken!==claimToken||!['sending','uncertain'].includes(item.status))return
   if(receipt){item.status='accepted';item.reference=receipt.reference;item.proof=receipt.proof;item.completedAt=now()}
   else item.status=error?.retryable?'pending':'uncertain'
   await db.prepare('UPDATE enquiries SET delivery=? WHERE id=?').run(JSON.stringify(delivery),id)
  })
 }
 async function deliver(id){
  if(flights.has(id))return flights.get(id)
  const flight=(async()=>{
   let enabled
   try{enabled=getAdapters()}catch{return result(await rowFor(id))}
   for(const channel of ['email','crm']){
    if(!enabled[channel])continue
    const acquired=await claim(id,channel)
    if(!acquired)continue
    let receipt,error
    try{receipt=await enabled[channel](acquired.data,id)}catch(caught){error=caught}
    // Store the outcome separately. A storage failure keeps the durable claim uncertain on expiry.
    await settle(id,channel,acquired.claimToken,receipt,error)
   }
   return result(await rowFor(id))
  })()
  flights.set(id,flight)
  try{return await flight}finally{flights.delete(id)}
 }
 return {
  async publicHandle(request,response,path,json){
   if(path!=='/api/enquiries'||request.method!=='POST')return false
   await limit(`ip:${hash(request.socket.remoteAddress||'local')}`,20,3600000)
   const body=await readJson(request),data=validate(body),fingerprint=hash(JSON.stringify(data)),id=body.requestId.toLowerCase()
   const save=()=>db.transaction(async()=>{
    const existing=await db.prepare(db.lock('SELECT * FROM enquiries WHERE id=?')).get(id)
    if(existing){if(existing.payload_hash!==fingerprint)failure(409,'This enquiry reference already belongs to another submission. Refresh and try again.');return}
    await limit(`email:${hash(data.email)}`,3,3600000,true);await limit('global',1000,86400000,true)
    const time=now(),delivery={email:{status:'pending',attempts:0},crm:{status:'pending',attempts:0}}
    await db.prepare('INSERT INTO enquiries VALUES (?,?,?,?,?)').run(id,fingerprint,JSON.stringify(data),JSON.stringify(delivery),time)
    await db.prepare('INSERT INTO leads VALUES (?,?)').run(id,JSON.stringify({name:data.name,email:data.email,company:data.company,phone:data.phone,notes:`Website enquiry ${id}\nService: ${data.service}\n\n${data.message}`,status:'new',source:'website-enquiry',createdAt:new Date(time).toISOString()}))
   })
   try{await save()}catch(error){
    // Only reread a conflicting id after a rolled-back DB race; never repeat external sends.
    if(!uniqueConflict(error)&&!['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code))throw error
    const existing=await rowFor(id)
    if(!existing||existing.payload_hash!==fingerprint)failure(409,'Submission changed or was busy. Please retry the same enquiry.')
   }
   const delivered=await deliver(id);json(response,delivered.status==='delivered'?201:202,delivered);return true
  },
  async adminHandle(request,response,path,json){
   if(path==='/api/enquiries'&&request.method==='GET'){const rows=await db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 100').all();json(response,200,{enquiries:rows.map(row=>({...result(row),data:JSON.parse(row.data),createdAt:row.created_at}))});return true}
   if(/^\/api\/enquiries\/[0-9a-f-]+\/retry$/i.test(path)&&request.method==='POST'){const id=path.split('/')[3];if(!await rowFor(id))failure(404,'Enquiry not found.');json(response,200,await deliver(id));return true}
   return false
  }
 }
}
