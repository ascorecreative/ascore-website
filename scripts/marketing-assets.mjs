import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
export async function marketingAssets(html){
 const tags=await Promise.all(['css','js'].map(async ext=>{const bytes=await readFile(`public/marketing-consent.${ext}`),version=createHash('sha256').update(bytes).digest('hex').slice(0,12),url=`/marketing-consent.${ext}?v=${version}`;return ext==='css'?`<link rel="stylesheet" href="${url}">`:`<script src="${url}" defer></script>`}))
 return html.replace('</head>',tags.join('\n')+'\n</head>')
}
