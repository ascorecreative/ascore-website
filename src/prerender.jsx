import { renderToString } from 'react-dom/server'
import PublicSite from './components/site/PublicSite'
import { isPrivatePath,routeForPath } from './lib/siteRoutes'
export function render(path){return isPrivatePath(path)?'<div class="min-h-screen bg-[#111513] text-white flex items-center justify-center">Loading client portal…</div>':renderToString(<PublicSite page={routeForPath(path)||null}/>)}
