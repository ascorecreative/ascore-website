import { DatabaseSync } from 'node:sqlite'
import { AsyncLocalStorage } from 'node:async_hooks'
import { mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'

export function createSqliteStore(path=':memory:'){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700})
 const database=new DatabaseSync(path),context=new AsyncLocalStorage()
 if(path!==':memory:')chmodSync(path,0o600)
 database.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=0;')
 let tail=Promise.resolve(),closed=false
 const exclusive=async callback=>{const previous=tail;let release;tail=new Promise(resolve=>{release=resolve});await previous;try{if(closed)throw Error('Database store is closed.');return await callback()}finally{release()}}
 const retryBusy=async callback=>{for(let attempt=0;;attempt++){try{return await callback()}catch(error){if(!String(error.code).includes('BUSY')&&error.errcode!==5||attempt>=20)throw error;await new Promise(resolve=>setTimeout(resolve,5))}}}
 const access=callback=>context.getStore()?Promise.resolve().then(callback):exclusive(()=>retryBusy(callback))
 const prepare=sql=>Object.fromEntries(['get','all','run'].map(method=>[method,(...values)=>access(()=>database.prepare(sql)[method](...values))]))
 return {kind:'sqlite',prepare,lock:sql=>sql,
  exec:sql=>access(()=>database.exec(sql)),health:async()=>!!await prepare('SELECT 1 AS healthy').get(),
  async transaction(callback){if(context.getStore())throw Error('Nested database transactions require explicit savepoints.');return exclusive(async()=>{await retryBusy(()=>database.exec('BEGIN IMMEDIATE'));try{const result=await context.run(true,callback);database.exec('COMMIT');return result}catch(error){database.exec('ROLLBACK');throw error}})},
  async close(){if(!closed)await exclusive(()=>{closed=true;database.close()})}
 }
}
