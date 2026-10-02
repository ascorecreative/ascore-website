// Read-only checks precede every schema operation; no credentials enter evidence.
export function supportedDatabaseEngine(value){
 if(typeof value!=='string')throw Error('Database engine/version could not be verified.')
 const normalized=value.replace(/^5\.5\.5-/,'')
 const match=/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(normalized)
 if(!match)throw Error('Database engine/version could not be verified.')
 const [major,minor,patch]=match.slice(1).map(Number),engine=/\bMariaDB\b/i.test(value)?'mariadb':'mysql'
 // Require modern CHECK/JSON support; never accept MySQL versions that ignore CHECK.
 const supported=engine==='mariadb'?(major>10||major===10&&minor>=6):(major===8&&(minor>0||patch>=16))
 if(!supported)throw Error('Database engine/version does not support the reviewed Ascore schema.')
 return {engine,engineVersion:`${major}.${minor}.${patch}`}
}
export async function verifyDatabaseIdentity(store,env){
 const row=await store.prepare('SELECT DATABASE() AS databaseName, VERSION() AS serverVersion').get()
 if(!row||row.databaseName!==env.DB_NAME)throw Error('The selected database does not match the approved runtime configuration; no schema changes were made.')
 return {...supportedDatabaseEngine(row.serverVersion),identityVerified:true}
}
