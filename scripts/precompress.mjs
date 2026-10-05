import {readdir,readFile,writeFile} from 'node:fs/promises'
import {extname,join} from 'node:path'
import {brotliCompressSync,gzipSync,constants} from 'node:zlib'
const extensions=new Set(['.html','.js','.css','.json','.svg','.glb','.txt','.xml'])
let count=0
async function compress(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name)
  if(entry.isDirectory()){await compress(path);continue}
  if(!extensions.has(extname(path)))continue
  const data=await readFile(path);if(data.length<1024)continue
  for(const [suffix,compressed] of [['br',brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:extname(path)==='.glb'?11:9}})],['gz',gzipSync(data,{level:9})]]){
   if(compressed.length<data.length*.9){await writeFile(`${path}.${suffix}`,compressed);count++}
  }
 }
}
await compress('dist');console.log(`Prepared ${count} compressed static representations; media ranges stay unchanged.`)
