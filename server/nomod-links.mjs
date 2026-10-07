import {courseCatalog} from './courses.mjs'

const base='https://api.nomod.com/v1'
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const reject=()=>{throw Object.assign(Error('Payment provider confirmation requires review.'),{status:502})}
export function nomodMinor(value){
 const s=typeof value==='number'?String(value):value
 if(typeof s!=='string'||!/^\d+(?:\.\d{1,3})?$/.test(s))return null
 const [whole,fraction='']=s.split('.')
 if(fraction.length===3&&fraction[2]!=='0')return null
 const result=Number(whole)*100+Number(fraction.slice(0,2).padEnd(2,'0'))
 return Number.isSafeInteger(result)?result:null
}
const noteFor=row=>`Ascore order ${row.id}`
const modeData=row=>JSON.parse(row.delivery)
const successFor=(origin,row)=>`${origin}/courses/checkout/?payment=success&order=${row.id}`
function returnMatches(value,origin,row){
 try{const u=new URL(value),expected=new URL(successFor(origin,row));return u.origin===expected.origin&&u.pathname===expected.pathname&&!u.username&&!u.password&&u.searchParams.getAll('order').length===1&&u.searchParams.get('order')===row.id&&u.searchParams.getAll('payment').length===1&&u.searchParams.get('payment')==='success'}catch{return false}
}

// General Nomod API Links, not Hosted Checkout. Keep all payment assertions on
// the server. A paid-looking redirect or a link's enabled state is not capture.
export function createNomodLinks({env,origin,fetcher=fetch}){
 const hosts=(env.NOMOD_CHECKOUT_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean)
 async function request(method,path,body){
  if(!env.NOMOD_API_KEY)reject()
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
  try{
   const response=await fetcher(base+path,{method,headers:{'X-API-KEY':env.NOMOD_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,redirect:'error'})
   if(!response.ok)reject()
   const text=await response.text();if(Buffer.byteLength(text)>131072)reject()
   const result=JSON.parse(text);if(!result||typeof result!=='object'||Array.isArray(result))reject()
   return result
  }catch{reject()}finally{clearTimeout(timer)}
 }
 function verifyLink(link,row,{creating=false}={}){
  if(!uuid(link.id)||!creating&&link.id!==row.provider_id||link.currency!=='AED'||nomodMinor(link.amount)!==Number(row.total_minor)||link.note!==noteFor(row)||typeof link.reference_id!=='string'||!link.reference_id||link.reference_id.length>100||!creating&&link.reference_id!==modeData(row).providerReference)reject()
  if(!['enabled','disabled'].includes(link.status)||link.payment_block_reason!=null||link.allow_tip!==false||link.allow_service_fee!==false||link.shipping_address_required!==false||link.payment_expiry_limit!==1||['discount','tax','tip','service_fee'].some(k=>nomodMinor(link[k])!==0))reject()
  try{const url=new URL(link.url);if(url.protocol!=='https:'||url.username||url.password||!hosts.includes(url.hostname))reject()}catch{reject()}
  if(!creating&&link.url!==row.provider_url)reject()
  const expected=JSON.parse(row.items).map(id=>[courseCatalog[id].name,1,Number(row.total_minor)/JSON.parse(row.items).length]).sort()
  if(!Array.isArray(link.items)||JSON.stringify(link.items.map(i=>[i.name,i.quantity,nomodMinor(i.amount)]).sort())!==JSON.stringify(expected))reject()
  return link
 }
 async function create(row){
  const body={currency:'AED',items:JSON.parse(row.items).map(id=>({name:courseCatalog[id].name,amount:(Number(row.total_minor)/JSON.parse(row.items).length/100).toFixed(2),quantity:1})),title:'Ascore course order',note:noteFor(row),discount_percentage:0,shipping_address_required:false,allow_tip:false,allow_tabby:false,allow_tamara:false,allow_service_fee:false,payment_expiry_limit:1,success_url:successFor(origin,row),failure_url:`${origin}/courses/checkout/?payment=failure&order=${row.id}`}
  const link=verifyLink(await request('POST','/links',body),row,{creating:true})
  return {id:link.id,url:link.url,status:'enabled',amount:nomodMinor(link.amount)/100,currency:link.currency,reference_id:row.id,providerReference:link.reference_id,charges:[]}
 }
 async function read(row){
  const link=verifyLink(await request('GET','/links/'+row.provider_id),row)
  const seen=new Set(),paid=[];let requiresReview=false
  for(let page=1;page<=5;page++){
   const list=await request('GET',`/charges?link_id=${row.provider_id}&type=link&page_size=20&page=${page}`)
   if(!Array.isArray(list.results)||list.results.length>20||!Number.isInteger(list.count)||list.count<0||list.count>100)reject()
   for(const candidate of list.results){
    if(!uuid(candidate.id)||seen.has(candidate.id))reject();seen.add(candidate.id)
    if(!['paid','refunded','partially_refunded','disputed'].includes(candidate.status))continue
    // Read each capture independently, rather than trusting a callback body.
    const charge=await request('GET','/charges/'+candidate.id)
    if(charge.id!==candidate.id||!['paid','refunded','partially_refunded','disputed'].includes(charge.status)||charge.currency!=='AED'||nomodMinor(charge.total)!==Number(row.total_minor)||nomodMinor(charge.refund_total)===null||nomodMinor(charge.refund_total)>Number(row.total_minor)||charge.note!==noteFor(row)||!returnMatches(charge.success_url,origin,row)||['discount','tax','tip','service_fee'].some(k=>nomodMinor(charge[k])!==0))reject()
    if(charge.status!=='paid'||nomodMinor(charge.refund_total)>0)requiresReview=true
    paid.push({id:charge.id,status:charge.status,amount:nomodMinor(charge.total)/100})
   }
   if(!list.next){if(seen.size!==list.count)reject();break}
   if(!list.results.length)reject()
   if(page===5)reject()
  }
  if(paid.length>1)reject()
  return {id:link.id,url:link.url,reference_id:row.id,currency:link.currency,amount:nomodMinor(link.amount)/100,status:requiresReview?'review':paid.length?'paid':link.status==='disabled'?'expired':'enabled',charges:paid}
 }
 return {create,read}
}
