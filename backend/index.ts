console.log("starting resync")
import "./sentry"

import { createServer } from "http"
import { Server } from "socket.io"
import room from "./room"
import search from "./search"

import debug from "debug"
const log = debug("resync:index")

const isDev = process.env.NODE_ENV === "development"
log("dev", isDev)

const origin = isDev ? "*" : ["https://resync.tv", /\.netlify\.app$/]
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin },
})
const port = Number(process.env.BACKEND_PORT || 3020)

io.on("connection", client => {
  log("client connected", client.id)
  client.on("disconnect", () => log("client disconnected", client.id))
})

room(io)
search(io)

httpServer.listen(port).on("listening", () => console.log(`resync listening on ${port}`))
