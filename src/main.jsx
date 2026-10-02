import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { isPrivatePath } from './lib/siteRoutes'
const root=document.getElementById('root')
const app=<StrictMode><App/></StrictMode>
// Private pages contain a non-interactive placeholder, not the complete auth tree.
const privateHash=['#portal','#login','#signup','#admin-setup'].includes(window.location.hash)
const privateEntry=privateHash||isPrivatePath(window.location.pathname)
if(root.hasChildNodes()&&!privateEntry)hydrateRoot(root,app)
else createRoot(root).render(app)
