import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
const root=document.getElementById('root')
const app=<StrictMode><App/></StrictMode>
// Legacy private hash entries must not hydrate the public home document.
const privateHash=['#portal','#login','#signup','#admin-setup'].includes(window.location.hash)
if(root.hasChildNodes()&&!privateHash)hydrateRoot(root,app)
else createRoot(root).render(app)
