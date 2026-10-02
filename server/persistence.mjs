import { createSqliteStore } from './sqlite-store.mjs'
import { createMariaDbStore } from './mariadb-store.mjs'
import { initializeMariaDbSchema,verifyMariaDbSchema } from './mariadb-schema.mjs'

export const uniqueConflict=error=>error.code==='ER_DUP_ENTRY'||String(error.code).includes('CONSTRAINT')||[19,2067,1555].includes(error.errcode)
export async function createPersistence({env=process.env,dbPath,poolFactory,store}={}){
 const production=env.NODE_ENV==='production',kind=env.ASCORE_DATABASE||(production?'mariadb':'sqlite')
 if(store){if(production&&store.kind!=='mariadb')throw Error('Production requires MariaDB persistence.');return store}
 if(production&&(kind!=='mariadb'||dbPath))throw Error('Production requires approved MariaDB configuration; SQLite is development-only.')
 if(kind==='sqlite')return createSqliteStore(dbPath||env.ASCORE_DB_PATH||'server/data/portal.sqlite')
 if(kind!=='mariadb')throw Error('Choose a supported Ascore database adapter.')
 const database=await createMariaDbStore({env,poolFactory})
 try{
  if(env.ASCORE_ALLOW_SCHEMA_SETUP==='1')await initializeMariaDbSchema(database,env)
  else await verifyMariaDbSchema(database)
  return database
 }catch(error){await database.close();throw error}
}
