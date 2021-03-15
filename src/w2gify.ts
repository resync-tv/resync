import type { Socket } from "socket.io-client"
import type { RoomEmit } from "../types/room"

type AnyFunction = (...x: any[]) => any
type SocketOff = () => void
type W2GListener = (x: AnyFunction) => SocketOff

export interface W2Gify {
  playContent: (source: string) => void
  pause: () => void
  resume: () => void
  onPause: W2GListener
  onResume: W2GListener
}

export const w2gify = (socket: Socket, roomEmit: RoomEmit): W2Gify => {
  return {
    playContent: (source: string) => roomEmit("playContent", { source }),
    pause: () => roomEmit("pause"),
    resume: () => roomEmit("resume"),
    onPause: fn => {
      socket.on("pause", fn)
      return () => socket.off("pause", fn)
    },
    onResume: fn => {
      socket.on("resume", fn)
      return () => socket.off("resume", fn)
    },
  }
}
