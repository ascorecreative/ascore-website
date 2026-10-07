import {createPrivateKey,sign} from 'node:crypto'

const scope='https://www.googleapis.com/auth/analytics.readonly'
const tokenURL='https://oauth2.googleapis.com/token'
const ranges={today:{startDate:'today',endDate:'today'},yesterday:{startDate:'yesterday',endDate:'yesterday'},'7days':{startDate:'6daysAgo',endDate:'today'},'30days':{startDate:'29daysAgo',endDate:'today'}}
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
const number=value=>{if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))fail(502,'Google returned an invalid report metric.');return Number(value)}
const label=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160):''
function validReport(value,metrics,dimensions=[],kind='analyticsData#runReport'){
 // Google omits default-valued fields, including headers, for some empty reports.
 // Require the provider's method marker and no data before accepting that shape.
 const empty=field=>field===undefined||Array.isArray(field)&&field.length===0
 if(value?.kind===kind&&empty(value.metricHeaders)&&empty(value.dimensionHeaders)&&empty(value.rows)&&(value.rowCount===undefined||value.rowCount===0))return
 if(!value||!Array.isArray(value.metricHeaders)||value.metricHeaders.map(header=>header.name).join(',')!==metrics.join(',')||dimensions.length&&(!Array.isArray(value.dimensionHeaders)||value.dimensionHeaders.map(header=>header.name).join(',')!==dimensions.join(','))||value.rows!==undefined&&!Array.isArray(value.rows))fail(502,'Google returned an invalid report shape.')
}

