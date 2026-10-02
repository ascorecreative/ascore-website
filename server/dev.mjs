import { spawn } from 'node:child_process'
const children=[spawn(process.execPath,['--env-file-if-exists=.env.server','server/index.mjs'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'inherit'})]
let stopping=false
const stop=()=>{if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM')}
for(const child of children)child.on('exit',code=>{stop();process.exitCode=code||0})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop)
