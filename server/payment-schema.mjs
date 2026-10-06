export const paymentTables=['course_paid_orders','course_paid_downloads','course_payment_events','course_payment_limits']
const columns={
 course_paid_orders:`id VARCHAR(36) PRIMARY KEY, request_id VARCHAR(36) NOT NULL UNIQUE, payload_hash CHAR(64) NOT NULL, email VARCHAR(254) NOT NULL, items TEXT NOT NULL, total_minor INTEGER NOT NULL CHECK(total_minor IN (5000,10000)), currency CHAR(3) NOT NULL CHECK(currency='AED'), secret CHAR(64) NOT NULL, provider_id VARCHAR(36) UNIQUE, provider_url TEXT, payment_status VARCHAR(24) NOT NULL, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, provider_checked_at BIGINT NOT NULL, delivery TEXT NOT NULL, review_reason VARCHAR(120)`,
 course_paid_downloads:`order_id VARCHAR(36) NOT NULL, course_id VARCHAR(16) NOT NULL, uses INTEGER NOT NULL, PRIMARY KEY(order_id,course_id), FOREIGN KEY(order_id) REFERENCES course_paid_orders(id)`,
 course_payment_events:`event_id VARCHAR(100) PRIMARY KEY, svix_id VARCHAR(100) NOT NULL UNIQUE, payload_hash CHAR(64) NOT NULL, event_type VARCHAR(64) NOT NULL, charge_id VARCHAR(36), received_at BIGINT NOT NULL, state VARCHAR(24) NOT NULL, reason VARCHAR(120)`,
 course_payment_limits:'`key` VARCHAR(96) PRIMARY KEY, count INTEGER NOT NULL, expires BIGINT NOT NULL'
}
export async function verifyPaymentOwnership(db){
 const initializing=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',0)
 const complete=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',1)
 if(!initializing&&!complete)throw Error('Existing payment tables have no verified ownership marker.')
}
export async function verifyPaymentSchema(db){
 const sql=db.kind==='sqlite'?"SELECT name FROM sqlite_master WHERE type='table'":'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()'
 const names=new Set((await db.prepare(sql).all()).map(r=>r.name))
 if(paymentTables.some(name=>!names.has(name)))throw Error('Payment schema is not initialized.')
 if(db.kind==='mariadb'){
  const marker=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',1)
  if(!marker)throw Error('Payment schema ownership is unverified.')
 }
}
export async function initializePaymentSchema(db,env={}){
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP!=='1')throw Error('Payment schema setup requires explicit runtime approval.')
  const names=new Set((await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(r=>r.name))
  const platform=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-platform',1)
  if(!platform)throw Error('The approved Ascore database must be verified before payment setup.')
  const marker=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',0)
  const complete=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-payments',1)
  if(complete){await verifyPaymentSchema(db);return}
  if(paymentTables.some(name=>names.has(name))&&!marker)throw Error('Existing payment tables have no verified ownership marker.')
  if(!marker)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-payments',0,Date.now())
 }
 for(const name of paymentTables)await db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${columns[name]})${db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''}`)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-payments',1,Date.now())
}
