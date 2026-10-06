export const pdfTables=['course_pdf_editions','course_pdf_chunks']
export async function verifyPdfOwnership(db){
 const partial=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-pdfs',0)
 const complete=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-pdfs',1)
 if(!partial&&!complete)throw Error('Private PDF table ownership is unverified.')
}
export async function verifyPdfSchema(db){
 for(const name of pdfTables)await db.prepare(`SELECT * FROM ${name} LIMIT 0`).all()
 if(db.kind==='mariadb'&&!await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-pdfs',1))throw Error('Private PDF schema is incomplete.')
}
export async function initializePdfSchema(db,env){
 if(db.kind==='mariadb'){
  if(env.ASCORE_ALLOW_PDF_SCHEMA_SETUP!=='1')throw Error('Private PDF setup requires explicit operator approval.')
  const names=new Set((await db.prepare('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema=DATABASE()').all()).map(r=>r.name))
  const complete=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-pdfs',1)
  if(complete){await verifyPdfSchema(db);return}
  const partial=await db.prepare('SELECT application,version FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-course-pdfs',0)
  if(pdfTables.some(n=>names.has(n))&&!partial)throw Error('Existing private PDF tables have no verified ownership.')
  if(!partial)await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-pdfs',0,Date.now())
 }
 const suffix=db.kind==='mariadb'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''
 await db.exec(`CREATE TABLE IF NOT EXISTS course_pdf_editions (course_id VARCHAR(16) PRIMARY KEY, sha256 CHAR(64) NOT NULL, byte_count INTEGER NOT NULL, chunk_count INTEGER NOT NULL, installed_at BIGINT NOT NULL, installed_by VARCHAR(36) NOT NULL)${suffix}`)
 await db.exec(`CREATE TABLE IF NOT EXISTS course_pdf_chunks (course_id VARCHAR(16) NOT NULL, chunk_index INTEGER NOT NULL, sha256 CHAR(64) NOT NULL, content ${db.kind==='mariadb'?'MEDIUMBLOB':'BLOB'} NOT NULL, PRIMARY KEY(course_id,chunk_index), FOREIGN KEY(course_id) REFERENCES course_pdf_editions(course_id), CHECK(chunk_index>=0), CHECK(LENGTH(content)>0 AND LENGTH(content)<=524288))${suffix}`)
 if(db.kind==='mariadb')await db.prepare('INSERT INTO ascore_schema_versions (application,version,applied_at) VALUES (?,?,?)').run('ascore-course-pdfs',1,Date.now())
}
