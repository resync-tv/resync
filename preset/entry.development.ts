import { trapUnhandledNodeErrors } from "#internal/nitro/utils"
import "#internal/nitro/virtual/polyfill"
import { toNodeListener } from "h3"
import { mkdirSync } from "node:fs"
import { Server } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parentPort, threadId } from "node:worker_threads"
import { Server as SocketServer } from "socket.io"
import { isWindows, provider } from "std-env"
import { socketHandler } from "~/socket/handler"
const nitroApp = useNitroApp()

const server = new Server(toNodeListener(nitroApp.h3App))

function getAddress() {
  if (
    provider === "stackblitz" ||
    process.env.NITRO_NO_UNIX_SOCKET ||
    process.versions.bun
  ) {
    return 0
  }
  const socketName = `worker-${process.pid}-${threadId}.sock`
  if (isWindows) {
    return join("\\\\.\\pipe\\nitro", socketName)
  } else {
    const socketDirectory = join(tmpdir(), "nitro")
    mkdirSync(socketDirectory, { recursive: true })
    return join(socketDirectory, socketName)
  }
}

const listenAddress = getAddress()
server.listen(listenAddress, () => {
  const _address = server.address()
  parentPort?.postMessage({
    event: "listen",
    address:
      typeof _address === "string"
        ? { socketPath: _address }
        : { host: "localhost", port: _address?.port },
  })
})

const io = new SocketServer(server, {
  transports: ["polling"], // Added on dev because hmr keeps breaking when socket.io websocket connects
})
socketHandler(io)
nitroApp.hooks.hook("request", (event) => {
  event["_socket"] = io
})

// Trap unhandled errors
trapUnhandledNodeErrors()

// Graceful shutdown
async function onShutdown() {
  await nitroApp.hooks.callHook("close")
}

parentPort?.on("message", async (message) => {
  if (message && message.event === "shutdown") {
    await onShutdown()
    parentPort?.postMessage({ event: "exit" })
  }
})
