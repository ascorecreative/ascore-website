import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import vm from 'node:vm'

const script=await readFile('public/courses/app.js','utf8')
const marker='// COURSE_PRERENDER_END'
if(!script.includes(marker))throw Error('Course template boundary is missing')
const version=content=>createHash('sha256').update(content).digest('hex').slice(0,12)
const css=await readFile('public/courses/styles.css','utf8')
for(const [page,path] of [['home',''],['meta','meta-ads/'],['ai','practical-ai/'],['checkout','checkout/']]){
 const context=vm.createContext({document:{body:{dataset:{page}}},window:{matchMedia:()=>({matches:false})}})
 const markup=vm.runInContext(script.split(marker)[0]+"\nheader()+(page==='home'?home():page==='checkout'?checkout():product(page))+footer()+drawer()",context,{timeout:1000})
 let html=await readFile(`public/courses/${path}index.html`,'utf8')
 // Visitors can read and navigate before JS arrives; cart actions enable after
 // their handlers attach. Paid and gated delivery controls remain disabled.
 const safe=markup.replace(/<button\b([^>]*(?:data-add=|data-open-cart|id="(?:apply-coupon|review-order)")[^>]*)>/g,'<button$1 disabled data-course-pending>')
 html=html.replace('<div id="app"></div>',`<div id="app">${safe}</div>`)
 html=html.replace(/<noscript>[\s\S]*?<\/noscript>/,'<noscript><aside class="wrap section"><p>Course details and sample links are available above. Enable JavaScript to use the cart and checkout preview.</p></aside></noscript>')
 html=html.replace(/styles\.css\?v=[^" ]+/g,`styles.css?v=${version(css)}`).replace(/app\.js\?v=[^" ]+/g,`app.js?v=${version(script)}`)
 const hero=page==='meta'?'/courses/assets/previews/meta-p10-small.webp':page==='home'?vm.runInContext('PRODUCTS.meta.image',context):page==='ai'?'/courses/assets/ai-book.webp':null
 if(hero)html=html.replace('</head>',`<link rel="preload" as="image" href="${hero}" fetchpriority="high"></head>`)
 await writeFile(`dist/courses/${path}index.html`,html)
}
console.log('Prerendered all four course routes with content-versioned assets.')
