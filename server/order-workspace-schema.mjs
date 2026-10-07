import {verifyMariaDbSchema} from './mariadb-schema.mjs'
export const orderWorkspaceTables=['course_customers','course_order_metadata','course_order_entries']
const application='ascore-order-workspace'
export async function verifyOrderWorkspaceSchema(db){
 for(const table of orderWorkspaceTables)await db.prepare(`SELECT * FROM ${table} LIMIT 0`).all()
 if(db.kind==='mariadb'&&!await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,1))throw Error('Order workspace ownership is unverified.')
}
// Called only by the explicit authenticated owner setup action. Never on a GET.
export async function initializeOrderWorkspaceSchema(db,user){
 if(user?.role!=='admin'||user?.username!=='aswinfrn')throw Object.assign(Error('Owner access is required to initialize order management.'),{status:403})
 if(db.kind==='mariadb'){
  if(db.readiness?.identityVerified!==true||db.readiness?.schemaVersion!==1)throw Error('The dedicated Ascore database must be verified before order setup.')
  await verifyMariaDbSchema(db)
  if(await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,1)){await verifyOrderWorkspaceSchema(db);return}
  const partial=await db.prepare('SELECT version FROM ascore_schema_versions WHERE application=? AND version=?').get(application,0)
  const names=await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()
  if(!partial&&names.some(row=>orderWorkspaceTables.includes(row.name)))throw Error('Existing order workspace tables have no verified ownership marker.')
  if(!partial)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run(application,0,Date.now())
 }
 const suffix=db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''
 for(const sql of [
  'course_customers (id CHAR(64) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, tags TEXT NOT NULL, revision INTEGER NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)',
  'course_order_metadata (order_source VARCHAR(16) NOT NULL, order_id CHAR(36) NOT NULL, tags TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(order_source,order_id))',
  'course_order_entries (id CHAR(36) PRIMARY KEY, order_source VARCHAR(16) NOT NULL, order_id CHAR(36) NOT NULL, kind VARCHAR(24) NOT NULL, data TEXT NOT NULL, actor_id CHAR(36) NOT NULL, actor_name VARCHAR(100) NOT NULL, created_at BIGINT NOT NULL)'
 ])await db.exec('CREATE TABLE IF NOT EXISTS '+sql+suffix)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run(application,1,Date.now())
 await verifyOrderWorkspaceSchema(db)
}
