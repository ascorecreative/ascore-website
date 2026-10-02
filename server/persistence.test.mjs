import test from 'node:test'
import assert from 'node:assert/strict'
import { createSqliteStore } from './sqlite-store.mjs'
import { createPersistence } from './persistence.mjs'
import { deliveryCredentials,CRM_ORG_ID,CRM_ORIGIN,ACCOUNTS_ORIGIN } from './credentials.mjs'

test('SQLite transactions isolate other requests and rollback both writes together',async t=>{
 const store=createSqliteStore(':memory:');t.after(()=>store.close());await store.exec('CREATE TABLE events(value TEXT)')
 let entered,release
 const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{entered=resolve})
 const write=store.transaction(async()=>{await store.prepare('INSERT INTO events VALUES (?)').run('first');entered();await gate;await store.prepare('INSERT INTO events VALUES (?)').run('second')})
 await started;let observed=false
 const read=store.prepare('SELECT * FROM events').all().then(rows=>{observed=true;return rows})
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(observed,false);release();await write
 assert.equal((await read).length,2)
 await assert.rejects(store.transaction(async()=>{await store.prepare('INSERT INTO events VALUES (?)').run('rolled-back');throw Error('synthetic failure')}))
 assert.equal((await store.prepare('SELECT * FROM events').all()).length,2)
})
test('production rejects SQLite and absent MariaDB credentials instead of falling back',async()=>{
 await assert.rejects(createPersistence({env:{NODE_ENV:'production',ASCORE_DATABASE:'sqlite'}}),/SQLite is development-only/)
 await assert.rejects(createPersistence({env:{NODE_ENV:'production'}}),/dedicated Ascore database/)
})
test('delivery reads no credentials while disabled and production accepts only complete environment configuration',()=>{
 assert.deepEqual(deliveryCredentials({NODE_ENV:'production',ASCORE_ZOHO_CREDENTIALS_PATH:'/unreadable/secret'}),{})
 assert.throws(()=>deliveryCredentials({NODE_ENV:'production',ASCORE_ENABLE_ENQUIRY_DELIVERY:'1',ASCORE_ZOHO_CREDENTIALS_PATH:'/unreadable/secret'}),/server-only/)
 const env={NODE_ENV:'production',ASCORE_ENABLE_ENQUIRY_DELIVERY:'1',ZOHO_CRM_CLIENT_ID:'synthetic',ZOHO_CRM_CLIENT_SECRET:'synthetic',ZOHO_CRM_REFRESH_TOKEN:'synthetic',ZOHO_CRM_ORGANIZATION_ID:CRM_ORG_ID,ZOHO_API_ORIGIN:CRM_ORIGIN,ZOHO_ACCOUNTS_ORIGIN:ACCOUNTS_ORIGIN,SMTP_HOST:'smtp.hostinger.com',SMTP_PORT:'465',SMTP_USER:'info@ascore.ae',SMTP_PASSWORD:'synthetic'}
 assert.equal(deliveryCredentials(env).smtp.user,'info@ascore.ae')
 assert.throws(()=>deliveryCredentials({...env,SMTP_USER:'someone@example.invalid'}),/mismatched/)
})
