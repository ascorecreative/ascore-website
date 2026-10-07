import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPortalServer } from './app.mjs'
import { createWebServer } from './web.mjs'
import {gzipSync,brotliCompressSync,gunzipSync,brotliDecompressSync} from 'node:zlib'
import {request} from 'node:http'

test('Hostinger entry serves public/private pages, API, errors and bounded video ranges from dist only',async t=>{
 const dist=mkdtempSync(join(tmpdir(),'ascore-web-'))
 mkdirSync(join(dist,'portal'));mkdirSync(join(dist,'assets'))
 writeFileSync(join(dist,'index.html'),'public-page');writeFileSync(join(dist,'portal/index.html'),'private-page');writeFileSync(join(dist,'404.html'),'missing-page');writeFileSync(join(dist,'clip.mp4'),'0123456789');writeFileSync(join(dist,'assets/test.js'),'asset')
 const portal=await createPortalServer({dbPath:':memory:',env:{}}),server=createWebServer({portal,dist})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await portal.close();rmSync(dist,{recursive:true,force:true})})
 const base=`http://127.0.0.1:${server.address().port}`
 assert.equal(await (await fetch(base+'/')).text(),'public-page')
 const privatePage=await fetch(base+'/portal/projects');assert.equal(privatePage.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(await privatePage.text(),'private-page')
 const privateCached=await fetch(base+'/portal/projects',{headers:{'If-None-Match':privatePage.headers.get('etag')}});assert.equal(privateCached.status,304);assert.equal(privateCached.headers.get('x-robots-tag'),'noindex, nofollow')
 assert.equal((await fetch(base+'/missing')).status,404);assert.equal((await fetch(base+'/.env.server')).status,404)
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).storage,'sqlite')
 const clip=await fetch(base+'/clip.mp4',{headers:{Range:'bytes=2-4'}});assert.equal(clip.status,206);assert.equal(await clip.text(),'234');assert.equal(clip.headers.get('content-range'),'bytes 2-4/10')
 assert.equal((await fetch(base+'/clip.mp4',{headers:{Range:'bytes=15-20'}})).status,416)
 assert.match((await fetch(base+'/assets/test.js')).headers.get('cache-control'),/immutable/)
 mkdirSync(join(dist,'courses/assets/previews'),{recursive:true});writeFileSync(join(dist,'courses/assets/previews/meta-p10.webp'),'preview-fixture')
 writeFileSync(join(dist,'courses/order-confirmation.mjs'),'export const ready=true')
 const module=await fetch(base+'/courses/order-confirmation.mjs');assert.equal(module.status,200);assert.equal(module.headers.get('content-type'),'text/javascript; charset=utf-8');assert.equal(module.headers.get('cache-control'),'no-cache');assert.equal(await module.text(),'export const ready=true')
 const preview=await fetch(base+'/courses/assets/previews/meta-p10.webp?v=abcdef123456');assert.match(preview.headers.get('cache-control'),/immutable/);assert.equal(preview.headers.get('content-type'),'image/webp')
 const cachedPreview=await fetch(base+'/courses/assets/previews/meta-p10.webp?v=abcdef123456',{headers:{'If-None-Match':preview.headers.get('etag')}});assert.equal(cachedPreview.status,304)
 assert.doesNotMatch((await fetch(base+'/courses/assets/previews/meta-p10.webp')).headers.get('cache-control'),/immutable/)
})

test('static representations negotiate compression, validate cache and preserve video/API behavior',async t=>{
 const dist=mkdtempSync(join(tmpdir(),'ascore-encoding-'));mkdirSync(join(dist,'courses'))
 const data='const application = "readable course content";'.repeat(200)
 for(const name of ['index.html','courses/app.js','model.glb']){writeFileSync(join(dist,name),data);writeFileSync(join(dist,name+'.gz'),gzipSync(data));writeFileSync(join(dist,name+'.br'),brotliCompressSync(data))}
 writeFileSync(join(dist,'clip.mp4'),'0123456789');writeFileSync(join(dist,'404.html'),'not-found')
 const portal=await createPortalServer({dbPath:':memory:',env:{}}),server=createWebServer({portal,dist});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await portal.close();rmSync(dist,{recursive:true,force:true})})
 const get=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers,method},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}))});req.on('error',reject);req.end()})
 const br=await get('/courses/app.js?v=abcdef123456',{'Accept-Encoding':'gzip, br'});assert.equal(br.headers['content-encoding'],'br');assert.equal(brotliDecompressSync(br.body).toString(),data);assert.equal(br.headers.vary,'Accept-Encoding');assert.match(br.headers['cache-control'],/immutable/);assert.equal(Number(br.headers['content-length']),br.body.length)
 const gz=await get('/model.glb',{'Accept-Encoding':'br;q=0, gzip;q=1'});assert.equal(gz.headers['content-encoding'],'gzip');assert.equal(gunzipSync(gz.body).toString(),data);assert.equal(gz.headers['content-type'],'model/gltf-binary');assert.match(gz.headers['cache-control'],/max-age=300/)
 const plain=await get('/courses/app.js',{'Accept-Encoding':'br;q=0, gzip;q=0'});assert.equal(plain.headers['content-encoding'],undefined);assert.equal(plain.body.toString(),data);assert.equal(plain.headers['cache-control'],'no-cache');assert.notEqual(plain.headers.etag,br.headers.etag)
 const cached=await get('/courses/app.js?v=abcdef123456',{'Accept-Encoding':'br','If-None-Match':br.headers.etag});assert.equal(cached.status,304);assert.equal(cached.body.length,0)
 const head=await get('/courses/app.js',{'Accept-Encoding':'br'},'HEAD');assert.equal(head.body.length,0);assert.equal(Number(head.headers['content-length']),br.body.length)
 const missing=await get('/missing',{'Accept-Encoding':'br','If-None-Match':'*'});assert.equal(missing.status,404)
 const clip=await get('/clip.mp4',{'Accept-Encoding':'br','Range':'bytes=2-4'});assert.equal(clip.status,206);assert.equal(clip.headers['content-encoding'],undefined);assert.equal(clip.body.toString(),'234')
 const api=await get('/api/courses/config',{'Accept-Encoding':'br','If-None-Match':'*'});assert.equal(api.status,200);assert.equal(api.headers.etag,undefined);assert.equal(JSON.parse(api.body).paidCheckoutEnabled,false)
})
