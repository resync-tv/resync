console.log("starting resync")
import "./sentry"

import server from "./server"

const port = Number(process.env.BACKEND_PORT || 3020)

server(port).then(() => console.log(`resync listening on ${port}`))
