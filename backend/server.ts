import { createServer } from "http"
import { Server } from "socket.io"
import room from "./room"
import search from "./search"

import debug from "debug"
const log = debug("resync:server")

const isDev = process.env.NODE_ENV === "development"
log("dev", isDev)

let origin = isDev ? "*" : ["https://resync.tv", /\.netlify\.app$/]
if (process.env.NODE_ENV === "staging") {
  origin = ["https://staging.resync.tv", /\.netlify\.app$/]
}

export default (port: number): Promise<void> => {
  return new Promise((res, rej) => {
    {
      const httpServer = createServer()
      const io = new Server(httpServer, {
        cors: { origin },
      })

      io.on("connection", client => {
        log("client connected", client.id)
        client.on("disconnect", () => log("client disconnected", client.id))
      })

      room(io)
      search(io)

      httpServer.listen(port).on("listening", res).on("error", rej)
    }
  })
}
