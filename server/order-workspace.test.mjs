import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {createPortalServer} from './app.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {privateNomodRequestId} from './nomod-private-test.mjs'
import {courseOrderHistory} from './course-order-history.mjs'
import {initializeOrderWorkspaceSchema} from './order-workspace-schema.mjs'
const owner={id:randomUUID(),role:'admin',username:'aswinfrn',name:'Fixture owner'}
async function insert(db,{email='buyer@example.test',status='paid',customerName='',requestId=randomUUID(),at=Date.now()}={}){
 const id=randomUUID();await db.prepare('INSERT INTO course_paid_orders (id,request_id,payload_hash,email,items,total_minor,currency,secret,provider_id,provider_url,payment_status,created_at,expires_at,provider_checked_at,delivery,review_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,requestId,'a'.repeat(64),email,'["meta"]',200,'AED','b'.repeat(64),randomUUID(),'https://pay.nomodapp.com/en/l/private',status,at,at+86400000,at,JSON.stringify({status:status==='paid'?'accepted':'pending',at,customerName,providerReference:'hidden-provider',reference:'hidden-email'}),null);return id
}
test('order management uses admin session and CSRF, saves notes and tags, groups guest buyers, protects payment fields and detects stale edits',async t=>{
 const db=createSqliteStore();await initializePaymentSchema(db)
 const grant='isolated-order-workspace-grant',origin='https://ascore.test',env={ASCORE_ORIGIN:origin,ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(grant).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}})}
 const app=await createPortalServer({store:db,env});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 const call=async(path,body,session={},method=body?'POST':'GET')=>{const r=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const login=await call('/api/auth/admin-setup',{username:'aswinfrn',name:'Fixture owner',password:'Synthetic isolated password',setupToken:grant}),auth={cookie:login.cookie,csrf:login.data.csrf};assert.equal(login.status,201)
 const client=await call('/api/auth/register',{username:'fixturecustomer',name:'Saved Customer Name',email:'buyer@example.test',company:'',password:'Synthetic isolated password'}),clientAuth={cookie:client.cookie,csrf:client.data.csrf}
 const id=await insert(db),pending=await insert(db,{status:'pending'});await insert(db,{email:'',requestId:privateNomodRequestId});await db.prepare('INSERT INTO course_paid_downloads VALUES (?,?,?)').run(id,'meta',2)
 const path='/api/courses/admin/order-detail/paid/'+id
 for(const endpoint of ['/api/courses/admin/order-history','/api/courses/admin/customers',path]){assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,null,clientAuth)).status,403)}
 assert.equal((await call('/api/courses/admin/order-workspace/setup',{confirmation:'initialize-order-workspace-v1'},{cookie:auth.cookie})).status,403)
 assert.equal((await call('/api/courses/admin/order-workspace/setup',{confirmation:'initialize-order-workspace-v1'},auth)).status,200)
 const before=await db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(id)
 const note=await call(path+'/notes',{body:'Customer asked for help next Friday.'},auth);assert.equal(note.status,200);assert.equal(note.data.timeline.find(e=>e.kind==='note').actorName,'Fixture owner');assert.equal(note.data.order.customerName,'Saved Customer Name');assert.deepEqual(note.data.order.downloadUsage,[{courseId:'meta',uses:2}])
 const tagged=await call(path+'/tags',{tags:['VIP','follow-up','VIP'],revision:0},auth);assert.equal(tagged.status,200);assert.deepEqual(tagged.data.order.tags,['follow-up','vip']);assert.equal(tagged.data.order.revision,1)
 assert.equal((await call(path+'/tags',{tags:['stale'],revision:0},auth)).status,409)
 assert.equal((await call(path+'/notes',{body:'x',paymentStatus:'paid'},auth)).status,400)
 assert.equal((await call(path+'/notes',{body:'<script>bad</script>'},auth)).status,400)
 const found=await call('/api/courses/admin/order-history?tag=VIP',null,auth);assert.equal(found.data.orders.length,1);assert.equal(found.data.orders[0].id,id)
 const search=await call('/api/courses/admin/order-history?search=Saved%20Customer',null,auth);assert.equal(search.data.orders.length,2)
 const customers=await call('/api/courses/admin/customers',null,auth);assert.equal(customers.data.customers.length,1);const c=customers.data.customers[0];assert.equal(c.orders,2);assert.equal(c.paidOrders,1);assert.equal(c.totalSpentMinor,200)
 const updated=await call('/api/courses/admin/customers/'+c.id,{name:'Updated Customer',tags:['returning'],revision:0},auth,'PATCH');assert.equal(updated.status,200);assert.equal(updated.data.customer.name,'Updated Customer')
 assert.equal((await call('/api/courses/admin/customers/'+c.id,{name:'Stale Customer',tags:[],revision:0},auth,'PATCH')).status,409)
 const detail=await call(path,null,auth);assert.equal(detail.data.order.customerName,'Updated Customer');assert.ok((await call('/api/courses/admin/order-detail/paid/'+pending,null,auth)).data.timeline.concat(detail.data.timeline).some(e=>e.kind==='customer'));assert.equal((await call('/api/courses/admin/order-detail/paid/'+pending,null,auth)).data.order.paymentStatus,'pending')
 assert.deepEqual(await db.prepare('SELECT * FROM course_paid_orders WHERE id=?').get(id),before)
 for(const value of ['hidden-provider','hidden-email','b'.repeat(64),'provider_url'])assert.ok(!JSON.stringify(detail.data).includes(value))
})
test('filtered order search finds older tags and unpaid customers across full ledger and literal searches do not act as SQL wildcards',async t=>{
 const db=createSqliteStore();t.after(()=>db.close());await initializePaymentSchema(db);await initializeOrderWorkspaceSchema(db,owner)
 for(let i=0;i<70;i++)await insert(db,{email:'person'+i+'@example.test',at:1000+i,status:'paid'})
 const older=await insert(db,{email:'old@example.test',status:'pending',at:1});await db.prepare('INSERT INTO course_order_metadata VALUES (?,?,?,?)').run('paid',older,'["follow-up"]',1)
 assert.equal((await courseOrderHistory(db,owner,null,{filter:'unpaid'})).orders[0].id,older)
 assert.equal((await courseOrderHistory(db,owner,null,{tag:'follow-up'})).orders[0].id,older)
 assert.equal((await courseOrderHistory(db,owner,null,{search:'%'})).orders.length,0)
 assert.equal((await courseOrderHistory(db,owner,null,{search:'AS-'+older.slice(0,8)})).orders[0].id,older)
 await assert.rejects(initializeOrderWorkspaceSchema(db,{...owner,username:'other'}),e=>e.status===403)
})
