import { createPortalServer } from './app.mjs'
import { createWebServer } from './web.mjs'
const production=process.env.NODE_ENV==='production'
const portal=await createPortalServer()
const server=production?createWebServer({portal}):portal.server
if(production&&portal.databaseReadiness)console.log('Ascore database ready:',JSON.stringify(portal.databaseReadiness))
const port=Number(production?(process.env.PORT||3000):(process.env.ASCORE_API_PORT||8787))
if(!Number.isInteger(port)||port<1||port>65535){await portal.close();throw Error('Configure a valid runtime port.')}
server.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(`Ascore ${production?'web runtime':'local API'} listening on port ${port}`))
let closing=false
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
 if(closing)return;closing=true
 if(server!==portal.server)await new Promise(resolve=>server.close(resolve))
 await portal.close();process.exit(0)
})
