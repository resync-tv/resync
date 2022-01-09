console.log("starting resync")
import "./sentry"

import server from "./server"

let port = Number(process.env.BACKEND_PORT ?? 3020)
if (process.env.NODE_ENV === "staging") port = Number(process.env.STAGING_PORT ?? 6969)

server(port).then(() => console.log(`resync listening on ${port}`))
