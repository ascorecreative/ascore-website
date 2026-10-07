import {initializePaymentSchema,verifyPaymentSchema} from './payment-schema.mjs'
import {verifyDatabaseIdentity} from './database-preflight.mjs'
import {verifyMariaDbSchema} from './mariadb-schema.mjs'

const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
export function createPaymentSetup({db,env,readJson,audit,isSchemaReady,onReady,flag='ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP',application='ascore-payments',endpoint='/api/courses/admin/payments/setup',initialize=initializePaymentSchema,verify=verifyPaymentSchema}){
 let flight=null
 const runtime=()=>db.kind==='mariadb'&&db.readiness?.identityVerified===true&&db.readiness?.schemaVersion===1
 const closed=()=>env.ASCORE_ENABLE_PAID_COURSES!=='1'&&env.ASCORE_ENABLE_FREE_COURSES!=='1'
 const state=user=>({allowed:!isSchemaReady()&&user?.role==='admin'&&user?.username==='aswinfrn'&&env[flag]==='1'&&closed()&&runtime(),inProgress:!!flight,reason:isSchemaReady()?'already_initialized':user?.username!=='aswinfrn'?'owner_required':env[flag]!=='1'?'operator_flag_required':!closed()?'checkout_must_be_disabled':!runtime()?'runtime_not_verified':'ready'})
 async function setup(user){
  if(user?.role!=='admin'||user.username!=='aswinfrn')fail(403,'Payment setup is restricted to the approved aswinfrn administrator.')
  if(env[flag]!=='1')fail(403,'The operator must enable the temporary payment schema setup flag.')
  if(!closed())fail(403,'Keep paid and public zero-payment checkout disabled while initializing payment tables.')
  if(!runtime())fail(503,'The approved production database is not verified. No setup was performed.')
  if(flight)return flight
  const task=(async()=>{
   try{await verifyDatabaseIdentity(db,env);await verifyMariaDbSchema(db)}catch{fail(503,'The approved application database could not be verified. No setup was performed.')}
   if(isSchemaReady()){await verify(db);return {schemaReady:true,initialized:false}}
   await audit(user.id,'payment_schema_setup_started',application)
   try{
    await initialize(db,env);await verify(db);onReady(true)
    await audit(user.id,'payment_schema_setup_completed',application)
    return {schemaReady:true,initialized:true}
   }catch{
    try{await verify(db);onReady(true)}catch{onReady(false)}
    await audit(user.id,'payment_schema_setup_needs_review',application)
    fail(409,'Payment setup needs review. DDL may have partially completed; refresh readiness before retrying.')
   }
  })();flight=task;try{return await task}finally{if(flight===task)flight=null}
 }
 return {state,async handle(req,res,path,user,json){
  if(path!==endpoint)return false
  if(req.method!=='POST')fail(405,'Method not allowed.')
  const body=await readJson(req)
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length)fail(400,'Setup accepts no SQL, database, path or configuration values.')
  json(res,200,await setup(user));return true
 }}
}
