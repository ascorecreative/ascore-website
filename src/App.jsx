import { lazy, Suspense, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import PublicSite from './components/site/PublicSite'
import { isPrivatePath, normalizePath, routeForPath } from './lib/siteRoutes'
import { updateMetadata } from './lib/updateMetadata'
const AuthPage=lazy(()=>import('./components/portal/AuthPage'))
const PortalLayout=lazy(()=>import('./components/portal/PortalLayout'))
const portalHashes=new Set(['#portal','#login','#signup','#admin-setup'])
export function PortalLoading(){return <div className="min-h-screen bg-[#111513] text-white flex items-center justify-center">Loading client portal…</div>}
function PrivateApp({hash,path}){
 const {isAuthenticated,loading}=useAuth()
 const mode=hash==='#admin-setup'||path==='/portal/setup/'?'setup':hash==='#signup'||path==='/portal/register/'?'signup':'login'
 const [entered,setEntered]=useState(false)
 if(loading)return <PortalLoading/>
 const workspace=isAuthenticated&&(entered||hash==='#portal'||(!hash&&path==='/portal/'))
 return <ErrorBoundary><Suspense fallback={<PortalLoading/>}>{workspace?<PortalLayout/>:<AuthPage key={mode} initialMode={mode} onAuthSuccess={()=>{setEntered(true);window.location.hash='portal'}}/>}</Suspense></ErrorBoundary>
}
export default function App(){
 const [location,setLocation]=useState(()=>({hash:window.location.hash,path:normalizePath(window.location.pathname)}))
 useEffect(()=>{const sync=()=>setLocation({hash:window.location.hash,path:normalizePath(window.location.pathname)});window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[])
 const privatePage=isPrivatePath(location.path)||portalHashes.has(location.hash)
 useEffect(()=>updateMetadata(location.path,{privatePage}),[location.path,privatePage])
 return privatePage?<AuthProvider><PrivateApp hash={location.hash} path={location.path}/></AuthProvider>:<ErrorBoundary><PublicSite page={routeForPath(location.path)||null}/></ErrorBoundary>
}
