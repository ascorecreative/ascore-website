import { createSqliteStore } from './sqlite-store.mjs'
import { createMariaDbStore } from './mariadb-store.mjs'
import { initializeMariaDbSchema,verifyMariaDbSchema } from './mariadb-schema.mjs'
import { verifyDatabaseIdentity } from './database-preflight.mjs'

export const uniqueConflict=error=>error.code==='ER_DUP_ENTRY'||String(error.code).includes('CONSTRAINT')||[19,2067,1555].includes(error.errcode)
export async function createPersistence({env=process.env,dbPath,poolFactory,store}={}){
 const production=env.NODE_ENV==='production',kind=env.ASCORE_DATABASE||(production?'mariadb':'sqlite')
 if(store){if(production&&store.kind!=='mariadb')throw Error('Production requires MariaDB persistence.');return store}
 if(production&&(kind!=='mariadb'||dbPath))throw Error('Production requires approved MariaDB configuration; SQLite is development-only.')
 if(kind==='sqlite')return createSqliteStore(dbPath||env.ASCORE_DB_PATH||'server/data/portal.sqlite')
 if(kind!=='mariadb')throw Error('Choose a supported Ascore database adapter.')
 const database=await createMariaDbStore({env,poolFactory})
 try{
  const identity=await verifyDatabaseIdentity(database,env)
  const initialized=env.ASCORE_ALLOW_SCHEMA_SETUP==='1'?await initializeMariaDbSchema(database,env):null
  const schema=await verifyMariaDbSchema(database)
  const marker=await database.prepare('SELECT applied_at FROM ascore_schema_versions WHERE application=? AND version=?').get('ascore-platform',1)
  const appliedAt=Number(marker?.applied_at)
  if(!Number.isSafeInteger(appliedAt)||appliedAt<=0)throw Error('The Ascore schema initialization marker could not be verified.')
  database.readiness=Object.freeze({...identity,schemaVersion:schema.version,schemaAppliedAt:appliedAt,initialization:initialized?.created?'created':'verified'})
  return database
 }catch(error){await database.close();throw error}
}
