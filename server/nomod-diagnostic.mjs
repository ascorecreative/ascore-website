import {createHash} from 'node:crypto'

const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
function minor(value){
 const text=typeof value==='number'&&Number.isFinite(value)?String(value):value
 if(typeof text!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(text))return null
 const [whole,fraction='']=text.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'))
 return Number.isSafeInteger(n)&&n>0&&n<=100000000? n:null
}

// This diagnostic only GETs one existing Hosted Checkout. It cannot create,
// charge, refund, send email, mutate financial rows or approve the contract gate.
export function createNomodDiagnostic({db,env,readJson,fetcher=fetch,now=Date.now,isSchemaReady,expectedCheckout=async()=>null}){
 let flight=null,last=null,attempts=[]
 const closed=()=>env.ASCORE_ENABLE_PAID_COURSES!=='1'&&env.ASCORE_ENABLE_FREE_COURSES!=='1'
 const state=user=>({ownerAllowed:user?.role==='admin'&&user.username==='aswinfrn',allowed:user?.role==='admin'&&user.username==='aswinfrn'&&closed()&&isSchemaReady()&&typeof env.NOMOD_HOSTED_CHECKOUT_API_KEY==='string'&&!!env.NOMOD_HOSTED_CHECKOUT_API_KEY,inProgress:!!flight})
 async function inspect(user,body){
  if(user?.role!=='admin'||user.username!=='aswinfrn')fail(403,'Nomod verification is restricted to the approved aswinfrn administrator.')
  if(!closed())fail(403,'Keep paid and public zero-payment checkout disabled for this read-only verification.')
  if(!isSchemaReady()||typeof env.NOMOD_HOSTED_CHECKOUT_API_KEY!=='string'||!env.NOMOD_HOSTED_CHECKOUT_API_KEY)fail(503,'Verify payment tables and configure the Hosted Checkout API key first.')
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!uuid(body.checkoutId))fail(400,'Enter an existing Hosted Checkout Session ID (UUID). No URL, key or other configuration is accepted.')
  const id=body.checkoutId.toLowerCase(),fingerprint=createHash('sha256').update(id).digest('hex'),time=now()
  if(last?.fingerprint===fingerprint&&time-last.at<30000)return last.result
  if(flight){if(flight.fingerprint===fingerprint)return flight.task;fail(409,'A Nomod lookup is already running. Wait for its result.')}
  attempts=attempts.filter(at=>time-at<3600000)
  if(attempts.length>=5)fail(429,'Five read-only Nomod checks have run in the past hour. Review the existing results before retrying.')
  attempts.push(time)
  const task=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
   let details
   try{
    const response=await fetcher('https://api.nomod.com/v1/checkout/'+id,{method:'GET',headers:{'X-API-KEY':env.NOMOD_HOSTED_CHECKOUT_API_KEY,'Content-Type':'application/json'},signal:controller.signal,redirect:'error'})
    if([401,403].includes(response.status))fail(502,'Nomod rejected the saved Hosted Checkout API key. Check that it belongs to the Hosted Checkout integration.')
    if(response.status===404)fail(404,'No Hosted Checkout session was found for this ID and saved key. A payment-link or charge ID is a different identifier.')
    if(!response.ok)fail(502,'Nomod could not confirm this existing checkout. No checkout was created.')
    const parts=[];let size=0
    if(response.body){for await(const chunk of response.body){size+=chunk.byteLength;if(size>131072){controller.abort();fail(502,'Nomod returned an oversized checkout response.')}parts.push(Buffer.from(chunk))}}
    details=JSON.parse(Buffer.concat(parts).toString('utf8'))
   }catch(error){if(error.status)throw error;fail(502,'Nomod lookup failed or timed out. No checkout, charge or email was created.')}finally{clearTimeout(timer)}
   const amount=minor(details?.amount),charges=Array.isArray(details?.charges)&&details.charges.length<=20?details.charges:[]
   const chargeIdsValid=charges.length>0&&charges.every(c=>uuid(c?.id))&&new Set(charges.map(c=>c.id.toLowerCase())).size===charges.length
   const captured=charges.filter(c=>c?.status==='paid'),capturedAmountsValid=captured.length>0&&captured.every(c=>minor(c.amount)!==null)
   const capturedMinor=capturedAmountsValid?captured.reduce((sum,c)=>sum+minor(c.amount),0):null
   let host=null,nomodOwnedHost=false
   try{const url=new URL(details?.url);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(url.hostname)){host=url.hostname;nomodOwnedHost=host==='nomod.com'||host.endsWith('.nomod.com')}}catch{}
   let signedCompletedEventMatched=false
   if(chargeIdsValid&&captured.length){
    const ids=captured.map(c=>c.id.toLowerCase())
    const row=await db.prepare(`SELECT COUNT(*) AS n FROM course_payment_events WHERE event_type=? AND charge_id IN (${ids.map(()=>'?').join(',')})`).get('charge.completed',...ids)
    signedCompletedEventMatched=Number(row?.n)>0
   }
   const configured=(env.NOMOD_CHECKOUT_HOSTS||'').split(',').map(h=>h.trim()).filter(Boolean)
   const idMatches=typeof details?.id==='string'&&details.id.toLowerCase()===id
   const expected=await expectedCheckout(id),approvedTestMatches=expected?details?.reference_id===expected.id&&amount===Number(expected.total_minor)&&details?.currency===expected.currency:null
   const result={checkedAt:now(),apiAuthenticated:idMatches,checkoutIdMatches:idMatches,checkoutPaid:details?.status==='paid',currencyIsAED:details?.currency==='AED',amountMinor:amount,referencePresent:typeof details?.reference_id==='string'&&details.reference_id.length>0&&details.reference_id.length<=512,chargeCount:charges.length,chargeIdsValid,capturedChargeCount:captured.length,capturedAmountMatches:amount!==null&&capturedAmountsValid&&capturedMinor===amount,checkoutHost:host,nomodOwnedHost,configuredHostMatches:nomodOwnedHost&&configured.includes(host),signedCompletedEventMatched,contractApproved:false}
   result.approvedTestMatches=approvedTestMatches
   result.paidShapeVerified=result.checkoutIdMatches&&result.checkoutPaid&&result.currencyIsAED&&result.referencePresent&&result.chargeIdsValid&&result.capturedAmountMatches&&result.nomodOwnedHost&&approvedTestMatches!==false
   last={fingerprint,at:now(),result};return result
  })()
  flight={fingerprint,task};try{return await task}finally{if(flight?.task===task)flight=null}
 }
 return {state,inspect,async handle(req,res,path,user,json){
  if(path!=='/api/courses/admin/payments/verify-existing-checkout')return false
  if(req.method!=='POST')fail(405,'Method not allowed.')
  if(user?.role!=='admin'||user.username!=='aswinfrn')fail(403,'Nomod verification is restricted to the approved aswinfrn administrator.')
  json(res,200,await inspect(user,await readJson(req)));return true
 }}
}
