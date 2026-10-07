import {createGA4Reporting} from './ga4-reporting.mjs'
import {createPrivateCourseTest} from './private-course-test.mjs'
import {createPdfStore} from './pdf-store.mjs'
import { createServer } from 'node:http'
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { createZohoSync } from './zoho-sync.mjs'
import { createEnquiries } from './enquiries.mjs'
import { createCourses,courseCatalog } from './courses.mjs'
import {createNomodCourses,nomodWebhookPath} from './nomod-courses.mjs'
import {createWeeklyMetaSessions} from './course-sessions.mjs'
import {createCourseReviews} from './course-reviews.mjs'
import { createPersistence,uniqueConflict } from './persistence.mjs'

const derive = promisify(scrypt)
const cost = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }
const adminNames = new Set(['aswinfrn', 'sachindinesh'])
const digest = value => createHash('sha256').update(value).digest('hex')
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const publicUser = row => row && ({ id: row.id, username: row.username, name: row.name, email: row.email, company: row.company, role: row.role })
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error }
function text(value, label, max = 200, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, `Enter a valid ${label}.`)
  return value.trim()
}
function username(value) {
  const result = text(value, 'username', 40).toLowerCase()
  if (!/^[a-z][a-z0-9_.-]{2,39}$/.test(result)) fail(400, 'Username must be 3–40 characters, starting with a letter.')
  return result
}
function email(value, required = false) {
  const result = text(value ?? '', 'email', 254, required).toLowerCase()
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Enter a valid email address.')
  return result || null
}
function password(value) {
  if (typeof value !== 'string' || [...value].length < 15 || [...value].length > 128) fail(400, 'Use a password of 15–128 characters.')
  return value
}
function number(value, label, max = 100000000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) fail(400, `Enter a valid ${label}.`)
  return value
}
function date(value, label, required = false) {
  if (!value && !required) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(400, `Enter a valid ${label}.`)
  return value
}
function choice(value, options, label) {
  if (!options.includes(value)) fail(400, `Choose a valid ${label}.`)
  return value
}
const readJson = async request => {
  if (!(request.headers['content-type'] || '').startsWith('application/json')) fail(415, 'Use a JSON request.')
  let body = '', bytes = 0
  for await (const chunk of request) { bytes += chunk.length; if (bytes > 32768) fail(413, 'Request is too large.'); body += chunk }
  try { const parsed = JSON.parse(body); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(); return parsed } catch { fail(400, 'Invalid request body.') }
}

