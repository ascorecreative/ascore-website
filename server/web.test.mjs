import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPortalServer } from './app.mjs'
import { createWebServer } from './web.mjs'

test('Hostinger entry serves public/private pages, API, errors and bounded video ranges from dist only',async t=>{
 const dist=mkdtempSync(join(tmpdir(),'ascore-web-'))
 mkdirSync(join(dist,'portal'));mkdirSync(join(dist,'assets'))
 writeFileSync(join(dist,'index.html'),'public-page');writeFileSync(join(dist,'portal/index.html'),'private-page');writeFileSync(join(dist,'404.html'),'missing-page');writeFileSync(join(dist,'clip.mp4'),'0123456789');writeFileSync(join(dist,'assets/test.js'),'asset')
 const portal=await createPortalServer({dbPath:':memory:',env:{}}),server=createWebServer({portal,dist})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await portal.close();rmSync(dist,{recursive:true,force:true})})
 const base=`http://127.0.0.1:${server.address().port}`
 assert.equal(await (await fetch(base+'/')).text(),'public-page')
 const privatePage=await fetch(base+'/portal/projects');assert.equal(privatePage.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(await privatePage.text(),'private-page')
 assert.equal((await fetch(base+'/missing')).status,404);assert.equal((await fetch(base+'/.env.server')).status,404)
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).storage,'sqlite')
 const clip=await fetch(base+'/clip.mp4',{headers:{Range:'bytes=2-4'}});assert.equal(clip.status,206);assert.equal(await clip.text(),'234');assert.equal(clip.headers.get('content-range'),'bytes 2-4/10')
 assert.equal((await fetch(base+'/clip.mp4',{headers:{Range:'bytes=15-20'}})).status,416)
 assert.match((await fetch(base+'/assets/test.js')).headers.get('cache-control'),/immutable/)
})
