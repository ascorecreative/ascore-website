import {marketingAssets} from './marketing-assets.mjs'
import { readFile,writeFile,mkdir } from 'node:fs/promises'
import { resolve,dirname } from 'node:path'
import { createServer } from 'vite'
import { publicRoutes,privateRoutes,metadataForPath,SITE_URL } from '../src/lib/siteRoutes.js'
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
const template=await marketingAssets(await readFile(resolve('dist/index.html'),'utf8'))
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'warn'})
try{
 const {render}=await vite.ssrLoadModule('/src/prerender.jsx')
 for(const path of [...publicRoutes.map(page=>page.path),...privateRoutes,'/404/']){
  const meta=metadataForPath(path)
  let html=template.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(meta.title)}</title>`)
  html=html.replace(/\s*<meta (?:name="(?:description|robots|twitter:title|twitter:description)"|property="(?:og:title|og:description|og:url)")[^>]*>/g,'').replace(/\s*<link rel="canonical"[^>]*>/g,'').replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')
  const head=[`<meta name="description" content="${escape(meta.description)}" />`,`<meta name="robots" content="${meta.robots}" />`,...['og:title','twitter:title'].map(key=>`<meta ${key.startsWith('og')?'property':'name'}="${key}" content="${escape(meta.title)}" />`),...['og:description','twitter:description'].map(key=>`<meta ${key.startsWith('og')?'property':'name'}="${key}" content="${escape(meta.description)}" />`)]
  if(meta.canonical){head.push(`<link rel="canonical" href="${meta.canonical}" />`,`<meta property="og:url" content="${meta.canonical}" />`)
   const graph=[{'@type':'Organization','@id':SITE_URL+'/#organization',name:'Ascore Creative',legalName:'ASCORE CREATIVE FZC LLC',url:SITE_URL+'/',logo:SITE_URL+'/ascore-logo-official.png',email:'info@ascore.ae',telephone:'+971543878726',areaServed:['United Arab Emirates','Global']},{'@type':'WebSite','@id':SITE_URL+'/#website',url:SITE_URL+'/',name:'Ascore Creative',publisher:{'@id':SITE_URL+'/#organization'}}]
   if(path!=='/'){const route=publicRoutes.find(page=>page.path===path);const crumbs=[['Home','/'],...(route.service?[['Services','/services/']]:[]),[route.label,path]];graph.push({'@type':'BreadcrumbList',itemListElement:crumbs.map(([name,url],index)=>({'@type':'ListItem',position:index+1,name,item:SITE_URL+url}))})}
   head.push(`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`)
  }
  html=html.replace('</head>',head.join('\n')+'\n</head>').replace('<div id="root"></div>',`<div id="root">${render(path)}</div>`)
  const output=path==='/404/'?resolve('dist/404.html'):resolve('dist',path.slice(1),'index.html');await mkdir(dirname(output),{recursive:true});await writeFile(output,html)
 }
 console.log(`Prerendered ${publicRoutes.length} public pages, ${privateRoutes.length} private shells and a 404 page.`)
}finally{await vite.close()}
