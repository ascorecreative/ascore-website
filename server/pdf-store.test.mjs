import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createSqliteStore} from './sqlite-store.mjs'
import {initializePdfSchema,verifyPdfOwnership} from './pdf-schema.mjs'
import {createPdfStore} from './pdf-store.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const owner={role:'admin',username:'aswinfrn',id:'fixture-owner'}
async function fixture(t){const db=createSqliteStore();t.after(()=>db.close());await initializePdfSchema(db,{});const bytes=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(1100000,35)]),catalog={meta:{sha256:hash(bytes),bytes:bytes.length}},audits=[],env={ASCORE_COURSE_STORAGE:'mariadb'};const storage=await createPdfStore({db,env,catalog,audit:async(...args)=>audits.push(args)});return{db,bytes,catalog,audits,env,storage}}
test('private database PDFs verify bounded chunks, repair retries and survive a new storage instance',async t=>{
 const h=await fixture(t);assert.equal(h.storage.ready(),true);await h.storage.install('meta',h.bytes,owner);assert.deepEqual(await h.storage.read('meta'),h.bytes)
 const chunks=await h.db.prepare('SELECT chunk_index,LENGTH(content) AS size FROM course_pdf_chunks ORDER BY chunk_index').all();assert.equal(chunks.length,3);assert.ok(chunks.every(c=>c.size<=524288));assert.equal(chunks.reduce((n,c)=>n+c.size,0),h.bytes.length)
 await h.storage.install('meta',h.bytes,owner);assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM course_pdf_editions').get()).count,1);assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM course_pdf_chunks').get()).count,3)
 const restarted=await createPdfStore({db:h.db,env:h.env,catalog:h.catalog});assert.deepEqual(await restarted.read('meta'),h.bytes);assert.equal(h.audits.length,2)
})
test('wrong owner, course, size, header and hash cannot install or alter the private asset',async t=>{
 const h=await fixture(t);await assert.rejects(h.storage.install('meta',h.bytes,{...owner,username:'other'}),{status:403});await assert.rejects(h.storage.install('meta',h.bytes,{...owner,role:'client'}),{status:403})
 for(const[id,b]of [['other',h.bytes],['meta',h.bytes.subarray(0,500)],['meta',Buffer.alloc(h.bytes.length)],['meta',Buffer.concat([h.bytes.subarray(0,20),Buffer.alloc(h.bytes.length-20)])]])await assert.rejects(h.storage.install(id,b,owner),{status:400})
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM course_pdf_editions').get()).count,0)
})
test('missing, added, corrupted chunks and metadata are rejected before bytes can be downloaded',async t=>{
 const h=await fixture(t);await h.storage.install('meta',h.bytes,owner)
 await h.db.prepare('UPDATE course_pdf_chunks SET content=? WHERE course_id=? AND chunk_index=?').run(Buffer.from('corrupted'),'meta',1);await assert.rejects(h.storage.read('meta'),/verification/)
 await h.storage.install('meta',h.bytes,owner);await h.db.prepare('DELETE FROM course_pdf_chunks WHERE course_id=? AND chunk_index=?').run('meta',1);await assert.rejects(h.storage.read('meta'),/count/)
 await h.storage.install('meta',h.bytes,owner);await h.db.prepare('INSERT INTO course_pdf_chunks VALUES (?,?,?,?)').run('meta',3,hash(Buffer.from('extra')),Buffer.from('extra'));await assert.rejects(h.storage.read('meta'),/count/)
 await h.storage.install('meta',h.bytes,owner);await h.db.prepare('UPDATE course_pdf_editions SET byte_count=byte_count+1 WHERE course_id=?').run('meta');await assert.rejects(h.storage.read('meta'),/edition/)
})
test('interrupted binary insertion rolls back the edition and preserves the previously installed PDF',async t=>{
 const h=await fixture(t);await h.storage.install('meta',h.bytes,owner);const prepare=h.db.prepare.bind(h.db);h.db.prepare=sql=>{const s=prepare(sql);if(sql.startsWith('INSERT INTO course_pdf_chunks'))return {...s,run:async(...args)=>{if(args[1]===1)throw Error('Synthetic failed chunk');return s.run(...args)}};return s};await assert.rejects(h.storage.install('meta',h.bytes,owner),/failed chunk/);h.db.prepare=prepare;assert.deepEqual(await h.storage.read('meta'),h.bytes)
})
test('startup is read-only, ownership and packet capacity fail closed without changing server settings',async()=>{
 const writes=[],db={kind:'mariadb',prepare(sql){return {all:async()=>[],get:async(app,version)=>sql.includes('max_allowed_packet')?{packetBytes:65536}:sql.includes('schema_versions')&&app==='ascore-course-pdfs'&&version===1?{application:app,version}:undefined}},exec:async sql=>writes.push(sql)}
 const storage=await createPdfStore({db,env:{ASCORE_COURSE_STORAGE:'mariadb'},catalog:{}});assert.equal(storage.ready(),false);assert.equal(storage.status(owner).packetReady,false);assert.deepEqual(writes,[])
 await assert.rejects(verifyPdfOwnership({...db,prepare:()=>({get:async()=>undefined})}),/ownership/)
 await assert.rejects(initializePdfSchema(db,{}),/approval/);assert.deepEqual(writes,[])
})
