// Run locally in a private terminal after the user approves the exact access below.
// No credentials in arguments, URLs, stdout, source files, VITE variables or Git.
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { mkdirSync, lstatSync, existsSync, writeFileSync } from 'node:fs'
import { CRM_ORIGIN, CRM_ORG_ID, ACCOUNTS_ORIGIN, ENQUIRY_SCOPES } from './credentials.mjs'

const kind=process.argv[2]
if(!['crm','smtp'].includes(kind)){
 console.log('Private setup: node server/setup-credentials.mjs crm|smtp\nRequires explicit local approval before grant exchange or SMTP authentication. Delivery stays disabled. Secrets are entered privately in the terminal; never paste them into chat.')
 process.exit(0)
}
if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('Use a private interactive terminal, not redirected input or an assistant tool call.')
let muted=false
const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk,encoding);callback()}})
const rl=createInterface({input:process.stdin,output,terminal:true})
async function ask(label,secret=false){process.stdout.write(label);muted=secret;try{const answer=(await rl.question('')).trim();if(secret)process.stdout.write('\n');if(!answer||answer.length>4096||/[\r\n\u0000-\u001f]/.test(answer))throw Error('Invalid input.');return answer}finally{muted=false}}
function ensureDestination(file){mkdirSync('server/data',{recursive:true,mode:0o700});const stat=lstatSync('server/data');if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||(process.getuid&&stat.uid!==process.getuid()))throw Error('server/data must be an owner-only directory.');if(existsSync(file))throw Error('Credential file already exists. Review existing access before replacing it.')}
try{
 const file=kind==='crm'?'server/data/zoho-credentials.json':'server/data/smtp-credentials.json'
 console.log(kind==='crm'?`Destination: Ascore production CRM org ${CRM_ORG_ID}, ${CRM_ORIGIN}.\nScopes: ${ENQUIRY_SCOPES.join(',')}\nThis creates ongoing refresh access until revoked, storing client secret and refresh token owner-only in ${file}. No records will be written.\nAt https://api-console.zoho.com/ create a separate Self Client for this website and generate a grant with exactly these scopes. No redirect URI is needed.`:`Destination: Hostinger SMTP smtp.hostinger.com:465 TLS, mailbox info@ascore.ae.\nFirst verify info@ascore.ae is a mailbox that can sign in to SMTP in the correct Hostinger order. If it is only an alias, stop and agree its authenticated sender before setup.\nThis stores the mailbox password owner-only in ${file} for ongoing website email to info@ascore.ae. Only authentication is tested now; no email is sent.`)
 const approval=await ask('Type APPROVE ONGOING ACCESS to continue: ')
 if(approval!=='APPROVE ONGOING ACCESS')throw Error('Approval was not provided; no credential action performed.')
 ensureDestination(file)
 let credentials
 if(kind==='crm'){
  const clientId=await ask('Client ID (hidden): ',true),clientSecret=await ask('Client secret (hidden): ',true),code=await ask('One-time grant code (hidden): ',true)
  const response=await fetch(`${ACCOUNTS_ORIGIN}/oauth/v2/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,code}),redirect:'error',signal:AbortSignal.timeout(10000)})
  const result=await response.json()
  if(!response.ok||!result.refresh_token||!result.access_token||result.api_domain!==CRM_ORIGIN||result.error)throw Error('Grant exchange was not confirmed. Check the console privately; do not paste credentials or the response into chat.')
  const org=await fetch(`${CRM_ORIGIN}/crm/v8/org`,{headers:{Authorization:`Zoho-oauthtoken ${result.access_token}`},redirect:'error',signal:AbortSignal.timeout(10000)})
  const data=await org.json()
  if(!org.ok||data.org?.[0]?.id!==CRM_ORG_ID)throw Error('CRM organization does not match the approved Ascore organization. Review/revoke this grant privately in Zoho before continuing.')
  credentials={clientId,clientSecret,refreshToken:result.refresh_token,apiOrigin:CRM_ORIGIN,accountsOrigin:ACCOUNTS_ORIGIN,organizationId:CRM_ORG_ID,approvedScopes:ENQUIRY_SCOPES,createdAt:new Date().toISOString()}
 }else{
  const password=await ask('info@ascore.ae SMTP password (hidden): ',true)
  const {default:nodemailer}=await import('nodemailer')
  const transport=nodemailer.createTransport({host:'smtp.hostinger.com',port:465,secure:true,auth:{user:'info@ascore.ae',pass:password},tls:{minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,logger:false,debug:false})
  try{await transport.verify()}finally{transport.close()}
  credentials={host:'smtp.hostinger.com',port:465,user:'info@ascore.ae',password,createdAt:new Date().toISOString()}
 }
 writeFileSync(file,JSON.stringify(credentials,null,2)+'\n',{mode:0o600,flag:'wx'})
 console.log(`Verified and saved owner-only credentials to ${file}. Delivery remains disabled. Enable ASCORE_ENABLE_ENQUIRY_DELIVERY=1 only after the approved marked test is ready; then restart the API. No enquiry, email or CRM record was created by setup.`)
}catch{console.error('Setup did not complete. Review the private console/credentials locally. No enquiry delivery was enabled. If a CRM grant exchange occurred, review/revoke that grant in Zoho before retrying.');process.exitCode=1}
finally{rl.close()}