// Aggregate read-only reporting. No Measurement Protocol, admin changes,
// browser credentials, customer dimensions or invented fallback values.
export function createGA4Reporting({env={},fetcher=fetch,now=Date.now}){
 const property=env.ASCORE_GA4_PROPERTY_ID||''
 let credentials,key,token=null,tokenFlight=null
 const cache=new Map(),flights=new Map()
 try{credentials=JSON.parse(env.ASCORE_GA4_SERVICE_ACCOUNT_JSON||'null');if(credentials?.type!=='service_account'||! /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(credentials.client_email)||typeof credentials.private_key!=='string')throw Error();key=createPrivateKey(credentials.private_key);if(key.asymmetricKeyType!=='rsa')throw Error()}catch{credentials=null;key=null}
 const status=()=>({configured:/^[1-9]\d{0,19}$/.test(property)&&!!key,propertyConfigured:/^[1-9]\d{0,19}$/.test(property),credentialsConfigured:!!key,authentication:'service_account',readOnly:true})
 async function request(url,options){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000)
  try{
   const response=await fetcher(url,{...options,signal:controller.signal,redirect:'error'})
   if(!response.ok){if([401,403].includes(response.status))fail(502,'Google denied reporting access. Verify the service account Viewer permission and enabled Analytics Data API.');if(response.status===429)fail(503,'Google reporting quota is temporarily exhausted. Try again later.');fail(502,'Google reporting is temporarily unavailable.')}
   const parts=[];let size=0;for await(const chunk of response.body||[]){size+=chunk.byteLength;if(size>262144){controller.abort();fail(502,'Google returned an oversized report.')}parts.push(Buffer.from(chunk))}
   return JSON.parse(Buffer.concat(parts).toString('utf8'))
  }catch(error){if(error.status)throw error;fail(502,'Google reporting failed or timed out.')}finally{clearTimeout(timer)}
 }
 async function accessToken(){
  if(token&&token.expires>now()+60000)return token.value
  if(tokenFlight)return tokenFlight
  const task=(async()=>{
   const time=Math.floor(now()/1000),input=encoded({alg:'RS256',typ:'JWT'})+'.'+encoded({iss:credentials.client_email,scope,aud:tokenURL,iat:time,exp:time+3600})
   const assertion=input+'.'+sign('RSA-SHA256',Buffer.from(input),key).toString('base64url')
   const data=await request(tokenURL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString()})
   if(typeof data.access_token!=='string'||data.access_token.length>8192||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0)fail(502,'Google did not return a valid reporting credential.')
   token={value:data.access_token,expires:now()+Math.min(data.expires_in,3600)*1000};return token.value
  })();tokenFlight=task;try{return await task}finally{tokenFlight=null}
 }
 async function report(method,body){const bearer=await accessToken();return request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:${method}`,{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify(body)})}
 async function cached(id,ttl,load){
  const old=cache.get(id);if(old&&now()-old.at<ttl)return old.value
  if(flights.has(id))return flights.get(id)
  const task=(async()=>{const value=await load();cache.set(id,{at:now(),value});return value})();flights.set(id,task);try{return await task}finally{flights.delete(id)}
 }
 async function read(range='today'){
  if(!Object.hasOwn(ranges,range))fail(400,'Choose Today, Yesterday, 7 days or 30 days.')
  if(!status().configured)return {...status(),range,realtime:null,history:null}
  const [realtime,history]=await Promise.all([
   cached('realtime',30000,async()=>{
    const value=await report('runRealtimeReport',{metrics:[{name:'activeUsers'}],minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],returnPropertyQuota:true})
    validReport(value,['activeUsers'],[],'analyticsData#runRealtimeReport')
    if(value.rows?.length>1)fail(502,'Google returned an unexpected realtime report.')
    const current=await report('runRealtimeReport',{metrics:[{name:'activeUsers'}],minuteRanges:[{startMinutesAgo:4,endMinutesAgo:0}],returnPropertyQuota:true})
    validReport(current,['activeUsers'],[],'analyticsData#runRealtimeReport')
    if(current.rows?.length>1)fail(502,'Google returned an unexpected realtime report.')
    return {activeUsers:value.rows?.length?number(value.rows[0].metricValues?.[0]?.value):0,activeUsersNow:current.rows?.length?number(current.rows[0].metricValues?.[0]?.value):0,nowWindowMinutes:5,windowMinutes:30,fetchedAt:now(),scope:'GA4 property'}
   }),
   cached(range,120000,async()=>{
    const base={dateRanges:[ranges[range]],dimensionFilter:{filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:'ascore.ae',caseSensitive:false}}},returnPropertyQuota:true}
    const [totals,sources]=await Promise.all([
     report('runReport',{...base,metrics:[{name:'activeUsers'},{name:'sessions'},{name:'screenPageViews'}]}),
     report('runReport',{...base,dimensions:[{name:'sessionSource'},{name:'sessionMedium'}],metrics:[{name:'sessions'}],orderBys:[{metric:{metricName:'sessions'},desc:true}],limit:10})
    ])
    validReport(totals,['activeUsers','sessions','screenPageViews']);validReport(sources,['sessions'],['sessionSource','sessionMedium'])
    if(totals.rows?.length>1||sources.rows?.length>10)fail(502,'Google returned an unexpected traffic report.')
    // Keep totals available if a separate chart report is temporarily unavailable.
    let charts={daily:[],devices:[],countries:[],available:false}
    try{
     const [daily,devices,countries]=await Promise.all([
      report('runReport',{...base,dimensions:[{name:'date'}],metrics:[{name:'sessions'},{name:'activeUsers'},{name:'screenPageViews'}],orderBys:[{dimension:{dimensionName:'date'}}],limit:31}),
      report('runReport',{...base,dimensions:[{name:'deviceCategory'}],metrics:[{name:'sessions'}],orderBys:[{metric:{metricName:'sessions'},desc:true}],limit:10}),
      report('runReport',{...base,dimensions:[{name:'country'}],metrics:[{name:'sessions'}],orderBys:[{metric:{metricName:'sessions'},desc:true}],limit:10})
     ])
     validReport(daily,['sessions','activeUsers','screenPageViews'],['date']);validReport(devices,['sessions'],['deviceCategory']);validReport(countries,['sessions'],['country'])
     if(daily.rows?.length>31||devices.rows?.length>10||countries.rows?.length>10)fail(502,'Google returned an unexpected chart report.')
     const dailyRows=(daily.rows||[]).map(row=>{const date=row.dimensionValues?.[0]?.value;if(typeof date!=='string'||!/^\d{8}$/.test(date))fail(502,'Google returned an invalid chart date.');return {date:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6),sessions:number(row.metricValues?.[0]?.value),activeUsers:number(row.metricValues?.[1]?.value),pageViews:number(row.metricValues?.[2]?.value)}})
     const rows=report=>(report.rows||[]).map(row=>({label:label(row.dimensionValues?.[0]?.value)||'(not set)',sessions:number(row.metricValues?.[0]?.value)}))
     charts={daily:dailyRows,devices:rows(devices),countries:rows(countries),available:true,thresholded:[daily,devices,countries].some(r=>r.metadata?.subjectToThresholding===true),otherRow:[devices,countries].some(r=>r.metadata?.dataLossFromOtherRow===true)}
    }catch{charts.error='Detailed Google charts are temporarily unavailable. Refresh to try again.'}
    let locations={locations:[],locationsAvailable:false}
    try{
     const value=await report('runReport',{...base,dimensions:[{name:'country'},{name:'region'},{name:'city'}],metrics:[{name:'sessions'},{name:'activeUsers'}],orderBys:[{metric:{metricName:'sessions'},desc:true}],limit:25})
     validReport(value,['sessions','activeUsers'],['country','region','city'])
     if(value.rows?.length>25)fail(502,'Google returned an unexpected location report.')
     locations={locations:(value.rows||[]).map(r=>({country:label(r.dimensionValues?.[0]?.value),region:label(r.dimensionValues?.[1]?.value),city:label(r.dimensionValues?.[2]?.value),sessions:number(r.metricValues?.[0]?.value),activeUsers:number(r.metricValues?.[1]?.value)})),locationsAvailable:true,locationsThresholded:value.metadata?.subjectToThresholding===true,locationsOtherRow:value.metadata?.dataLossFromOtherRow===true}
    }catch{locations.locationError='Google location reports are temporarily unavailable. Refresh to try again.'}
    const values=totals.rows?.[0]?.metricValues
    return {...charts,...locations,activeUsers:values?number(values[0]?.value):0,sessions:values?number(values[1]?.value):0,pageViews:values?number(values[2]?.value):0,sources:(sources.rows||[]).map(row=>({source:label(row.dimensionValues?.[0]?.value),medium:label(row.dimensionValues?.[1]?.value),sessions:number(row.metricValues?.[0]?.value)})),sourceRowCount:Number.isSafeInteger(sources.rowCount)?sources.rowCount:0,timeZone:label(totals.metadata?.timeZone)||'GA4 property timezone',thresholded:charts.thresholded===true||totals.metadata?.subjectToThresholding===true||sources.metadata?.subjectToThresholding===true,otherRow:charts.otherRow===true||sources.metadata?.dataLossFromOtherRow===true,fetchedAt:now(),hostname:'ascore.ae',dateRange:ranges[range]}
   })
  ])
  return {...status(),connected:true,range,realtime,history}
 }
 return {status,read,async handle(req,res,path,user,json){
  if(path!=='/api/analytics/ga4')return false
  if(user?.role!=='admin')fail(403,'Agency access is required.')
  if(req.method!=='GET')fail(405,'Method not allowed.')
  const query=new URL(req.url,'http://local.invalid').searchParams
  if([...query.keys()].some(name=>name!=='range')||query.getAll('range').length>1)fail(400,'Only the report date range is accepted.')
  json(res,200,await read(query.get('range')||'today'));return true
 }}
}
