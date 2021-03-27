import { createServer } from "http"
import { Server } from "socket.io"
import room from "./room"

import debug from "debug"
const log = debug("resync:index")

const isDev = process.env.NODE_ENV === "development"
log("dev", isDev)

const origin = isDev ? "*" : "https://resync.tv"
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin },
})
const port = Number(process.env.BACKEND_PORT || 3020)

io.on("connection", client => {
  log("client connected", client.id)
  client.on("disconnect", () => log("client disconnected", client.id))

  client.on("ping", (str, reply = () => 0) => {
    reply([...str].reverse().join(""))
  })
})

room(io)

httpServer.listen(port).on("listening", () => console.log(`resync listening on ${port}`))
