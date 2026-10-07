import {isPrivateNomodTest,privateNomodRequestId,replacementNomodRequestId,smallNomodRequestId,privateNomodReason,replacementNomodReason,smallNomodReason} from './nomod-private-test.mjs'
export const orderSources=[['paid','course_paid_orders'],['free','course_orders'],['private','course_private_nomod_tests']]
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const compare=(a,b)=>b.createdAt-a.createdAt||a.source.localeCompare(b.source)||a.id.localeCompare(b.id)
const like=value=>'%'+value.replace(/[!%_]/g,c=>'!'+c)+'%'
export async function courseOrderHistory(db,user,cursor,options={}){
 if(user?.role!=='admin')fail(403,'Agency access is required.')
 let after
 if(cursor){try{after=JSON.parse(Buffer.from(cursor,'base64url').toString());if(!Number.isSafeInteger(after.createdAt)||after.createdAt<0||!orderSources.some(([id])=>id===after.source)||!/^[-0-9a-f]{36}$/i.test(after.id))throw Error()}catch{fail(400,'Invalid order history cursor.')}}
 const tables=new Set((await db.prepare(db.kind==='sqlite'?"SELECT name FROM sqlite_master WHERE type='table'":'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(row=>row.name))
 const combined=[],management=tables.has('course_order_metadata')&&tables.has('course_customers'),hasUsers=tables.has('users')
 for(const [source,table] of orderSources){
  if(!tables.has(table))continue
  const conditions=[],args=[]
  if(after){const relation=source.localeCompare(after.source);conditions.push(relation===0?'(t.created_at<? OR (t.created_at=? AND t.id>?))':relation>0?'t.created_at<=?':'t.created_at<?');args.push(...(relation===0?[after.createdAt,after.createdAt,after.id]:[after.createdAt]))}
  let joins='',name=db.kind==='sqlite'?"json_extract(t.delivery,'$.customerName')":"JSON_UNQUOTE(JSON_EXTRACT(t.delivery,'$.customerName'))"
  if(management){joins+=` LEFT JOIN course_order_metadata m ON m.order_source='${source}' AND m.order_id=t.id LEFT JOIN course_customers c ON c.email=LOWER(t.email)`;name=`COALESCE(NULLIF(c.name,''),${name})`}
  if(hasUsers){joins+=' LEFT JOIN users u ON u.email=LOWER(t.email)';name=`COALESCE(NULLIF(${name},''),u.name)`}
  const privateSql="(COALESCE(t.request_id,'') IN (?,?,?) OR COALESCE(t.review_reason,'') IN (?,?,?))",privateArgs=[privateNomodRequestId,replacementNomodRequestId,smallNomodRequestId,privateNomodReason,replacementNomodReason,smallNomodReason]
  if(options.filter==='paid')conditions.push("t.payment_status='paid'")
  if(options.filter==='unpaid'||options.customerOnly){if(source!=='paid')continue;conditions.push('NOT '+privateSql);args.push(...privateArgs);if(options.filter==='unpaid')conditions.push("t.payment_status<>'paid'")}
  if(options.filter==='tests'&&source==='paid'){conditions.push(privateSql);args.push(...privateArgs)}
  if(options.email){conditions.push('LOWER(t.email)=?');args.push(options.email)}
  if(options.search){conditions.push(`(t.id LIKE ? ESCAPE '!' OR t.email LIKE ? ESCAPE '!' OR ${name} LIKE ? ESCAPE '!'${management?" OR m.tags LIKE ? ESCAPE '!'":''})`);const q=like(options.search.replace(/^AS-/i,''));args.push(q,q,q,...(management?[q]:[]))}
  if(options.tag){if(!management)continue;conditions.push("m.tags LIKE ? ESCAPE '!'");args.push(like(JSON.stringify(options.tag)))}
  const currencyField=source==='free'?"'AED' AS currency":'t.currency',privateFields=source==='free'?',NULL AS request_id,NULL AS review_reason':',t.request_id,t.review_reason'
  const rows=await db.prepare(`SELECT t.id,t.email,t.items,t.total_minor,${currencyField},t.payment_status,t.created_at,t.expires_at,t.delivery${privateFields},${name} AS customer_name${management?',m.tags,m.revision':''} FROM ${table} t${joins}${conditions.length?' WHERE '+conditions.join(' AND '):''} ORDER BY t.created_at DESC,t.id ASC LIMIT 51`).all(...args)
  for(const row of rows){
   const delivery=JSON.parse(row.delivery),privateTest=source==='private'||source==='paid'&&isPrivateNomodTest(row)
   const kind=privateTest?'private_test':source==='free'?'zero_payment_test':'purchase'
   combined.push({source,id:row.id,kind,customerName:row.customer_name||'',email:row.email,items:JSON.parse(row.items),totalMinor:Number(row.total_minor),currency:row.currency,paymentStatus:row.payment_status,delivery:delivery.status,deliveryAt:Number(delivery.at)||null,createdAt:Number(row.created_at),expiresAt:Number(row.expires_at),reason:row.review_reason||null,includedInSales:!privateTest&&source==='paid'&&row.payment_status==='paid',tags:management?JSON.parse(row.tags||'[]'):[],revision:Number(row.revision)||0})
  }
 }
 combined.sort(compare)
 const orders=combined.slice(0,50),last=orders.at(-1)
 const next=combined.length>50?last:null
 return {orders,managementReady:management,nextCursor:next?Buffer.from(JSON.stringify({createdAt:next.createdAt,source:next.source,id:next.id})).toString('base64url'):null}
}
