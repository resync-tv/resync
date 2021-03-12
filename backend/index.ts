import { createServer } from "http"
import { Server } from "socket.io"

import youtube from "./youtube"
import { dev } from "./util"

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    // TODO
    origin: "*",
  },
})
const port = Number(process.env.BACKEND_PORT || 8888)

io.on("connection", client => {
  dev.log("client connected", client.id)
  client.on("disconnect", () => dev.log("client disconnected", client.id))

  client.on("ping", (str, reply = () => 0) => {
    reply([...str].reverse().join(""))
  })
})

youtube(io)

httpServer.listen(port).on("listening", () => console.log(`w2g-next listening on ${port}`))
