import {isPrivateNomodTest} from './nomod-private-test.mjs'
const sources=[['paid','course_paid_orders'],['free','course_orders'],['private','course_private_nomod_tests']]
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const compare=(a,b)=>b.createdAt-a.createdAt||a.source.localeCompare(b.source)||a.id.localeCompare(b.id)
export async function courseOrderHistory(db,user,cursor){
 if(user?.role!=='admin')fail(403,'Agency access is required.')
 let after
 if(cursor){try{after=JSON.parse(Buffer.from(cursor,'base64url').toString());if(!Number.isSafeInteger(after.createdAt)||after.createdAt<0||!sources.some(([id])=>id===after.source)||!/^[-0-9a-f]{36}$/i.test(after.id))throw Error()}catch{fail(400,'Invalid order history cursor.')}}
 const tables=new Set((await db.prepare(db.kind==='sqlite'?"SELECT name FROM sqlite_master WHERE type='table'":'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(row=>row.name))
 const combined=[]
 for(const [source,table] of sources){
  if(!tables.has(table))continue
  let where='',args=[]
  if(after){const relation=source.localeCompare(after.source);where=relation===0?' WHERE (created_at<? OR (created_at=? AND id>?))':relation>0?' WHERE created_at<=?':' WHERE created_at<?';args=relation===0?[after.createdAt,after.createdAt,after.id]:[after.createdAt]}
  const currencyField=source==='free'?"'AED' AS currency":'currency'
  const privateFields=source==='free'?',NULL AS request_id,NULL AS review_reason':',request_id,review_reason'
  const rows=await db.prepare(`SELECT id,email,items,total_minor,${currencyField},payment_status,created_at,expires_at,delivery${privateFields} FROM ${table}${where} ORDER BY created_at DESC,id ASC LIMIT 51`).all(...args)
  for(const row of rows){
   const delivery=JSON.parse(row.delivery),privateTest=source==='private'||source==='paid'&&isPrivateNomodTest(row)
   combined.push({source,id:row.id,kind:privateTest?'private_test':source==='free'?'zero_payment_test':'purchase',customerName:delivery.customerName||'',email:row.email,items:JSON.parse(row.items),totalMinor:Number(row.total_minor),currency:row.currency,paymentStatus:row.payment_status,delivery:delivery.status,createdAt:Number(row.created_at),expiresAt:Number(row.expires_at),reason:row.review_reason||null,includedInSales:!privateTest&&source==='paid'&&row.payment_status==='paid'})
  }
 }
 combined.sort(compare)
 const orders=combined.slice(0,50),last=orders.at(-1)
 return {orders,nextCursor:combined.length>50?Buffer.from(JSON.stringify({createdAt:last.createdAt,source:last.source,id:last.id})).toString('base64url'):null}
}
