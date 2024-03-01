import { Server } from "socket.io"

export const socketHandler = async (io: Server) => {
  console.log("✔️ Socket handler registered")

  io.on("connection", (socket) => {
    console.log("socket connected", socket.id)
    socket.on("disconnect", () => {
      console.log("socket disconnected", socket.id)
    })

    socket.on("echo", (...parameters) => socket.emit("echo", ...parameters))
  })
}
