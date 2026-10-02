import { AsyncLocalStorage } from 'node:async_hooks'

export function mariaDbPoolOptions(env){
 if((env.DB_HOST||'localhost')!=='localhost'||Number(env.DB_PORT||3306)!==3306)throw Error('Ascore database access is restricted to approved Hostinger localhost:3306.')
 for(const name of ['DB_NAME','DB_USER'])if(!/^[a-zA-Z0-9_]{1,64}$/.test(env[name]||''))throw Error('Configure the approved dedicated Ascore database and user.')
 if(typeof env.DB_PASSWORD!=='string'||!env.DB_PASSWORD||env.DB_PASSWORD.length>1024)throw Error('Enter the database password privately in server runtime configuration.')
 return {host:'localhost',port:3306,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,charset:'utf8mb4',timezone:'Z',waitForConnections:true,connectionLimit:5,maxIdle:5,idleTimeout:60000,queueLimit:50,connectTimeout:10000,multipleStatements:false,supportBigNumbers:true,bigNumberStrings:false,decimalNumbers:true,maxPreparedStatements:128}
}

// Shared async repository adapter; production never falls back to SQLite.
// No global credentials, DB creation, migrations or connections at module import.
export async function createMariaDbStore({env=process.env,poolFactory}={}){
 const options=mariaDbPoolOptions(env)
 const factory=poolFactory||(await import('mysql2/promise')).default.createPool
 const pool=factory(options),context=new AsyncLocalStorage()
 let closed=false
 function statement(sql){
  if(typeof sql!=='string'||!sql.trim()||/\b(PRAGMA|AUTOINCREMENT)\b|BEGIN\s+IMMEDIATE|ON\s+CONFLICT|COLLATE\s+NOCASE/i.test(sql))throw Error('Use explicit MariaDB SQL; SQLite operations cannot be silently translated.')
  return sql
 }
 async function execute(sql,parameters=[]){
  if(closed)throw Error('Database store is closed.')
  const [result]=await (context.getStore()||pool).execute(statement(sql),parameters)
  return result
 }
 const prepare=sql=>({
  async all(...parameters){const rows=await execute(sql,parameters);if(!Array.isArray(rows))throw Error('Expected database rows.');return rows},
  async get(...parameters){return (await this.all(...parameters))[0]},
  async run(...parameters){const result=await execute(sql,parameters);if(Array.isArray(result))throw Error('Expected database write result.');return {changes:result.affectedRows,lastInsertRowid:result.insertId}}
 })
 return {
  kind:'mariadb',prepare,lock:sql=>`${sql} FOR UPDATE`,
  async exec(sql){return execute(sql)},
  async health(){const row=await prepare('SELECT 1 AS healthy').get();return row?.healthy===1},
  async transaction(callback){
   if(context.getStore())throw Error('Nested database transactions require an explicit savepoint design.')
   if(closed)throw Error('Database store is closed.')
   const connection=await pool.getConnection()
   try{await connection.beginTransaction();const result=await context.run(connection,callback);await connection.commit();return result}
   catch(error){try{await connection.rollback()}catch{}throw error}
   finally{connection.release()}
  },
  async close(){if(!closed){closed=true;await pool.end()}}
 }
}