export async function createPortalServer(options = {}) {
  const env = options.env || process.env
  const production = env.NODE_ENV === 'production'
  const origin = options.origin || env.ASCORE_ORIGIN || 'http://127.0.0.1:5173'
  if (production && !origin.startsWith('https://')) throw Error('Production requires an explicit HTTPS ASCORE_ORIGIN.')
  const db = await createPersistence({env,dbPath:options.dbPath,poolFactory:options.poolFactory,store:options.store})
  if(db.kind==='sqlite')await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL, company TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('client','admin')),
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS used_setup_tokens (token_hash TEXT PRIMARY KEY, used_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS milestones (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS documents (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL REFERENCES users(id), project_id TEXT REFERENCES projects(id), kind TEXT NOT NULL CHECK(kind IN ('quotation','invoice','bill')), currency TEXT NOT NULL, amount_minor INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payment_records (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), amount_minor INTEGER NOT NULL CHECK(amount_minor>0), paid_date TEXT NOT NULL, reference TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL);
  `)
  const cookieName = production ? '__Host-ascore_session' : 'ascore_session'
  const attempts = new Map()
  let hashing = 0
  async function hashValue(value, salt) {
    if (hashing >= 2) fail(503, 'Sign-in is busy. Try again shortly.')
    hashing++
    try { return await derive(value, salt, 64, cost) } finally { hashing-- }
  }
  async function hashPassword(value) {
    const salt = randomBytes(16).toString('hex')
    return `scrypt$131072$8$1$${salt}$${(await hashValue(value, salt)).toString('hex')}`
  }
  async function checkPassword(value, stored) {
    const fields = stored?.split('$')
    const salt = fields?.[4] || '00000000000000000000000000000000'
    const computed = await hashValue(value, salt)
    const expected = Buffer.from(fields?.[5] || '00'.repeat(64), 'hex')
    return expected.length === computed.length && timingSafeEqual(expected, computed) && !!stored
  }
  function rateLimit(request, identifier = '') {
    const now = Date.now()
    for (const [key, item] of attempts) if (item.until < now) attempts.delete(key)
    const keys = [request.socket.remoteAddress || 'local', `identity:${identifier}`]
    for (const key of keys) {
      const item = attempts.get(key) || { count: 0, until: now + 15 * 60000 }
      item.count++
      attempts.set(key, item)
      if (item.count > (key.startsWith('identity:') ? 10 : 40)) fail(429, 'Too many sign-in attempts. Try again later.')
    }
    if (attempts.size > 10000) fail(503, 'Sign-in is busy. Try again later.')
  }
  const audit = async (actor, action, target) => (await db.prepare('INSERT INTO audit (at,actor_id,action,target_id) VALUES (?,?,?,?)').run(Date.now(), actor, action, target))
  const setCookie = (response, value, maxAge = 8 * 3600) => response.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production ? '; Secure' : ''}`)
  async function startSession(response,user,previous){
    const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex')
    await db.transaction(async()=>{
      if(previous)await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(previous))
      await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now())
      await db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(digest(token),user.id,csrf,Date.now()+8*3600000)
    })
    setCookie(response,token)
    return {user:publicUser(user),csrf}
  }
  async function currentSession(request) {
    const token = (request.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return { token: null, user: null, csrf: null }
    const session = (await db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(digest(token), Date.now()))
    return { token, user: session ? (await db.prepare('SELECT * FROM users WHERE id=?').get(session.user_id)) : null, csrf: session?.csrf }
  }
  const client = async id => {
    if (!id || typeof id !== 'string' || !(await db.prepare("SELECT id FROM users WHERE id=? AND role='client'").get(id))) fail(400, 'Select an existing client account.')
    return id
  }
  const project = async id => {
    const row = typeof id === 'string' && (await db.prepare('SELECT * FROM projects WHERE id=?').get(id))
    if (!row) fail(404, 'Project not found.')
    return row
  }
  const documentView = async row => {
    const paidMinor = Number((await db.prepare('SELECT COALESCE(SUM(amount_minor),0) AS total FROM payment_records WHERE document_id=?').get(row.id)).total)
    const data = JSON.parse(row.data)
    return { ...data, id: row.id, clientId: row.client_id, projectId: row.project_id, kind: row.kind, currency: row.currency,
      amount: row.amount_minor / 100, amountPaid: paidMinor / 100, balance: (row.amount_minor - paidMinor) / 100,
      status: row.kind === 'quotation' ? 'draft' : paidMinor >= row.amount_minor ? 'paid' : data.dueDate && data.dueDate < new Date().toISOString().slice(0, 10) ? 'overdue' : paidMinor ? 'partial' : 'pending',
      invoiceNumber: `ASC-${new Date(data.createdAt).getFullYear()}-${{ quotation:'Q', invoice:'I', bill:'B' }[row.kind]}-${String(row.sequence).padStart(4, '0')}` }
  }
  async function workspace(user) {
    const admin = user.role === 'admin'
    const projects = admin ? (await db.prepare('SELECT * FROM projects').all()) : (await db.prepare('SELECT * FROM projects WHERE client_id=?').all(user.id))
    const milestones = admin ? (await db.prepare('SELECT * FROM milestones').all()) : (await db.prepare('SELECT m.* FROM milestones m JOIN projects p ON p.id=m.project_id WHERE p.client_id=?').all(user.id))
    const docs = admin ? (await db.prepare('SELECT * FROM documents').all()) : (await db.prepare("SELECT * FROM documents WHERE client_id=? AND kind!='bill'").all(user.id))
    return {
      projects: projects.map(row => ({ ...JSON.parse(row.data), id: row.id, clientId: row.client_id })),
      milestones: milestones.map(row => ({ ...JSON.parse(row.data), id: row.id, projectId: row.project_id })),
      documents: await Promise.all(docs.map(async row => ({...await documentView(row),zoho:JSON.parse((await db.prepare('SELECT data FROM zoho_snapshots WHERE local_id=?').get(row.id))?.data || 'null')}))),
      leads: admin ? (await db.prepare('SELECT * FROM leads').all()).map(row => ({ ...JSON.parse(row.data), id: row.id })) : [],
      clients: admin ? (await db.prepare("SELECT id,username,email,name,company,role FROM users WHERE role='client'").all()) : [],
      integrations: admin ? await integration.status() : null
    }
  }
  const responseJson = (response, status, data) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(data)) }
  const integration = await createZohoSync({db,env,readJson,audit,fetcher:options.zohoFetch || fetch})
  const enquiries = await createEnquiries({db,env,readJson,fetcher:options.zohoFetch||fetch,adapters:options.enquiryAdapters,now:options.now||Date.now})
  const courseReviews=await createCourseReviews({db,env,readJson,audit,now:options.now||Date.now})
  const pdfStorage=await createPdfStore({db,env,catalog:courseCatalog,readJson,audit})
  const coursePdfReader=options.coursePdfReader||(pdfStorage.mode==='mariadb'?(_env,id)=>pdfStorage.read(id):undefined)
  const privateCourseTest=createPrivateCourseTest({db,env,readJson,audit,pdfReader:coursePdfReader,sendEmail:options.courseSender})
  let nomod
  const courses = await createCourses({db,env,readJson,origin,audit,sendEmail:options.courseSender,pdfReader:coursePdfReader,now:options.now||Date.now,workerInterval:options.courseWorkerInterval,pdfStorage,privateTestStatus:user=>privateCourseTest.status(user),paidReady:()=>nomod?.ready()===true,paymentReadiness:async user=>({sales:await nomod?.salesOverview(user),privateNomodTest:await nomod?.privateTestState(user),replacementNomodTest:await nomod?.replacementTestState(user),setup:nomod?.setupState(user),diagnostic:nomod?.diagnosticState(user),ready:nomod?.ready()===true,requirements:nomod?.requirements,webhooksEnabled:env.ASCORE_ENABLE_NOMOD_WEBHOOKS==='1'})})
  // Production remains closed until Hosted Checkout event correlation is
  // independently verified and a reviewed contract implementation replaces false.
  nomod=await createNomodCourses({db,env,readJson,origin,audit,contractVerified:false,fetcher:options.nomodFetch||fetch,sendEmail:options.courseSender,pdfReader:coursePdfReader,now:options.now||Date.now,workerInterval:options.courseWorkerInterval})
  const ga4=createGA4Reporting({env,fetcher:options.ga4Fetch||fetch,now:options.now||Date.now})
  const weeklySessions=await createWeeklyMetaSessions({db,env,audit,paymentReady:()=>nomod.ready(),sendEmail:options.courseSender,now:options.now||Date.now,workerInterval:options.courseWorkerInterval})
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    const path = new URL(request.url, 'http://localhost').pathname
    const mutation = !['GET','HEAD'].includes(request.method)
    try {
      if (!path.startsWith('/api/')) fail(404, 'Not found.')
      // This is the sole cross-origin mutation exception. Nomod must verify the
      // untouched body and Svix signature before any event can be persisted.
      if(path===nomodWebhookPath&&request.method==='POST'){await nomod.publicHandle(request,response,path,responseJson);return}
      if (mutation && request.headers.origin !== origin) fail(403, 'Request origin is not allowed.')
      if (await enquiries.publicHandle(request,response,path,responseJson)) return
      if(await courseReviews.publicHandle(request,response,path,responseJson))return
      if (await courses.publicHandle(request,response,path,responseJson)) return
      if(await nomod.publicHandle(request,response,path,responseJson))return
      const session = await currentSession(request)
      const user = session.user
      if (request.method === 'GET' && path === '/api/health') {if(!await db.health())fail(503,'Persistent storage is unavailable.');return responseJson(response,200,{status:'ok',mode:production?'production':'local',storage:db.kind,payments:'tracking-only',...(db.readiness?{databaseVerified:true,schemaVersion:db.readiness.schemaVersion,schemaAppliedAt:db.readiness.schemaAppliedAt}:{})})}
      if (request.method === 'GET' && path === '/api/auth/session') return responseJson(response, 200, { user:publicUser(user), csrf:session.csrf || null })
      if (request.method === 'POST' && path === '/api/auth/login') {
        const body = await readJson(request), identifier = text(body.identifier, 'username or email', 254).toLowerCase()
        rateLimit(request, identifier)
        if (typeof body.password !== 'string' || body.password.length > 512) fail(400, 'Enter your password.')
        const account = (await db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(identifier, identifier))
        if (!await checkPassword(body.password, account?.password_hash)) fail(401, 'Username/email or password is incorrect.')
        await audit(account.id, 'login', account.id)
        return responseJson(response, 200, await startSession(response, account, session.token))
      }
      if (request.method === 'POST' && ['/api/auth/register','/api/auth/admin-setup'].includes(path)) {
        const body = await readJson(request), name = username(body.username)
        rateLimit(request, name)
        const setup = path.endsWith('admin-setup')
        if (body.role !== undefined) fail(400, 'Account roles are assigned by the server.')
        let tokenHash
        if (setup) {
          let grants = {}
          try { grants = JSON.parse(env.ASCORE_ADMIN_SETUP_GRANTS || '{}') } catch { fail(503, 'Administrator setup is not configured.') }
          const grant = grants[name]
          tokenHash = typeof body.setupToken === 'string' ? digest(body.setupToken) : ''
          if (env.ASCORE_ALLOW_ADMIN_SETUP !== '1' || !adminNames.has(name) || !grant || !safeEqual(tokenHash, grant.tokenHash) || !Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) < Date.now() || (await db.prepare('SELECT token_hash FROM used_setup_tokens WHERE token_hash=?').get(tokenHash))) fail(403, 'Administrator setup requires a valid, approved activation grant.')
        } else if (adminNames.has(name)) fail(400, 'This username is reserved for agency setup.')
        if (production && !setup && env.ASCORE_ALLOW_REGISTRATION !== '1') fail(503, 'Client registration is not enabled yet.')
        const accountEmail = email(body.email, !setup)
        const pass = password(body.password)
        const displayName = text(body.name, 'name', 100)
        const company = text(body.company || '', 'company', 160, false)
        if ((await db.prepare('SELECT id FROM users WHERE username=? OR (email IS NOT NULL AND email=?)').get(name, accountEmail))) fail(409, 'That username or email is unavailable.')
        const passwordHash = await hashPassword(pass)
        const id = randomUUID()
        // One transaction consumes the grant and creates the account. Never seed real administrators.
        try {await db.transaction(async()=>{
          ;(await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?)').run(id, name, accountEmail, displayName, company, setup ? 'admin' : 'client', passwordHash, Date.now()))
          if (setup) (await db.prepare('INSERT INTO used_setup_tokens VALUES (?,?)').run(tokenHash, Date.now()))
          await audit(id, setup ? 'admin_setup' : 'client_registration', id)
        })} catch (error) { if (uniqueConflict(error)) fail(409, 'Account setup is unavailable or has already been used.'); throw error }
        return responseJson(response, 201, await startSession(response, (await db.prepare('SELECT * FROM users WHERE id=?').get(id)), session.token))
      }
      if (!user) fail(401, 'Sign in to continue.')
      if (mutation && !safeEqual(request.headers['x-csrf-token'], session.csrf)) fail(403, 'Session verification failed. Refresh and try again.')
      if (request.method === 'POST' && path === '/api/auth/logout') {
        ;(await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(session.token))); setCookie(response, '', 0)
        return responseJson(response, 200, { ok:true })
      }
      if (request.method === 'GET' && path === '/api/workspace') return responseJson(response, 200, await workspace(user))
      if (user.role !== 'admin') fail(403, 'Agency access is required.')
      if(await ga4.handle(request,response,path,user,responseJson))return
      if (await enquiries.adminHandle(request,response,path,responseJson)) return
      if(await courseReviews.adminHandle(request,response,path,user,responseJson))return
      if(await privateCourseTest.adminHandle(request,response,path,user,responseJson))return
      if(await pdfStorage.adminHandle(request,response,path,user,responseJson))return
      if(await nomod.adminHandle(request,response,path,user,responseJson))return
      if (await courses.adminHandle(request,response,path,user,responseJson)) return
      if (await integration.handle(request,response,path,user,responseJson)) return
      if (request.method === 'POST' && path === '/api/projects') {
        const body = await readJson(request), clientId = await client(body.clientId), id = randomUUID()
        const data = { title:text(body.title,'project title'), description:text(body.description || '', 'description', 2000,false), status:'active', currentStage:'Discovery', progressPercentage:0, targetLaunchDate:date(body.targetLaunchDate,'target date'), createdAt:new Date().toISOString() }
        ;(await db.prepare('INSERT INTO projects VALUES (?,?,?)').run(id,clientId,JSON.stringify(data))); await audit(user.id,'create_project',id)
        return responseJson(response,201,{...data,id,clientId})
      }
      if (request.method === 'PATCH' && /^\/api\/projects\/[^/]+$/.test(path)) {
        const id = path.split('/').at(-1), row = await project(id), body = await readJson(request), data = JSON.parse(row.data)
        if (body.title !== undefined) data.title = text(body.title,'project title')
        if (body.description !== undefined) data.description = text(body.description,'description',2000,false)
        if (body.status !== undefined) data.status = choice(body.status,['active','in_review','completed','on_hold'],'project status')
        if (body.currentStage !== undefined) data.currentStage = choice(body.currentStage,['Discovery','Design','Development','QA','Launch'],'stage')
        if (body.progressPercentage !== undefined) data.progressPercentage = number(body.progressPercentage,'progress',100)
        if (body.targetLaunchDate !== undefined) data.targetLaunchDate = date(body.targetLaunchDate,'target date')
        data.updatedAt = new Date().toISOString()
        ;(await db.prepare('UPDATE projects SET data=? WHERE id=?').run(JSON.stringify(data),id)); await audit(user.id,'update_project',id)
        return responseJson(response,200,{...data,id,clientId:row.client_id})
      }
      if (request.method === 'POST' && path === '/api/milestones') {
        const body = await readJson(request), row = await project(body.projectId), id = randomUUID()
        const data = { title:text(body.title,'milestone title'), description:text(body.description || '', 'description',2000,false), dueDate:date(body.dueDate,'due date'), status:'pending', createdAt:new Date().toISOString() }
        ;(await db.prepare('INSERT INTO milestones VALUES (?,?,?)').run(id,row.id,JSON.stringify(data))); await audit(user.id,'create_milestone',id)
        return responseJson(response,201,{...data,id,projectId:row.id})
      }
      if (request.method === 'PATCH' && /^\/api\/milestones\/[^/]+$/.test(path)) {
        const id = path.split('/').at(-1), row = (await db.prepare('SELECT * FROM milestones WHERE id=?').get(id))
        if (!row) fail(404,'Milestone not found.')
        const body = await readJson(request), data = JSON.parse(row.data)
        data.status = choice(body.status,['pending','in_progress','completed'],'milestone status')
        ;(await db.prepare('UPDATE milestones SET data=? WHERE id=?').run(JSON.stringify(data),id)); await audit(user.id,'update_milestone',id)
        return responseJson(response,200,{...data,id,projectId:row.project_id})
      }
      if (request.method === 'POST' && path === '/api/leads') {
        const body = await readJson(request), id = randomUUID()
        const data = { name:text(body.name,'lead name',100), email:email(body.email), company:text(body.company || '', 'company',160,false), phone:text(body.phone || '', 'phone',40,false), notes:text(body.notes || '', 'notes',4000,false), status:'new', createdAt:new Date().toISOString() }
        ;(await db.prepare('INSERT INTO leads VALUES (?,?)').run(id,JSON.stringify(data))); await audit(user.id,'create_lead',id)
        return responseJson(response,201,{...data,id})
      }
      if (request.method === 'PATCH' && /^\/api\/leads\/[^/]+$/.test(path)) {
        const id = path.split('/').at(-1), row = (await db.prepare('SELECT * FROM leads WHERE id=?').get(id))
        if (!row) fail(404,'Lead not found.')
        const body = await readJson(request), data = JSON.parse(row.data)
        if (body.status !== undefined) data.status = choice(body.status,['new','contacted','qualified','proposal','won','lost'],'lead status')
        if (body.notes !== undefined) data.notes = text(body.notes,'notes',4000,false)
        data.updatedAt = new Date().toISOString()
        ;(await db.prepare('UPDATE leads SET data=? WHERE id=?').run(JSON.stringify(data),id)); await audit(user.id,'update_lead',id)
        return responseJson(response,200,{...data,id})
      }
      if (request.method === 'POST' && path === '/api/documents') {
        const body = await readJson(request), clientId = await client(body.clientId), id = randomUUID()
        const kind = choice(body.kind,['quotation','invoice','bill'],'document type')
        const currency = choice(body.currency || 'AED',['AED','USD','EUR','GBP'],'currency')
        let projectId = null
        if (body.projectId) { const row = await project(body.projectId); if (row.client_id !== clientId) fail(400,'Project and client do not match.'); projectId = row.id }
        if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) fail(400,'Add 1–50 document line items.')
        const items = body.items.map(item => ({description:text(item.description,'line description',300),amount:Math.round(number(item.amount,'line amount')*100)/100}))
        const taxRate = number(body.taxRate ?? 0,'tax rate',100)
        const subtotalMinor = items.reduce((sum,item) => sum + Math.round(item.amount*100),0)
        const taxMinor = Math.round(subtotalMinor*taxRate/100), amountMinor = subtotalMinor+taxMinor
        if (amountMinor <= 0 || amountMinor > 10000000000) fail(400,'Document total must be greater than zero and within the supported range.')
        const data = { title:text(body.title || '', 'document title',200,false), items, taxRate, taxAmount:taxMinor/100, subtotal:subtotalMinor/100, issueDate:date(body.issueDate || new Date().toISOString().slice(0,10),'issue date',true), dueDate:date(body.dueDate,'due date'), createdAt:new Date().toISOString() }
        ;(await db.prepare('INSERT INTO documents (id,client_id,project_id,kind,currency,amount_minor,data) VALUES (?,?,?,?,?,?,?)').run(id,clientId,projectId,kind,currency,amountMinor,JSON.stringify(data))); await audit(user.id,'create_document',id)
        return responseJson(response,201,await documentView((await db.prepare('SELECT * FROM documents WHERE id=?').get(id))))
      }
      if (request.method==='POST'&&/^\/api\/documents\/[^/]+\/payment-records$/.test(path)){
        const id=path.split('/')[3],body=await readJson(request)
        const updated=await db.transaction(async()=>{
          const row=await db.prepare(db.lock('SELECT * FROM documents WHERE id=?')).get(id)
          if(!row)fail(404,'Document not found.')
          if(row.kind==='quotation')fail(400,'Quotations cannot have payment records.')
          const amountMinor=Math.round(number(body.amount,'recorded amount')*100),current=await documentView(row)
          if(!amountMinor||amountMinor>Math.round(current.balance*100))fail(400,'Recorded amount must be positive and no more than the balance.')
          const paidDate=date(body.paidDate,'payment date',true),reference=text(body.reference,'payment reference',200)
          await db.prepare('INSERT INTO payment_records VALUES (?,?,?,?,?,?)').run(randomUUID(),id,amountMinor,paidDate,reference,user.id)
          await audit(user.id,'record_offline_payment',id)
          return documentView(row)
        })
        return responseJson(response,201,updated)
      }
      fail(404,'Not found.')
    } catch (error) {
      // Do not log request bodies, passwords, cookies, OAuth tokens, or setup grants.
      const status = error.status || 500
      if (status === 500) console.error('Portal request failed:', error.code || error.name)
      responseJson(response,status,{error:status === 500 ? 'The request could not be completed.' : error.message})
    }
  })
  server.requestTimeout = 15000
  server.headersTimeout = 10000
  return { server, databaseReadiness:db.readiness, close:async () => { if(server.listening)await new Promise((resolve,reject) => server.close(error => error ? reject(error) : resolve())); await weeklySessions.close(); await nomod.close(); await courses.close(); await db.close() } }
}
