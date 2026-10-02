import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createPortalServer } from './app.mjs'

test('real sessions, reserved admins, client isolation, CSRF and tracking balances', async t => {
  const setupToken = 'test-only-isolated-memory-grant'
  const env = { ASCORE_ALLOW_ADMIN_SETUP:'1', ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(setupToken).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}}) }
  const portal = createPortalServer({dbPath:':memory:',env})
  await new Promise(resolve=>portal.server.listen(0,'127.0.0.1',resolve))
  t.after(()=>portal.close())
  const base = `http://127.0.0.1:${portal.server.address().port}/api`
  const password = 'synthetic test password only'
  const request = async(path,body,session={},method=body?'POST':'GET',extra={})=>{
    const response=await fetch(base+path,{method,headers:{Origin:'http://127.0.0.1:5173',...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})})
    return {...await response.json(),httpStatus:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]}
  }
  assert.equal((await request('/auth/register',{username:'aswinfrn',email:'reserved@example.test',name:'Reserved',password})).httpStatus,400)
  assert.equal((await request('/auth/register',{username:'hacker',email:'role@example.test',name:'Role',password,role:'admin'})).httpStatus,400)
  const a=await request('/auth/register',{username:'client_a',email:'a@example.test',name:'Client A',password})
  const b=await request('/auth/register',{username:'client_b',email:'b@example.test',name:'Client B',password})
  assert.equal(a.httpStatus,201); assert.equal(b.httpStatus,201); assert.equal(a.user.role,'client')
  assert.equal((await request('/workspace',null,a)).projects.length,0)
  assert.equal((await request('/auth/login',{identifier:'client_a',password:'wrong-password'})).httpStatus,401)
  const signed=await request('/auth/login',{identifier:'a@example.test',password})
  assert.equal(signed.user.id,a.user.id)
  assert.equal((await request('/projects',{title:'Forbidden',clientId:a.user.id},a)).httpStatus,403)
  const admin=await request('/auth/admin-setup',{username:'aswinfrn',name:'Test admin',password,setupToken})
  assert.equal(admin.httpStatus,201); assert.equal(admin.user.email,null); assert.equal(admin.user.role,'admin')
  assert.equal((await request('/auth/admin-setup',{username:'aswinfrn',name:'Replay',password,setupToken})).httpStatus,403)
  assert.equal((await request('/projects',{title:'CSRF',clientId:a.user.id},{cookie:admin.cookie})).httpStatus,403)
  assert.equal((await request('/projects',{title:'Origin',clientId:a.user.id},admin,'POST',{Origin:'https://untrusted.test'})).httpStatus,403)
  const project=await request('/projects',{title:'A project',clientId:a.user.id},admin)
  assert.equal(project.httpStatus,201)
  assert.equal((await request(`/projects/${project.id}`,{currentStage:'Design',progressPercentage:35},admin,'PATCH')).progressPercentage,35)
  assert.equal((await request('/milestones',{title:'Design signed off',projectId:project.id},admin)).httpStatus,201)
  assert.equal((await request('/leads',{name:'A lead'},admin)).httpStatus,201)
  const doc=await request('/documents',{clientId:a.user.id,projectId:project.id,kind:'invoice',items:[{description:'Design',amount:100.10},{description:'Build',amount:50.20}],taxRate:5},admin)
  assert.equal(doc.httpStatus,201); assert.equal(doc.amount,157.82)
  assert.equal((await request('/documents',{clientId:b.user.id,projectId:project.id,kind:'invoice',items:[{description:'Mismatch',amount:1}]},admin)).httpStatus,400)
  assert.equal((await request(`/documents/${doc.id}/payment-records`,{amount:200,paidDate:'2026-10-01',reference:'Test only'},admin)).httpStatus,400)
  const payment=await request(`/documents/${doc.id}/payment-records`,{amount:57.82,paidDate:'2026-10-01',reference:'Test only'},admin)
  assert.equal(payment.balance,100); assert.equal(payment.status,'partial')
  assert.equal((await request('/documents',{clientId:a.user.id,kind:'bill',items:[{description:'Agency cost',amount:20}]},admin)).httpStatus,201)
  const mine=await request('/workspace',null,a),other=await request('/workspace',null,b)
  assert.equal(mine.projects.length,1); assert.equal(mine.milestones.length,1); assert.equal(mine.documents.length,1)
  assert.equal(mine.leads.length,0); assert.equal(mine.clients.length,0); assert.equal(mine.integrations,null)
  assert.equal(other.projects.length,0); assert.equal(other.milestones.length,0); assert.equal(other.documents.length,0)
  assert.equal((await request('/auth/logout',{},signed)).httpStatus,200)
  assert.equal((await request('/workspace',null,signed)).httpStatus,401)
})

test('setup and production registration are disabled without explicit configuration', async t=>{
  const portal=createPortalServer({dbPath:':memory:',env:{NODE_ENV:'production'},origin:'https://ascore.example'})
  await new Promise(resolve=>portal.server.listen(0,'127.0.0.1',resolve)); t.after(()=>portal.close())
  const response=await fetch(`http://127.0.0.1:${portal.server.address().port}/api/auth/admin-setup`,{method:'POST',headers:{Origin:'https://ascore.example','Content-Type':'application/json'},body:JSON.stringify({username:'sachindinesh',setupToken:'invalid'})})
  assert.equal(response.status,403)
  const registration=await fetch(`http://127.0.0.1:${portal.server.address().port}/api/auth/register`,{method:'POST',headers:{Origin:'https://ascore.example','Content-Type':'application/json'},body:JSON.stringify({username:'testclient'})})
  assert.equal(registration.status,503)
})
