import test from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync,verify,createHash} from 'node:crypto'
import {createGA4Reporting} from './ga4-reporting.mjs'
import {createPortalServer} from './app.mjs'
import {createSqliteStore} from './sqlite-store.mjs'
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),pem=privateKey.export({type:'pkcs8',format:'pem'}),email='reporting-fixture@synthetic-project.iam.gserviceaccount.com'
const env={ASCORE_GA4_PROPERTY_ID:'123456789',ASCORE_GA4_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:email,private_key:pem,token_uri:'https://untrusted.test/must-be-ignored'})}
const report=(metrics,values,dimensions=[],rows=[])=>({metricHeaders:metrics.map(name=>({name,type:'TYPE_INTEGER'})),dimensionHeaders:dimensions.map(name=>({name})),rows:values?[{metricValues:values.map(value=>({value:String(value)}))}]:rows,rowCount:values?1:rows.length,metadata:{timeZone:'Asia/Dubai'}})
function fixture(extra={}){
 let clock=Date.now();const calls=[]
 const fetcher=async(url,options)=>{
  calls.push({url,...options})
  if(url==='https://oauth2.googleapis.com/token'){
   const params=new URLSearchParams(options.body),assertion=params.get('assertion'),[head,body,signature]=assertion.split('.'),claims=JSON.parse(Buffer.from(body,'base64url'))
   assert.equal(claims.scope,'https://www.googleapis.com/auth/analytics.readonly');assert.equal(claims.iss,email);assert.equal(claims.aud,url);assert.equal(claims.exp-claims.iat,3600);assert.ok(verify('RSA-SHA256',Buffer.from(head+'.'+body),publicKey,Buffer.from(signature,'base64url')))
   return Response.json({access_token:'synthetic-secret-token',expires_in:3600,token_type:'Bearer'})
  }
  assert.ok(url.startsWith('https://analyticsdata.googleapis.com/v1beta/properties/123456789:'));assert.equal(options.headers.Authorization,'Bearer synthetic-secret-token');assert.equal(options.redirect,'error')
  const body=JSON.parse(options.body)
  if(url.endsWith(':runRealtimeReport'))return Response.json(report(['activeUsers'],[7]))
  assert.equal(body.dimensionFilter.filter.fieldName,'hostName');assert.equal(body.dimensionFilter.filter.stringFilter.value,'ascore.ae')
  if(body.dimensions?.[0]?.name==='date')return Response.json(report(['sessions','activeUsers','screenPageViews'],null,['date'],[{dimensionValues:[{value:'20261007'}],metricValues:[{value:'13'},{value:'10'},{value:'25'}]}]))
  if(body.dimensions?.[0]?.name==='deviceCategory'||body.dimensions?.[0]?.name==='country')return Response.json(report(['sessions'],null,[body.dimensions[0].name],[{dimensionValues:[{value:body.dimensions[0].name==='country'?'United Arab Emirates':'mobile'}],metricValues:[{value:'13'}]}]))
  if(body.dimensions)return Response.json(report(['sessions'],null,['sessionSource','sessionMedium'],[{dimensionValues:[{value:'google'},{value:'organic'}],metricValues:[{value:'8'}]},{dimensionValues:[{value:'(direct)'},{value:'(none)'}],metricValues:[{value:'5'}]}]))
  return Response.json(report(['activeUsers','sessions','screenPageViews'],[10,13,25]))
 }
 const service=createGA4Reporting({env:{...env,...extra.env},fetcher:extra.fetcher||fetcher,now:()=>clock})
 return {service,calls,advance:n=>{clock+=n}}
}
test('GA4 uses only fixed read APIs, readonly signed credentials and real provider metrics, with independently cached totals',async()=>{
 const h=fixture(),[a,b]=await Promise.all([h.service.read('today'),h.service.read('today')]);assert.deepEqual(a,b);assert.equal(h.calls.length,7);assert.equal(a.realtime.activeUsers,7);assert.equal(a.realtime.windowMinutes,30);assert.equal(a.history.activeUsers,10);assert.equal(a.history.sessions,13);assert.equal(a.history.pageViews,25);assert.equal(a.history.timeZone,'Asia/Dubai');assert.equal(a.history.sources[0].sessions,8);assert.equal(a.history.available,true);assert.deepEqual(a.history.daily,[{date:'2026-10-07',sessions:13,activeUsers:10,pageViews:25}]);assert.equal(a.history.devices[0].label,'mobile');assert.equal(a.history.countries[0].sessions,13)
 const output=JSON.stringify(a);for(const secret of [email,pem,'synthetic-secret-token','123456789'])assert.ok(!output.includes(secret))
 await h.service.read('today');assert.equal(h.calls.length,7);await h.service.read('yesterday');assert.equal(h.calls.length,12)
 assert.deepEqual(JSON.parse(h.calls.find(c=>c.body?.includes('yesterday')).body).dateRanges,[{startDate:'yesterday',endDate:'yesterday'}])
 for(const [range,start]of [['7days','6daysAgo'],['30days','29daysAgo']]){await h.service.read(range);const call=h.calls.find(c=>c.body?.includes(start));assert.deepEqual(JSON.parse(call.body).dateRanges,[{startDate:start,endDate:'today'}])}
 h.advance(31000);await h.service.read('today');assert.equal(h.calls.filter(c=>c.url.endsWith(':runRealtimeReport')).length,2);assert.equal(h.calls.filter(c=>c.url==='https://oauth2.googleapis.com/token').length,1)
})
test('missing/invalid property or credentials perform no reads and never present fabricated zeroes',async()=>{
 for(const invalid of [{ASCORE_GA4_PROPERTY_ID:''},{ASCORE_GA4_PROPERTY_ID:'G-MX800C01N9'},{ASCORE_GA4_PROPERTY_ID:'123/other'},{ASCORE_GA4_SERVICE_ACCOUNT_JSON:''},{ASCORE_GA4_SERVICE_ACCOUNT_JSON:'{"private_key":"bad"}'}]){const h=fixture({env:invalid}),r=await h.service.read();assert.equal(r.configured,false);assert.equal(r.realtime,null);assert.equal(r.history,null);assert.equal(h.calls.length,0)}
 const h=fixture();for(const range of ['../../admin','forever','TODAY',null])await assert.rejects(h.service.read(range),{status:400});assert.equal(h.calls.length,0)
})
test('valid empty GA reports are zero; malformed, unavailable and quota responses stay errors without leaking secrets',async()=>{
 const token=()=>Response.json({access_token:'synthetic-secret-token',expires_in:3600})
 const empty=fixture({fetcher:async(url,options)=>{if(url.includes('/token'))return token();const q=JSON.parse(options.body);return Response.json(report(q.metrics.map(m=>m.name),null,q.dimensions?.map(d=>d.name)||[],[]))}});const r=await empty.service.read();assert.equal(r.realtime.activeUsers,0);assert.equal(r.history.sessions,0);assert.deepEqual(r.history.sources,[])
 for(const bad of [{},report(['wrong'],[1]),report(['activeUsers'],['-1'])]){const h=fixture({fetcher:async url=>url.includes('/token')?token():Response.json(bad)});await assert.rejects(h.service.read(),{status:502})}
 for(const status of [401,403,429,500]){const h=fixture({fetcher:async()=>new Response('private provider error '+pem,{status})});await assert.rejects(h.service.read(),e=>[502,503].includes(e.status)&&!e.message.includes('private provider'))}
 const h=fixture({fetcher:async()=>Response.json({padding:'x'.repeat(270000)})});await assert.rejects(h.service.read(),{status:502})
})
test('real HTTP reports require agency session and accept only a whitelisted date range',async t=>{
 const origin='https://ascore.test',activation='synthetic-ga4-activation',h=fixture(),config={...env,ASCORE_ORIGIN:origin,ASCORE_ALLOW_ADMIN_SETUP:'1',ASCORE_ADMIN_SETUP_GRANTS:JSON.stringify({aswinfrn:{tokenHash:createHash('sha256').update(activation).digest('hex'),expiresAt:new Date(Date.now()+60000).toISOString()}})}
 const app=await createPortalServer({store:createSqliteStore(),env:config,ga4Fetch:async(url,options)=>{return await (async()=>{h.calls.push(url);if(url.includes('/token'))return Response.json({access_token:'synthetic-token',expires_in:3600});const q=JSON.parse(options.body);return Response.json(report(q.metrics.map(m=>m.name),q.dimensions?null:q.metrics.map(()=>1),q.dimensions?.map(d=>d.name)||[],[]))})()}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`
 const request=async(path,body,cookie)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 assert.equal((await request('/api/analytics/ga4')).status,401)
 const client=await request('/api/auth/register',{username:'fixture_client',name:'Fixture client',email:'client@example.test',password:'Synthetic isolated password'});assert.equal(client.status,201);assert.equal((await request('/api/analytics/ga4',null,client.cookie)).status,403)
 const owner=await request('/api/auth/admin-setup',{username:'aswinfrn',name:'Fixture owner',password:'Synthetic isolated password',setupToken:activation});assert.equal((await request('/api/analytics/ga4?range=invalid',null,owner.cookie)).status,400);assert.equal((await request('/api/analytics/ga4?range=today&key=injected',null,owner.cookie)).status,400);assert.equal(h.calls.length,0)
 const r=await request('/api/analytics/ga4?range=today',null,owner.cookie);assert.equal(r.status,200);assert.equal(r.data.connected,true);assert.equal(r.data.realtime.activeUsers,1)
})
test('Google headerless empty aggregates are accepted only with the expected method and no data',async()=>{
 const token=()=>Response.json({access_token:'synthetic-secret-token',expires_in:3600})
 const fetcher=totals=>async(url,options)=>{
  if(url.includes('/token'))return token()
  const q=JSON.parse(options.body)
  if(url.endsWith(':runRealtimeReport'))return Response.json(report(['activeUsers'],[1]))
  if(q.dimensions)return Response.json({metricHeaders:[{name:'sessions',type:'TYPE_INTEGER'}],dimensionHeaders:[{name:'sessionSource'},{name:'sessionMedium'}],kind:'analyticsData#runReport',metadata:{timeZone:'Asia/Dubai'}})
  return Response.json(totals)
 }
 const empty={kind:'analyticsData#runReport',metadata:{currencyCode:'USD',timeZone:'Asia/Dubai'},propertyQuota:{}}
 for(const totals of [empty,{...empty,metricHeaders:[],dimensionHeaders:[],rows:[],rowCount:0}]){
  const r=await fixture({fetcher:fetcher(totals)}).service.read()
  assert.equal(r.connected,true);assert.equal(r.realtime.activeUsers,1);assert.equal(r.history.activeUsers,0);assert.equal(r.history.sessions,0);assert.equal(r.history.pageViews,0);assert.equal(r.history.timeZone,'Asia/Dubai');assert.deepEqual(r.history.sources,[])
 }
 for(const bad of [{},{...empty,kind:'analyticsData#runRealtimeReport'},{...empty,rowCount:1},{...empty,rows:[{metricValues:[{value:'1'}]}]},{...empty,rows:{}},{...empty,metricHeaders:[{name:'wrong'}]}])await assert.rejects(fixture({fetcher:fetcher(bad)}).service.read(),{status:502})
 const allEmpty=fixture({fetcher:async(url)=>url.includes('/token')?token():Response.json({kind:url.endsWith(':runRealtimeReport')?'analyticsData#runRealtimeReport':'analyticsData#runReport'})})
 assert.equal((await allEmpty.service.read()).realtime.activeUsers,0)
 const wrongRealtime=fixture({fetcher:async(url)=>url.includes('/token')?token():Response.json(empty)})
 await assert.rejects(wrongRealtime.service.read(),{status:502})
})
