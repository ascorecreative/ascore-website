import { uniqueConflict } from './persistence.mjs'
import { createHash } from 'node:crypto'
const origins = new Set(['https://www.zohoapis.com','https://www.zohoapis.eu','https://www.zohoapis.in','https://www.zohoapis.com.au','https://www.zohoapis.jp','https://www.zohoapis.ca','https://www.zohoapis.com.cn','https://www.zohoapis.sa'])
const resources = { crmLead:{service:'crm',path:'/crm/v8/Leads',id:'id'}, crmContact:{service:'crm',path:'/crm/v8/Contacts',id:'id'}, booksCustomer:{service:'books',path:'/books/v3/contacts',id:'contact_id'}, booksVendor:{service:'books',path:'/books/v3/contacts',id:'contact_id'}, quotation:{service:'books',path:'/books/v3/estimates',id:'estimate_id'}, invoice:{service:'books',path:'/books/v3/invoices',id:'invoice_id'}, bill:{service:'books',path:'/books/v3/bills',id:'bill_id'} }
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const reject = (status,message)=>{const e=Error(message);e.status=status;throw e}
const nameFields = name => {const parts=name.trim().split(/\s+/);return {First_Name:parts.length>1?parts.slice(0,-1).join(' '):'',Last_Name:parts.at(-1)}}
export async function createZohoSync({db,env,readJson,audit,fetcher=fetch}) {
  if(db.kind==='sqlite')await db.exec(`CREATE TABLE IF NOT EXISTS zoho_links (local_id TEXT NOT NULL, resource TEXT NOT NULL, external_id TEXT NOT NULL, PRIMARY KEY(local_id,resource), UNIQUE(resource,external_id));
    CREATE TABLE IF NOT EXISTS zoho_snapshots (local_id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS zoho_sync_operations (digest TEXT PRIMARY KEY, local_id TEXT NOT NULL, resource TEXT NOT NULL, state TEXT NOT NULL, at INTEGER NOT NULL);`)
  async function setLink(id,resource,externalId){
    try{await db.transaction(async()=>{
      const other=await db.prepare(db.lock('SELECT local_id FROM zoho_links WHERE resource=? AND external_id=?')).get(resource,externalId)
      if(other&&other.local_id!==id)reject(409,'This Zoho record is already linked to another local record.')
      const existing=await db.prepare(db.lock('SELECT external_id FROM zoho_links WHERE local_id=? AND resource=?')).get(id,resource)
      if(existing)await db.prepare('UPDATE zoho_links SET external_id=? WHERE local_id=? AND resource=?').run(externalId,id,resource)
      else await db.prepare('INSERT INTO zoho_links VALUES (?,?,?)').run(id,resource,externalId)
    })}catch(error){if(uniqueConflict(error))reject(409,'This Zoho record is already linked.');throw error}
  }
  async function saveSnapshot(id,data){
    await db.transaction(async()=>{
      const existing=await db.prepare(db.lock('SELECT local_id FROM zoho_snapshots WHERE local_id=?')).get(id)
      if(existing)await db.prepare('UPDATE zoho_snapshots SET data=? WHERE local_id=?').run(data,id)
      else await db.prepare('INSERT INTO zoho_snapshots VALUES (?,?)').run(id,data)
    })
  }
  const verified={crm:false,books:false}
  const link=async(id,resource)=>(await db.prepare('SELECT external_id FROM zoho_links WHERE local_id=? AND resource=?').get(id,resource))?.external_id
  async function call(service,path,method='GET',payload) {
    if (!origins.has(env.ZOHO_API_ORIGIN)) reject(503,'Configure an approved Zoho API data center.')
    const token=service==='crm'?env.ZOHO_CRM_ACCESS_TOKEN:env.ZOHO_BOOKS_ACCESS_TOKEN
    if (!token || (service==='books'&&!env.ZOHO_BOOKS_ORGANIZATION_ID)) reject(503,'This website has no separately approved Zoho connection.')
    const url=new URL(path,env.ZOHO_API_ORIGIN)
    if(service==='books')url.searchParams.set('organization_id',env.ZOHO_BOOKS_ORGANIZATION_ID)
    const result=await fetcher(url,{method,headers:{Authorization:`Zoho-oauthtoken ${token}`,Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(10000),redirect:'error'})
    if(!result.ok)reject(502,`Zoho rejected the request (${result.status}). Verify access before retrying.`)
    const data=result.status===204?{}:await result.json()
    if(service==='books'&&data.code!==undefined&&data.code!==0)reject(502,'Zoho Books rejected the request. Verify the organization and required fields.')
    if(service==='crm'&&method!=='GET'&&data.data?.[0]?.status!=='success')reject(502,'Zoho CRM rejected the request. Verify mandatory fields and configured picklists.')
    return data
  }
  const status=async()=>({crm:{configured:!!(env.ZOHO_API_ORIGIN&&env.ZOHO_CRM_ACCESS_TOKEN&&env.ZOHO_CRM_ORGANIZATION_ID),connected:verified.crm},books:{configured:!!(env.ZOHO_API_ORIGIN&&env.ZOHO_BOOKS_ACCESS_TOKEN&&env.ZOHO_BOOKS_ORGANIZATION_ID),connected:verified.books},writesEnabled:env.ASCORE_ENABLE_ZOHO_WRITES==='1',links:(await db.prepare('SELECT local_id AS localId,resource,external_id AS externalId FROM zoho_links').all())})
  async function preview(id,resource) {
    const definition=resources[resource]
    if(!definition)reject(400,'Select a supported Zoho record type.')
    let payload
    if(resource==='crmLead'){
      const row=(await db.prepare('SELECT data FROM leads WHERE id=?').get(id))
      if(!row)reject(404,'Lead not found.')
      const data=JSON.parse(row.data)
      let statuses={};try{statuses=JSON.parse(env.ZOHO_CRM_LEAD_STATUS_MAP||'{}')}catch{reject(503,'CRM status mapping is invalid.')}
      if(!statuses[data.status])reject(400,'Configure the CRM lead status mapping before syncing this stage.')
      payload={...nameFields(data.name),Email:data.email||undefined,Company:data.company||undefined,Phone:data.phone||undefined,Lead_Status:statuses[data.status],Description:data.notes||undefined}
    }else if(['crmContact','booksCustomer','booksVendor'].includes(resource)){
      const data=(await db.prepare("SELECT * FROM users WHERE id=? AND role='client'").get(id))
      if(!data)reject(404,'Client not found.')
      if(resource==='crmContact')payload={...nameFields(data.name),Email:data.email,Description:data.company||undefined}
      else payload={contact_name:data.company||data.name,company_name:data.company||undefined,contact_type:resource==='booksVendor'?'vendor':'customer',contact_persons:[{...Object.fromEntries(Object.entries(nameFields(data.name)).map(([key,value])=>[key==='First_Name'?'first_name':'last_name',value])),email:data.email,is_primary_contact:true}]}
    }else{
      const row=(await db.prepare('SELECT * FROM documents WHERE id=? AND kind=?').get(id,resource))
      if(!row)reject(404,'Financial record not found.')
      const data=JSON.parse(row.data),contact=await link(row.client_id,resource==='bill'?'booksVendor':'booksCustomer')
      if(!contact)reject(400,'Verify and link the correct Books customer or vendor first.')
      if(!env.ZOHO_BOOKS_ITEM_ID)reject(400,'Configure the verified Books service item before syncing documents.')
      const supportedCurrency=env.ZOHO_BOOKS_CURRENCY_CODE
      if(!supportedCurrency||row.currency!==supportedCurrency)reject(400,'This document currency does not match the verified Books configuration.')
      let taxIds={};try{taxIds=JSON.parse(env.ZOHO_BOOKS_TAX_MAP||'{}')}catch{reject(503,'Books tax mapping is invalid.')}
      if(data.taxRate&&!taxIds[String(data.taxRate)])reject(400,'Map the exact tax rate to a verified Books tax ID first.')
      payload={ [resource==='bill'?'vendor_id':'customer_id']:contact,date:data.issueDate,...(resource!=='quotation'&&data.dueDate?{due_date:data.dueDate}:{}),reference_number:`ASCORE-${id}`,line_items:data.items.map(item=>({item_id:env.ZOHO_BOOKS_ITEM_ID,description:item.description,quantity:1,rate:item.amount,...(data.taxRate?{tax_id:taxIds[String(data.taxRate)]}:{})})),notes:data.title||undefined}
      if(resource==='bill')payload.bill_number=`ASCORE-${id}`
    }
    const externalId=await link(id,resource)
    const plan={localId:id,resource,service:definition.service,method:externalId?'PUT':'POST',path:definition.path+(externalId?`/${externalId}`:''),payload:definition.service==='crm'?{data:[payload],trigger:[]}:payload}
    return {...plan,digest:hash(plan),state:(await db.prepare('SELECT state FROM zoho_sync_operations WHERE digest=?').get(hash(plan)))?.state||'ready'}
  }
  async function handle(request,response,path,user,send) {
    if(!path.startsWith('/api/integrations/zoho'))return false
    if(request.method==='GET'&&path==='/api/integrations/zoho') {send(response,200,await status());return true}
    const body=await readJson(request)
    if(request.method==='POST'&&path.endsWith('/verify')){
      if(body.service==='crm'){const result=await call('crm','/crm/v8/org');if(!env.ZOHO_CRM_ORGANIZATION_ID||!result.org?.some(org=>String(org.id)===env.ZOHO_CRM_ORGANIZATION_ID))reject(403,'CRM organization has not been verified.');verified.crm=true}
      else if(body.service==='books'){const result=await call('books','/books/v3/organizations');if(!result.organizations?.some(org=>String(org.organization_id)===env.ZOHO_BOOKS_ORGANIZATION_ID))reject(403,'Books organization has not been verified.');verified.books=true}
      else reject(400,'Choose CRM or Books.')
      await audit(user.id,'verify_zoho_connection',body.service);send(response,200,await status());return true
    }
    if(request.method==='POST'&&path.endsWith('/link')){
      if(!resources[body.resource]||typeof body.localId!=='string'||!/^\d{5,30}$/.test(body.externalId||''))reject(400,'Enter a valid local record and exact Zoho record ID.')
      const def=resources[body.resource]
      const table=body.resource==='crmLead'?'leads':['crmContact','booksCustomer','booksVendor'].includes(body.resource)?'users':'documents'
      if(!(await db.prepare(`SELECT id FROM ${table} WHERE id=?${table==='users'?" AND role='client'":table==='documents'?" AND kind='"+body.resource+"'":''}`).get(body.localId)))reject(404,'Local record not found.')
      const result=await call(def.service,`${def.path}/${body.externalId}`)
      const remote=def.service==='crm'?result.data?.[0]:result.contact||result.estimate||result.invoice||result.bill
      if(!remote||String(remote[def.id])!==body.externalId)reject(400,'Zoho record could not be verified.')
      if(body.resource==='booksVendor'&&remote.contact_type!=='vendor')reject(400,'Select a Books vendor record.')
      if(body.resource==='booksCustomer'&&remote.contact_type!=='customer')reject(400,'Select a Books customer record.')
      await setLink(body.localId,body.resource,body.externalId)
      await audit(user.id,'link_verified_zoho_record',body.localId);send(response,200,await status());return true
    }
    if(request.method==='POST'&&path.endsWith('/pull-balances')){
      if(!verified.books)reject(403,'Verify the Books organization before refreshing balances.')
      const links=(await db.prepare("SELECT local_id,resource,external_id FROM zoho_links WHERE resource IN ('quotation','invoice','bill') LIMIT 25").all())
      let refreshed=0
      for(const item of links){
        const def=resources[item.resource],result=await call('books',`${def.path}/${item.external_id}`)
        const remote=result.estimate||result.invoice||result.bill
        if(!remote||String(remote[def.id])!==item.external_id||!Number.isFinite(Number(remote.total))||!Number.isFinite(Number(remote.balance??remote.total)))reject(502,'Books returned an invalid financial summary.')
        const data={externalId:item.external_id,currency:remote.currency_code,total:Number(remote.total),balance:Number(remote.balance??remote.total),status:remote.status,checkedAt:new Date().toISOString()}
        await saveSnapshot(item.local_id,JSON.stringify(data));refreshed++
      }
      await audit(user.id,'refresh_books_balances','linked-documents');send(response,200,{refreshed});return true
    }
    if(request.method==='POST'&&path.endsWith('/preview')) {send(response,200,await preview(body.localId,body.resource));return true}
    if(request.method==='POST'&&path.endsWith('/sync')){
      if(env.ASCORE_ENABLE_ZOHO_WRITES!=='1')reject(403,'Zoho writes are disabled until separately approved server access is configured.')
      const plan=await preview(body.localId,body.resource)
      if(!verified[plan.service])reject(403,'Verify this server connection before syncing.')
      if(body.confirmDigest!==plan.digest)reject(409,'Review a fresh sync preview before confirming this exact write.')
      if(plan.state!=='ready')reject(409,'This exact operation was already attempted. Inspect Zoho before preparing another write.')
      try{await db.prepare('INSERT INTO zoho_sync_operations VALUES (?,?,?,?,?)').run(plan.digest,plan.localId,plan.resource,'running',Date.now())}catch(error){if(uniqueConflict(error))reject(409,'This exact operation was already attempted. Inspect Zoho before preparing another write.');throw error}
      try{
        const result=await call(plan.service,plan.path,plan.method,plan.payload)
        const record=plan.service==='crm'?result.data[0].details:result.contact||result.estimate||result.invoice||result.bill
        const externalId=String(record?.[resources[plan.resource].id]||'')
        if(!/^\d{5,30}$/.test(externalId))throw Error('Missing remote identifier')
        await setLink(plan.localId,plan.resource,externalId)
        ;(await db.prepare("UPDATE zoho_sync_operations SET state='succeeded' WHERE digest=?").run(plan.digest))
        await audit(user.id,'sync_zoho_record',plan.localId);send(response,200,{ok:true,externalId,...await status()})
      }catch{(await db.prepare("UPDATE zoho_sync_operations SET state='uncertain' WHERE digest=?").run(plan.digest));reject(502,'Sync outcome needs review in Zoho. This operation will not retry automatically.')}
      return true
    }
    reject(404,'Integration action not found.')
  }
  return {handle,status,preview}
}
