import { existsSync,lstatSync, readFileSync } from 'node:fs'

export const CRM_ORG_ID='7476792000000020005'
export const CRM_ORIGIN='https://www.zohoapis.com'
export const ACCOUNTS_ORIGIN='https://accounts.zoho.com'
export const ENQUIRY_SCOPES=['ZohoCRM.org.READ','ZohoCRM.settings.fields.READ','ZohoCRM.settings.layouts.READ','ZohoCRM.modules.leads.CREATE','ZohoCRM.modules.leads.READ']

export function readPrivateJson(path){
 const stat=lstatSync(path)
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||(process.getuid&&stat.uid!==process.getuid()))throw Error('Credential file must be an owner-only regular file.')
 return JSON.parse(readFileSync(path,'utf8'))
}
// No grant creation here. Refresh only runs when the separate delivery flag is enabled.
export function createCrmTokenProvider({credentials,fetcher=fetch,now=Date.now}){
 if(credentials.organizationId!==CRM_ORG_ID||credentials.apiOrigin!==CRM_ORIGIN||credentials.accountsOrigin!==ACCOUNTS_ORIGIN||!credentials.clientId||!credentials.clientSecret||!credentials.refreshToken)throw Error('Approved Ascore CRM credentials are incomplete or mismatched.')
 let cached=null,expires=0,pending=null
 return async()=>{
  if(cached&&now()<expires)return cached
  if(pending)return pending
  pending=(async()=>{
   const response=await fetcher(`${ACCOUNTS_ORIGIN}/oauth/v2/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:credentials.refreshToken}),signal:AbortSignal.timeout(10000),redirect:'error'})
   const result=await response.json()
   if(!response.ok||!result.access_token||result.error||result.api_domain!==CRM_ORIGIN)throw Error('Approved CRM access could not be refreshed.')
   cached=result.access_token;expires=now()+Math.max(0,Math.min(Number(result.expires_in)||3600,3600)-120)*1000
   return cached
  })()
  try{return await pending}finally{pending=null}
 }
}

// Production secrets come only from Hostinger's private runtime environment.
export function deliveryCredentials(env){
 if(env.ASCORE_ENABLE_ENQUIRY_DELIVERY!=='1')return {}
 const production=env.NODE_ENV==='production'
 let crm,smtp
 if(env.ZOHO_CRM_CLIENT_ID||env.ZOHO_CRM_CLIENT_SECRET||env.ZOHO_CRM_REFRESH_TOKEN){
  crm={clientId:env.ZOHO_CRM_CLIENT_ID,clientSecret:env.ZOHO_CRM_CLIENT_SECRET,refreshToken:env.ZOHO_CRM_REFRESH_TOKEN,organizationId:env.ZOHO_CRM_ORGANIZATION_ID,apiOrigin:env.ZOHO_API_ORIGIN,accountsOrigin:env.ZOHO_ACCOUNTS_ORIGIN}
 }else if(!production){const path=env.ASCORE_ZOHO_CREDENTIALS_PATH||'server/data/zoho-credentials.json';if(existsSync(path))crm=readPrivateJson(path)}
 if(env.SMTP_PASSWORD||env.SMTP_USER||env.SMTP_HOST){smtp={host:env.SMTP_HOST,port:Number(env.SMTP_PORT),user:env.SMTP_USER,password:env.SMTP_PASSWORD}}
 else if(!production){const path=env.ASCORE_SMTP_CREDENTIALS_PATH||'server/data/smtp-credentials.json';if(existsSync(path))smtp=readPrivateJson(path)}
 if(crm)createCrmTokenProvider({credentials:crm})
 if(smtp&&(smtp.host!=='smtp.hostinger.com'||smtp.port!==465||smtp.user!=='info@ascore.ae'||!smtp.password))throw Error('Approved Ascore SMTP credentials are incomplete or mismatched.')
 if(production&&(!crm||!smtp))throw Error('Production enquiry delivery requires approved server-only CRM and SMTP environment credentials.')
 return {crm,smtp}
}
