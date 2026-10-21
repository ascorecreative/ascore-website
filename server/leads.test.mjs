import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {createPortalServer} from './app.mjs'

test('reviewed leads import once; calls persist, serialize and stay private',async t=>{
  const setupToken='isolated-leads-test-grant',env={ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(setupToken).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}})}
  const portal=await createPortalServer({dbPath:':memory:',env});await new Promise(resolve=>portal.server.listen(0,'127.0.0.1',resolve));t.after(()=>portal.close())
  const request=async(path,body,session={},method=body?'POST':'GET')=>{
    const response=await fetch(`http://127.0.0.1:${portal.server.address().port}/api${path}`,{method,headers:{Origin:'http://127.0.0.1:5173',...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})})
    return {...await response.json(),httpStatus:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]}
  }
  const admin=await request('/auth/admin-setup',{username:'aswinfrn',name:'Synthetic admin',password:'Synthetic tests password only',setupToken})
  const lead={name:'Synthetic prospect',phone:'+1 202 555 0199',callingPhone:'+1 202 555 0177',status:'no_reply',source:'facebook_ads',summary:'Synthetic acknowledgement read; no subsequent reply.',acknowledgement:'read',lastMessageDate:'2026-10-01'}
  assert.equal((await request('/leads/import',{leads:[lead]})).httpStatus,401)
  assert.equal((await request('/leads/import',{leads:[lead]},{cookie:admin.cookie})).httpStatus,403)
  const client=await request('/auth/register',{username:'lead_client',email:'client@example.test',name:'Client',password:'Synthetic tests password only'})
  assert.equal((await request('/leads/import',{leads:[lead]},client)).httpStatus,403)
  assert.equal((await request('/leads/import',{leads:[{...lead,lastMessageDate:'2026-02-31'}]},admin)).httpStatus,400)
  assert.equal((await request('/leads/import',{leads:[{...lead,phone:'not a number'}]},admin)).httpStatus,400)
  assert.equal((await request('/leads/import',{leads:[{...lead,callingPhone:'not a number'}]},admin)).httpStatus,400)
  const imported=await request('/leads/import',{leads:[lead,{...lead,phone:'+12025550199'}]},admin)
  assert.equal(imported.httpStatus,200);assert.equal(imported.created.length,1);assert.equal(imported.skipped.length,1)
  const saved=imported.created[0],id=saved.id
  assert.equal((await request('/leads/import',{leads:[lead]},admin)).created.length,0)
  assert.equal((await request(`/leads/${id}`,{status:'imaginary'},admin,'PATCH')).httpStatus,400)
  assert.equal((await request(`/leads/${id}`,{status:'call_again',expectedUpdatedAt:'stale'},admin,'PATCH')).httpStatus,409)
  const queued=await request(`/leads/${id}`,{status:'call_again',expectedUpdatedAt:saved.createdAt},admin,'PATCH')
  assert.equal(queued.status,'call_again');assert.equal(queued.activities.length,0)
  const eventId=randomUUID(),call={eventId,outcome:'no_answer',notes:'Synthetic unanswered call',nextFollowUpAt:'2026-10-22'}
  assert.equal((await request(`/leads/${id}/activities`,{...call,outcome:'callback',nextFollowUpAt:''},admin)).httpStatus,400)
  const concurrent=await Promise.all([request(`/leads/${id}/activities`,call,admin),request(`/leads/${id}/activities`,call,admin),request(`/leads/${id}/activities`,{...call,eventId:randomUUID(),outcome:'interested'},admin)])
  assert.ok(concurrent.every(r=>r.httpStatus===201))
  const workspace=await request('/workspace',null,admin),final=workspace.leads.find(row=>row.id===id)
  assert.equal(final.activities.length,2);assert.equal(final.activities.filter(a=>a.id===eventId).length,1)
  assert.equal(final.notes,'');assert.equal(final.whatsappReview.summary,lead.summary);assert.equal(final.nextFollowUpAt,'2026-10-22');assert.equal(final.callingPhone,lead.callingPhone)
  assert.equal((await request('/workspace',null,client)).leads.length,0)
  assert.equal((await request(`/leads/${id}/activities`,{...call,eventId:randomUUID()},client)).httpStatus,403)
})
