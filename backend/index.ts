import { createServer } from "http"
import { Server } from "socket.io"
import room from "./room"

import debug from "debug"
const log = debug("resync:index")

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    // TODO
    origin: "*",
  },
})
const port = Number(process.env.BACKEND_PORT || 8888)

io.on("connection", client => {
  log("client connected", client.id)
  client.on("disconnect", () => log("client disconnected", client.id))

  client.on("ping", (str, reply = () => 0) => {
    reply([...str].reverse().join(""))
  })
})

room(io)

httpServer.listen(port).on("listening", () => console.log(`resync listening on ${port}`))
