import { renderToString } from 'react-dom/server'
import PublicSite from './components/site/PublicSite'
import {STATIC_RELEASE} from './lib/releaseMode'
import { isPrivatePath,routeForPath } from './lib/siteRoutes'
export function render(path){return isPrivatePath(path)?(STATIC_RELEASE?'<main style="min-height:100vh;background:#111513;color:white;padding:40px;font-family:sans-serif"><h1>Client portal awaiting activation</h1><p>Sign-in, registration and account setup are not available yet.</p><p><a href="mailto:info@ascore.ae" style="color:inherit">Email info@ascore.ae</a> · <a href="https://wa.me/971568555626" style="color:inherit">WhatsApp</a> · <a href="/" style="color:inherit">Back to site</a></p></main>':'<div class="min-h-screen bg-[#111513] text-white flex items-center justify-center">Loading client portal…</div>'):renderToString(<PublicSite page={routeForPath(path)||null}/>)}
