import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve,sep,extname } from 'node:path'

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4','.glb':'model/gltf-binary','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml'}
export function createWebServer({portal,dist=resolve('dist')}){
 const root=resolve(dist)
 return createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://local.invalid').pathname
   if(pathname==='/api'||pathname.startsWith('/api/')){portal.server.emit('request',req,res);return}
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
   const decoded=decodeURIComponent(pathname)
   if(decoded.includes('\0')||decoded.split('/').some(part=>part.startsWith('.'))){res.writeHead(404);res.end();return}
   let file=resolve(root,'.'+decoded),status=200
   if(!file.startsWith(root+sep)&&file!==root){res.writeHead(404);res.end();return}
   let info
   try{info=await stat(file);if(info.isDirectory()){file=resolve(file,'index.html');info=await stat(file)}}catch{
    file=resolve(root,pathname.startsWith('/portal/')?'portal/index.html':'404.html');status=pathname.startsWith('/portal/')?200:404;info=await stat(file)
   }
   if(!info.isFile())throw Error('Missing public file')
   const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':status===200&&pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'}
   if(pathname==='/portal'||pathname.startsWith('/portal/'))headers['X-Robots-Tag']='noindex, nofollow'
   let start=0,end=info.size-1
   if(req.headers.range&&extname(file)==='.mp4'){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
    if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}
    if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end}else start=Math.max(0,info.size-Number(match[2]))
    if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;headers['Content-Length']=end-start+1
   }
   if(extname(file)==='.mp4')headers['Accept-Ranges']='bytes'
   res.writeHead(status,headers)
   if(req.method==='HEAD'){res.end();return}
   const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res)
  }catch{if(!res.headersSent)res.writeHead(500);res.end('The page could not be loaded.')}
 })
}
