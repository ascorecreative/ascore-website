export const courseTables=['course_orders','course_downloads','course_limits']
const columns={
 course_orders:`id VARCHAR(36) PRIMARY KEY, payload_hash CHAR(64) NOT NULL, email VARCHAR(254) NOT NULL, items TEXT NOT NULL, subtotal_minor INTEGER NOT NULL, discount_minor INTEGER NOT NULL, total_minor INTEGER NOT NULL CHECK(total_minor=0), coupon VARCHAR(20) NOT NULL CHECK(coupon='FREE'), payment_status VARCHAR(16) NOT NULL CHECK(payment_status='free'), secret CHAR(64) NOT NULL, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL, delivery TEXT NOT NULL`,
 course_downloads:`order_id VARCHAR(36) NOT NULL, course_id VARCHAR(16) NOT NULL, uses INTEGER NOT NULL, PRIMARY KEY(order_id,course_id), FOREIGN KEY(order_id) REFERENCES course_orders(id)`,
 course_limits:'`key` VARCHAR(96) PRIMARY KEY, count INTEGER NOT NULL, expires BIGINT NOT NULL'
}
export async function initializeCourseSchema(db,env={}){
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_COURSE_SCHEMA_SETUP!=='1')throw Error('Course schema setup requires explicit runtime approval.')
  const names=new Set((await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(r=>r.name))
  const marker=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-courses',0)
  const complete=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-courses',1)
  if(complete){await verifyCourseSchema(db);return}
  if(courseTables.some(name=>names.has(name))&&!marker)throw Error('Existing course tables have no verified ownership marker.')
  if(!marker)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-courses',0,Date.now())
 }
 for(const name of courseTables)await db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${columns[name]})${db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''}`)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-courses',1,Date.now())
}
export async function verifyCourseSchema(db){
 if(db.kind==='sqlite'){const names=new Set((await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).map(r=>r.name));if(courseTables.some(name=>!names.has(name)))throw Error('Course schema is not initialized.');return}
 const names=new Set((await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(r=>r.name))
 const marker=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-courses',1)
 if(!marker||courseTables.some(name=>!names.has(name)))throw Error('Course schema is not initialized.')
}
