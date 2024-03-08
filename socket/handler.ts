import { getInfo, type YtDLP } from "@resync-tv/yt-dlp"
import { Server } from "socket.io"

export const socketHandler = async (io: Server) => {
  console.log("✔️ Socket handler registered")

  io.on("connection", (socket) => {
    console.log("socket connected", socket.id)
    socket.on("disconnect", () => {
      console.log("socket disconnected", socket.id)
    })

    socket.on("yt-dlp", async (url: string, callback: (data: YtDLP) => void) => {
      const data = await getInfo(url)
      callback(data)
    })

    socket.on("echo", (...parameters) => socket.emit("echo", ...parameters))
  })
}
