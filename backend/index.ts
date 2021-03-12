import { createServer } from "http"
import { Server } from "socket.io"

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
})
const port = Number(process.env.BACKEND_PORT || 8888)

io.on("connection", client => {
  console.log("client connected", client.id)

  client.on("ping", (str, reply = () => 0) => {
    reply([...str].reverse().join(""))
  })
})

httpServer.listen(port).on("listening", () => console.log(`listening on ${port}`))
