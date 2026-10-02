import { createPortalServer } from './app.mjs'
const portal = createPortalServer()
const port = Number(process.env.ASCORE_API_PORT || 8787)
// Local only. Production must sit behind a separately approved HTTPS reverse proxy.
portal.server.listen(port,'127.0.0.1',() => console.log(`Ascore local portal API: http://127.0.0.1:${port}`))
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { await portal.close(); process.exit(0) })
