import io from "socket.io-client"

const socket = io()
export const useSocket = () => {
  const state = {
    connected: ref(false),
    emit: socket.emit.bind(socket),
    on: socket.on.bind(socket),
  }

  socket.on("connect", () => {
    state.connected.value = true
  })

  socket.on("disconnect", () => {
    state.connected.value = false
  })

  state.connected.value = socket.connected
  return state
}
