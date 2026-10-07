import {createHash,randomUUID} from 'node:crypto'
import {courseOrderHistory,orderSources} from './course-order-history.mjs'
import {isPrivateNomodTest} from './nomod-private-test.mjs'
import {initializeOrderWorkspaceSchema,verifyOrderWorkspaceSchema} from './order-workspace-schema.mjs'
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const hash=email=>createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)
const text=(value,max,label,required=true)=>{if(typeof value!=='string'||value.trim().length>max||required&&!value.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(value))fail(400,'Enter a valid '+label+'.');return value.trim()}
const tags=value=>{if(!Array.isArray(value)||value.length>20)fail(400,'Use up to 20 tags.');return [...new Set(value.map(t=>text(t,40,'tag').toLowerCase()))].sort()}
const revision=value=>{if(!Number.isSafeInteger(value)||value<0)fail(400,'Refresh this record before saving.');return value}
const checkBody=(body,keys)=>{if(Object.keys(body).some(k=>!keys.includes(k)))fail(400,'Unsupported record change.')}
export async function createOrderWorkspace({db,readJson,now=Date.now}){
 let ready=false,setupFlight=null
 try{await verifyOrderWorkspaceSchema(db);ready=true}catch{}
 async function raw(source,id,lock=false){
  const table=orderSources.find(([s])=>s===source)?.[1];if(!table||!uuid(id))fail(404,'Order not found.')
  const sql=`SELECT * FROM ${table} WHERE id=?`,row=await db.prepare(lock?db.lock(sql):sql).get(id);if(!row)fail(404,'Order not found.');return row
 }
 async function history(user,query){
  const allowed=['cursor','search','tag','filter','email'];if([...query.keys()].some(k=>!allowed.includes(k)||query.getAll(k).length>1))fail(400,'Invalid order search.')
  const search=text(query.get('search')||'',160,'search',false),tag=query.has('tag')?tags([query.get('tag')])[0]:undefined,filter=query.get('filter')||'all'
  if(!['all','paid','unpaid','tests'].includes(filter))fail(400,'Invalid order filter.')
  const result=await courseOrderHistory(db,user,query.get('cursor'),{search,tag,filter,email:query.get('email')||undefined});return {...result,managementReady:ready}
 }
 async function detail(user,source,id){
  const row=await raw(source,id),page=await courseOrderHistory(db,user,null,{search:id}),order=page.orders.find(o=>o.source===source&&o.id===id);if(!order)fail(404,'Order not found.')
  const entries=ready?await db.prepare('SELECT id,kind,data,actor_name,created_at FROM course_order_entries WHERE order_source=? AND order_id=? ORDER BY created_at DESC,id DESC LIMIT 201').all(source,id):[]
  const system=[{id:'created',kind:'system',body:order.kind==='purchase'?'Customer checkout created.':'Test order recorded.',at:order.createdAt,actorName:'Ascore'}]
  if(order.paymentStatus==='paid')system.push({id:'paid',kind:'system',body:'Payment independently confirmed as captured.',at:Number(row.expires_at)-86400000,actorName:'Ascore'})
  if(order.delivery==='accepted')system.push({id:'email',kind:'system',body:'Course email sent and accepted by the mail server. Inbox delivery is not confirmed.',at:order.deliveryAt||order.createdAt,actorName:'Ascore'})
  else if(order.delivery==='uncertain'||order.delivery==='failed')system.push({id:'email',kind:'system',body:'Email delivery needs review: '+order.delivery+'.',at:order.deliveryAt||order.createdAt,actorName:'Ascore'})
  let downloads=[]
  if(source==='paid'&&order.paymentStatus==='paid'&&!isPrivateNomodTest(row))downloads=await db.prepare('SELECT course_id,uses FROM course_paid_downloads WHERE order_id=?').all(id)
  return {order:{...order,customerId:order.kind==='purchase'&&order.email?hash(order.email):null,downloadUsage:downloads.map(d=>({courseId:d.course_id,uses:Number(d.uses)}))},managementReady:ready,timeline:[...system,...entries.slice(0,200).map(e=>({...JSON.parse(e.data),id:e.id,kind:e.kind,at:Number(e.created_at),actorName:e.actor_name}))].sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id)),timelineTruncated:entries.length>200}
 }
 async function customers(user){
  // Derive guest customers from the complete ledger. A guest does not need a portal login.
  const list=new Map();let cursor=null
  do{const page=await courseOrderHistory(db,user,cursor,{customerOnly:true});cursor=page.nextCursor;for(const o of page.orders){const email=o.email.toLowerCase();if(!email)continue;let c=list.get(email);if(!c){c={id:hash(email),email,name:o.customerName,tags:[],revision:0,orders:0,paidOrders:0,totalSpentMinor:0,firstOrderAt:o.createdAt,lastOrderAt:o.createdAt};list.set(email,c)}c.orders++;if(o.includedInSales){c.paidOrders++;c.totalSpentMinor+=o.totalMinor}c.firstOrderAt=Math.min(c.firstOrderAt,o.createdAt);c.lastOrderAt=Math.max(c.lastOrderAt,o.createdAt);if(!c.name&&o.customerName)c.name=o.customerName}}
  while(cursor)
  if(ready)for(const c of await db.prepare('SELECT id,email,name,tags,revision FROM course_customers').all()){const item=list.get(c.email);if(item)Object.assign(item,{name:c.name||item.name,tags:JSON.parse(c.tags),revision:Number(c.revision)})}
  return {customers:[...list.values()].sort((a,b)=>b.lastOrderAt-a.lastOrderAt),managementReady:ready}
 }
 async function customer(user,id){const result=await customers(user),c=result.customers.find(c=>c.id===id);if(!c)fail(404,'Customer not found.');return c}
 async function append(user,source,id,kind,data){await db.prepare('INSERT INTO course_order_entries (id,order_source,order_id,kind,data,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),source,id,kind,JSON.stringify(data),user.id,user.name,now())}
 return {async handle(req,res,path,user,json){
  if(!path.startsWith('/api/courses/admin/order-')&&!path.startsWith('/api/courses/admin/customers'))return false
  if(user?.role!=='admin')fail(403,'Agency access is required.')
  const query=new URL(req.url,'http://local').searchParams
  if(req.method==='GET'&&path==='/api/courses/admin/order-history'){json(res,200,await history(user,query));return true}
  if(req.method==='POST'&&path==='/api/courses/admin/order-workspace/setup'){
   const body=await readJson(req);checkBody(body,['confirmation']);if(body.confirmation!=='initialize-order-workspace-v1')fail(400,'Confirm order workspace initialization.')
   if(!setupFlight)setupFlight=initializeOrderWorkspaceSchema(db,user).then(()=>{ready=true}).finally(()=>{setupFlight=null});await setupFlight;json(res,200,{ready});return true
  }
  if(req.method==='GET'&&path==='/api/courses/admin/customers'){json(res,200,await customers(user));return true}
  let match=/^\/api\/courses\/admin\/order-detail\/(paid|free|private)\/([a-f0-9-]{36})(?:\/(notes|tags))?$/.exec(path)
  if(match){
   const [,source,id,action]=match
   if(req.method==='GET'&&!action){json(res,200,await detail(user,source,id));return true}
   if(req.method==='POST'&&['notes','tags'].includes(action)){
    if(!ready)fail(409,'Initialize order management before saving notes or tags.')
    const body=await readJson(req);checkBody(body,action==='notes'?['body']:['tags','revision'])
    const value=action==='notes'?text(body.body,4000,'timeline entry'):tags(body.tags),expected=action==='tags'?revision(body.revision):null
    await db.transaction(async()=>{
     await raw(source,id,true)
     if(action==='tags'){
      const previous=await db.prepare('SELECT tags,revision FROM course_order_metadata WHERE order_source=? AND order_id=?').get(source,id)
      if((Number(previous?.revision)||0)!==expected)fail(409,'Tags changed in another session. Refresh before saving.')
      if(previous)await db.prepare('UPDATE course_order_metadata SET tags=?,revision=? WHERE order_source=? AND order_id=?').run(JSON.stringify(value),expected+1,source,id)
      else await db.prepare('INSERT INTO course_order_metadata (order_source,order_id,tags,revision) VALUES (?,?,?,?)').run(source,id,JSON.stringify(value),1)
     }
     await append(user,source,id,action==='notes'?'note':'tags',action==='notes'?{body:value}:{body:'Order tags updated.',tags:value})
    });json(res,200,await detail(user,source,id));return true
   }
  }
  match=/^\/api\/courses\/admin\/customers\/([a-f0-9]{64})$/.exec(path)
  if(match){
   if(req.method==='GET'){json(res,200,{customer:await customer(user,match[1]),managementReady:ready});return true}
   if(req.method==='PATCH'){
    if(!ready)fail(409,'Initialize order management before editing customers.')
    const c=await customer(user,match[1]),body=await readJson(req);checkBody(body,['name','tags','revision']);const name=text(body.name,100,'customer name'),nextTags=tags(body.tags),expected=revision(body.revision)
    await db.transaction(async()=>{
     // Serialise the first profile write as well as later edits on a permanent user/order row.
     const first=await courseOrderHistory(db,user,null,{email:c.email,customerOnly:true});await raw(first.orders[0].source,first.orders[0].id,true)
     const previous=await db.prepare('SELECT revision FROM course_customers WHERE id=?').get(c.id)
     if((Number(previous?.revision)||0)!==expected)fail(409,'Customer changed in another session. Refresh before saving.')
     if(previous)await db.prepare('UPDATE course_customers SET name=?,tags=?,revision=?,updated_at=? WHERE id=?').run(name,JSON.stringify(nextTags),expected+1,now(),c.id)
     else await db.prepare('INSERT INTO course_customers (id,email,name,tags,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(c.id,c.email,name,JSON.stringify(nextTags),1,now(),now())
     await append(user,first.orders[0].source,first.orders[0].id,'customer',{body:'Customer profile updated.',name,tags:nextTags})
    });json(res,200,{customer:await customer(user,c.id),managementReady:ready});return true
   }
  }
  fail(405,'Method not allowed.')
 }}
}
