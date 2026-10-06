import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
import {initializeReviewSchema,courseReviewToken} from './course-reviews.mjs'
import {createPortalServer} from './app.mjs'
async function harness(t,{enabled=true,schema=true}={}){
 const db=createSqliteStore();await initializePaymentSchema(db);if(schema)await initializeReviewSchema(db)
 const setupToken='isolated-review-test-grant',env={ASCORE_ORIGIN:'http://127.0.0.1:5173',ASCORE_ENABLE_COURSE_REVIEWS:enabled?'1':'0',ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(setupToken).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}})}
 let outgoing=0;const app=await createPortalServer({store:db,env,nomodFetch:async()=>{outgoing++;throw Error('No provider call')},courseSender:async()=>{outgoing++;throw Error('No mail')},coursePdfReader:async()=>{throw Error('No private files')},enquiryAdapters:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 const request=async(path,{body,headers={},session={},method}={})=>{const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Origin:env.ASCORE_ORIGIN,...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'x-csrf-token':session.csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const admin=async()=>{const r=await request('/api/auth/admin-setup',{body:{username:'aswinfrn',name:'Review test owner',password:'synthetic review test password',setupToken}});assert.equal(r.status,201);return {...r.data,cookie:r.cookie}}
 const buyer=async({items=['meta'],status='paid',email='buyer@example.test'}={})=>{const row={id:randomUUID(),secret:'e'.repeat(64)};await db.prepare('INSERT INTO course_paid_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(row.id,randomUUID(),'a'.repeat(64),email,JSON.stringify(items),items.length*4999,'AED',row.secret,null,null,status,Date.now()-86400000,Date.now()-1000,0,'{"status":"accepted"}',null);return {id:row.id,token:courseReviewToken(row)}}
 const submit=(b,extra={})=>request('/api/courses/reviews',{body:{orderId:b.id,courseId:'meta',author:'Genuine fixture buyer',rating:4,body:'This synthetic test describes a real validated submission flow only.',consent:true,...extra},headers:{'x-course-review':b.token}})
 return {db,request,admin,buyer,submit,outgoing:()=>outgoing}
}
test('reviews default closed without approved owned storage or the independent review flag',async t=>{
 for(const options of [{enabled:false},{schema:false}]){const h=await harness(t,options),b=await h.buyer();assert.deepEqual((await h.request('/api/courses/reviews/meta')).data,{ready:false,reviews:[],count:0,rating:null});assert.equal((await h.submit(b)).status,503);assert.equal(h.outgoing(),0)}
 const ddl=[];const db={kind:'mariadb',readiness:{identityVerified:true,schemaVersion:1},exec:async sql=>ddl.push(sql)};await assert.rejects(initializeReviewSchema(db,{}),/explicit/);assert.deepEqual(ddl,[])
})
test('only paid buyers of that course with a distinct private review capability can submit',async t=>{
 const h=await harness(t),paid=await h.buyer();assert.equal((await h.request('/api/courses/reviews/eligibility/meta',{headers:{'x-course-order':paid.id,'x-course-review':paid.token}})).data.eligible,true)
 assert.equal((await h.submit({...paid,token:'a'.repeat(64)})).status,403)
 for(const status of ['pending','authorised','review','cancelled'])assert.equal((await h.submit(await h.buyer({status,email:status+'@example.test'}))).status,403)
 assert.equal((await h.submit(await h.buyer({items:['ai'],email:'ai@example.test'}))).status,403)
 assert.equal((await h.submit(paid,{rating:6})).status,400);assert.equal((await h.submit(paid,{body:'Too short'})).status,400);assert.equal((await h.submit(paid,{consent:false})).status,400);assert.equal((await h.submit(paid,{email:'injected@example.test'})).status,400)
 const foreign=await h.request('/api/courses/reviews',{body:{},headers:{Origin:'https://foreign.example'}});assert.equal(foreign.status,403);assert.equal(h.outgoing(),0)
})
test('persistent submissions are moderated, private fields stay private and refunded feedback leaves the aggregate',async t=>{
 const h=await harness(t),b=await h.buyer(),r=await h.submit(b,{author:'<b>Plain text author</b>',body:'<img src=x onerror=alert(1)> Text must be displayed without interpreting HTML.'});assert.equal(r.status,201);assert.equal(r.data.state,'pending')
 assert.equal((await h.request('/api/courses/reviews/meta')).data.count,0)
 assert.equal((await h.submit(b)).status,409);const again=await h.buyer();assert.equal((await h.submit(again)).status,409)
 const admin=await h.admin();assert.equal((await h.request('/api/courses/admin/reviews')).status,401)
 const client=await h.request('/api/auth/register',{body:{username:'review_client',email:'client@example.test',name:'Review client',password:'synthetic review test password'}});assert.equal((await h.request('/api/courses/admin/reviews',{session:{cookie:client.cookie}})).status,403)
 const path='/api/courses/admin/reviews/'+r.data.id
 assert.equal((await h.request(path,{body:{state:'published'},session:{cookie:admin.cookie},method:'PATCH'})).status,403)
 assert.equal((await h.request(path,{body:{state:'published',rating:5},session:admin,method:'PATCH'})).status,400)
 assert.equal((await h.request(path,{body:{state:'published'},session:admin,method:'PATCH'})).status,200)
 const published=(await h.request('/api/courses/reviews/meta')).data;assert.equal(published.count,1);assert.equal(published.rating,4);assert.equal(published.reviews[0].author,'<b>Plain text author</b>');for(const key of ['email','recipient_hash','order_id','secret','token'])assert.equal(published.reviews[0][key],undefined)
 assert.equal((await h.db.prepare("SELECT COUNT(*) AS count FROM audit WHERE action LIKE 'course_review_%'").get()).count,2)
 await h.db.prepare('UPDATE course_paid_orders SET payment_status=? WHERE id=?').run('review',b.id);assert.equal((await h.request('/api/courses/reviews/meta')).data.count,0);assert.equal((await h.request(path,{body:{state:'published'},session:admin,method:'PATCH'})).status,409)
 assert.equal(h.outgoing(),0)
})
