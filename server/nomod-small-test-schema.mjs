import {verifyPaymentSchema} from './payment-schema.mjs'
import {smallNomodRequestId,smallNomodReason} from './nomod-private-test.mjs'

const application='ascore-nomod-small-test'
export const smallTestTables=['course_private_nomod_tests']
export async function verifySmallTestOwnership(db){
 const initializing=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,0)
 const complete=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,1)
 if(!initializing&&!complete)throw Error('Existing private test table has no verified ownership marker.')
}
export async function verifySmallTestSchema(db){
 await verifyPaymentSchema(db)
 await db.prepare('SELECT id,request_id,total_minor,provider_id,delivery FROM course_private_nomod_tests LIMIT 1').get()
 if(db.kind==='mariadb'&&!await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,1))throw Error('Private test schema ownership is unverified.')
}
export async function initializeSmallTestSchema(db,env={}){
 await verifyPaymentSchema(db)
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_NOMOD_SMALL_TEST!=='1')throw Error('Private AED 2 test setup is disabled.')
  const exists=await db.prepare('SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND TABLE_NAME=?').get('course_private_nomod_tests')
  const marker=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=?').get(application)
  if(exists&&!marker)throw Error('Existing private test table has no ownership marker.')
  if(!marker)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run(application,0,Date.now())
 }
 // A separate finite test ledger cannot become a customer order or grant a PDF.
 await db.exec(`CREATE TABLE IF NOT EXISTS course_private_nomod_tests (id VARCHAR(36) PRIMARY KEY, request_id VARCHAR(36) NOT NULL UNIQUE CHECK(request_id='${smallNomodRequestId}'), payload_hash CHAR(64) NOT NULL, email VARCHAR(254) NOT NULL CHECK(email=''), items TEXT NOT NULL, total_minor INTEGER NOT NULL CHECK(total_minor=200), currency CHAR(3) NOT NULL CHECK(currency='AED'), secret CHAR(64) NOT NULL, provider_id VARCHAR(36) UNIQUE, provider_url TEXT, payment_status VARCHAR(24) NOT NULL CHECK(payment_status='review'), created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, provider_checked_at BIGINT NOT NULL, delivery TEXT NOT NULL, review_reason VARCHAR(120) NOT NULL CHECK(review_reason='${smallNomodReason}'))${db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''}`)
 if(db.kind==='mariadb'&&!await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,1))await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run(application,1,Date.now())
 await verifySmallTestSchema(db)
}
