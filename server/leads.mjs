import {randomUUID,createHash} from 'node:crypto'
import {leadStatuses,callOutcomes,outcomeStatuses,normalizedLeadPhone} from '../src/lib/leadWorkflow.js'

const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
function text(value,label,max=4000){if(typeof value!=='string'||value.trim().length>max)fail(400,`Enter a valid ${label}.`);return value.trim()}
function choice(value,choices,label){if(!Object.hasOwn(choices,value))fail(400,`Choose a valid ${label}.`);return value}
function day(value){if(!value)return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(400,'Enter a valid follow-up date.');return value}
function leadData(body,imported=false){
  if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Enter a valid lead record.')
  const name=text(body.name,'lead name',100);if(!name)fail(400,'Enter a lead name.')
  const email=text(body.email||'','email',254).toLowerCase();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email.')
  const phone=text(body.phone||'','phone',40),phoneKey=normalizedLeadPhone(phone)
  if(phone&&(!/^[+\d\s().-]+$/.test(phone)||!/^\+?[1-9]\d{6,14}$/.test(phoneKey)))fail(400,'Enter a valid phone number including its country code.')
  const data={name,email:email||null,phone,phoneKey,company:text(body.company||'','company',160),notes:text(body.notes||'','notes'),status:choice(body.status||'new',leadStatuses,'lead status'),source:text(body.source||'manual','source',100),nextFollowUpAt:day(body.nextFollowUpAt),createdAt:new Date().toISOString(),activities:[]}
  if(imported){
    data.callingPhone=text(body.callingPhone||'','calling number',40)
    if(data.callingPhone&&(!/^[+\d\s().-]+$/.test(data.callingPhone)||!/^\+[1-9]\d{6,14}$/.test(normalizedLeadPhone(data.callingPhone))))fail(400,'Enter a valid international calling number.')
    if(!/^\+[1-9]\d{6,14}$/.test(phoneKey))fail(400,'Imported leads need an international phone number.')
    if(!['facebook_ads','instagram_ads','meta_ads','whatsapp'].includes(data.source))fail(400,'Choose a WhatsApp or Meta ad source.')
    data.whatsappReview={reviewedAt:new Date().toISOString(),summary:text(body.summary||body.notes||'','conversation summary'),lastMessageDate:day(body.lastMessageDate),acknowledgement:choice(body.acknowledgement||'unknown',{read:1,delivered:1,sent:1,unknown:1},'acknowledgement delivery'),label:text(body.label||'','WhatsApp label',160)}
    if(!data.whatsappReview.summary)fail(400,'Include the conversation evidence for each imported lead.')
  }
  return data
}

export function createLeadWorkspace({db,readJson,audit}){
  const read=async id=>{const row=await db.prepare(db.lock('SELECT * FROM leads WHERE id=?')).get(id);if(!row)fail(404,'Lead not found.');return JSON.parse(row.data)}
  const save=async(id,data,user,action)=>{data.updatedAt=new Date().toISOString();await db.prepare('UPDATE leads SET data=? WHERE id=?').run(JSON.stringify(data),id);await audit(user.id,action,id);return {...data,id}}
  return {async handle(request,response,path,user,json){
    if(user.role!=='admin')return false
    if(request.method==='POST'&&path==='/api/leads/import'){
      const body=await readJson(request)
      if(!Array.isArray(body.leads)||!body.leads.length||body.leads.length>50)fail(400,'Import between 1 and 50 reviewed leads at a time.')
      const rows=body.leads.map(row=>leadData(row,true))
      const result=await db.transaction(async()=>{
        const existing=await db.prepare(db.lock('SELECT * FROM leads')).all(),phones=new Set(existing.map(row=>normalizedLeadPhone(JSON.parse(row.data).phone||'')))
        const created=[],skipped=[]
        for(const data of rows){
          if(phones.has(data.phoneKey)){skipped.push(data.phone);continue}
          const id=createHash('sha256').update(`whatsapp:${data.phoneKey}`).digest('hex').slice(0,32)
          await db.prepare('INSERT INTO leads VALUES (?,?)').run(id,JSON.stringify(data));await audit(user.id,'import_whatsapp_lead',id)
          phones.add(data.phoneKey);created.push({...data,id})
        }
        return {created,skipped}
      })
      json(response,200,result);return true
    }
    if(request.method==='POST'&&path==='/api/leads'){
      const data=leadData(await readJson(request)),id=randomUUID()
      await db.transaction(async()=>{await db.prepare('INSERT INTO leads VALUES (?,?)').run(id,JSON.stringify(data));await audit(user.id,'create_lead',id)})
      json(response,201,{...data,id});return true
    }
    const match=path.match(/^\/api\/leads\/([^/]+)(\/activities)?$/)
    if(!match)return false
    const id=match[1]
    if(request.method==='POST'&&match[2]){
      const body=await readJson(request),outcome=choice(body.outcome,callOutcomes,'call outcome'),notes=text(body.notes||'','response notes',2000),nextFollowUpAt=day(body.nextFollowUpAt)
      if(!/^[a-f0-9-]{36}$/i.test(body.eventId||''))fail(400,'Refresh the form and try again.')
      if(outcome==='callback'&&!nextFollowUpAt)fail(400,'Choose the requested callback date.')
      const result=await db.transaction(async()=>{
        const data=await read(id);data.activities||=[]
        if(data.activities.some(item=>item.id===body.eventId))return {...data,id}
        if(data.activities.length>=1000)fail(409,'This lead has reached its activity limit.')
        data.activities.push({id:body.eventId,type:'call',outcome,notes,nextFollowUpAt,at:new Date().toISOString(),actor:user.name})
        data.status=outcomeStatuses[outcome];data.nextFollowUpAt=nextFollowUpAt
        return save(id,data,user,'record_lead_call')
      })
      json(response,201,result);return true
    }
    if(request.method==='PATCH'&&!match[2]){
      const body=await readJson(request)
      const result=await db.transaction(async()=>{
        const data=await read(id)
        if(body.expectedUpdatedAt!==undefined&&body.expectedUpdatedAt!==(data.updatedAt||data.createdAt))fail(409,'This lead changed. Refresh before saving your update.')
        if(body.status!==undefined)data.status=choice(body.status,leadStatuses,'lead status')
        if(body.notes!==undefined)data.notes=text(body.notes,'notes')
        if(body.nextFollowUpAt!==undefined)data.nextFollowUpAt=day(body.nextFollowUpAt)
        return save(id,data,user,'update_lead')
      })
      json(response,200,result);return true
    }
    return false
  }}
}
