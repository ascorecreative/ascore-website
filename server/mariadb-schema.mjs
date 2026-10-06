import {courseTables} from './course-schema.mjs'
import {paymentTables,verifyPaymentOwnership} from './payment-schema.mjs'
// Only application-owned tables in a separately approved dedicated database.
const suffix='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
export const mariaDbSchema=[
 ['ascore_schema_versions',`application VARCHAR(32) NOT NULL, version INT NOT NULL, applied_at BIGINT NOT NULL, PRIMARY KEY(application,version)`],
 ['users',`id CHAR(36) PRIMARY KEY, username VARCHAR(40) NOT NULL UNIQUE, email VARCHAR(254) UNIQUE, name VARCHAR(100) NOT NULL, company VARCHAR(160) NOT NULL, role VARCHAR(16) NOT NULL CHECK(role IN ('client','admin')), password_hash VARCHAR(512) NOT NULL, created_at BIGINT NOT NULL`],
 ['sessions',`token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, csrf CHAR(48) NOT NULL, expires BIGINT NOT NULL, INDEX sessions_expiry(expires), CONSTRAINT sessions_user FOREIGN KEY(user_id) REFERENCES users(id)`],
 ['used_setup_tokens',`token_hash CHAR(64) PRIMARY KEY, used_at BIGINT NOT NULL`],
 ['projects',`id CHAR(36) PRIMARY KEY, client_id CHAR(36) NOT NULL, data LONGTEXT NOT NULL CHECK(JSON_VALID(data)), CONSTRAINT projects_client FOREIGN KEY(client_id) REFERENCES users(id)`],
 ['milestones',`id CHAR(36) PRIMARY KEY, project_id CHAR(36) NOT NULL, data LONGTEXT NOT NULL CHECK(JSON_VALID(data)), CONSTRAINT milestones_project FOREIGN KEY(project_id) REFERENCES projects(id)`],
 ['leads',`id CHAR(36) PRIMARY KEY, data LONGTEXT NOT NULL CHECK(JSON_VALID(data))`],
 ['documents',`sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE, id CHAR(36) PRIMARY KEY, client_id CHAR(36) NOT NULL, project_id CHAR(36), kind VARCHAR(16) NOT NULL CHECK(kind IN ('quotation','invoice','bill')), currency CHAR(3) NOT NULL, amount_minor BIGINT NOT NULL, data LONGTEXT NOT NULL CHECK(JSON_VALID(data)), CONSTRAINT documents_client FOREIGN KEY(client_id) REFERENCES users(id), CONSTRAINT documents_project FOREIGN KEY(project_id) REFERENCES projects(id)`],
 ['payment_records',`id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, amount_minor BIGINT NOT NULL CHECK(amount_minor>0), paid_date CHAR(10) NOT NULL, reference VARCHAR(200) NOT NULL, actor_id CHAR(36) NOT NULL, CONSTRAINT payments_document FOREIGN KEY(document_id) REFERENCES documents(id)`],
 ['audit',`id BIGINT PRIMARY KEY AUTO_INCREMENT, at BIGINT NOT NULL, actor_id VARCHAR(64) NOT NULL, action VARCHAR(80) NOT NULL, target_id VARCHAR(200) NOT NULL`],
 ['zoho_links',`local_id CHAR(36) NOT NULL, resource VARCHAR(32) NOT NULL, external_id VARCHAR(64) NOT NULL, PRIMARY KEY(local_id,resource), UNIQUE KEY zoho_remote_record(resource,external_id)`],
 ['zoho_snapshots',`local_id CHAR(36) PRIMARY KEY, data LONGTEXT NOT NULL CHECK(JSON_VALID(data))`],
 ['zoho_sync_operations',`digest CHAR(64) PRIMARY KEY, local_id CHAR(36) NOT NULL, resource VARCHAR(32) NOT NULL, state VARCHAR(24) NOT NULL, at BIGINT NOT NULL`],
 ['enquiries',`id CHAR(36) PRIMARY KEY, payload_hash CHAR(64) NOT NULL, data LONGTEXT NOT NULL CHECK(JSON_VALID(data)), delivery LONGTEXT NOT NULL CHECK(JSON_VALID(delivery)), created_at BIGINT NOT NULL, INDEX enquiries_created(created_at)`],
 ['enquiry_limits',`\`key\` VARCHAR(96) PRIMARY KEY, count INT NOT NULL, expires BIGINT NOT NULL, INDEX enquiry_limits_expiry(expires)`],
].map(([name,columns])=>({name,sql:`CREATE TABLE IF NOT EXISTS \`${name}\` (${columns}) ${suffix}`}))

export async function initializeMariaDbSchema(store,env=process.env){
 if(env.ASCORE_ALLOW_SCHEMA_SETUP!=='1')throw Error('Initial schema setup requires approval for the dedicated Ascore database.')
 const tables=await store.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()
 const names=new Set(tables.map(row=>row.name)),allowed=new Set([...mariaDbSchema.map(table=>table.name),...courseTables,...paymentTables])
 if([...names].some(name=>!allowed.has(name))||(names.size&&!names.has('ascore_schema_versions')))throw Error('This database is not empty or verified as Ascore-owned; no schema changes were made.')
 if(courseTables.some(name=>names.has(name)))await verifyCourseOwnership(store)
 if(paymentTables.some(name=>names.has(name)))await verifyPaymentOwnership(store)
 if(names.has('ascore_schema_versions')){
  const record=await store.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-platform',1)
  if(record){await verifyMariaDbSchema(store);return {version:1,created:false}}
  const initializing=await store.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-platform',0)
  if(!initializing)throw Error('Existing schema ownership/version is unverified; no schema changes were made.')
 }
 // DDL auto-commits in MariaDB. Do not pretend this is one rollback-capable transaction.
 if(!names.size){
  await store.exec(mariaDbSchema[0].sql)
  await store.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-platform',0,Date.now())
 }
 for(const table of mariaDbSchema.slice(1))await store.exec(table.sql)
 await store.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-platform',1,Date.now())
 return {version:1,created:true}
}

export async function verifyMariaDbSchema(store){
 const names=new Set((await store.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(row=>row.name))
 if(courseTables.some(name=>names.has(name)))await verifyCourseOwnership(store)
 if(paymentTables.some(name=>names.has(name)))await verifyPaymentOwnership(store)
 if([...names].some(name=>!mariaDbSchema.some(table=>table.name===name)&&!courseTables.includes(name)&&!paymentTables.includes(name)))throw Error('Production requires the dedicated Ascore-owned database.')
 if(mariaDbSchema.some(table=>!names.has(table.name)))throw Error('Approved Ascore schema initialization is required before production startup.')
 const version=await store.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-platform',1)
 if(!version)throw Error('Ascore schema ownership/version could not be verified.')
 return {version:1}
}

async function verifyCourseOwnership(store){
 const initializing=await store.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-courses',0)
 const complete=await store.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-courses',1)
 if(!initializing&&!complete)throw Error('Existing course tables have no verified ownership marker.')
}
