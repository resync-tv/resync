import type { Socket } from "socket.io-client"
import type { RoomEmit } from "../types/room"

import debug from "debug"
const log = debug("w2g:w2gify")

type GenericFn<T = void> = (x: T) => void
export type SocketOff = GenericFn
type NoArgumentsNorReturn = GenericFn
type W2GListener<T = NoArgumentsNorReturn> = (x: T) => SocketOff

export interface W2Gify {
  playContent: (source: string) => void
  pause: (currentTime: number) => void
  resume: () => void
  seekTo: (currentTime: number) => void
  requestTime: () => Promise<number>
  onPause: W2GListener
  onResume: W2GListener
  onSeekTo: W2GListener<GenericFn<number>>
  onRequestTime: W2GListener<GenericFn<GenericFn<number>>>
}

export const w2gify = (socket: Socket, roomEmit: RoomEmit): W2Gify => {
  return {
    playContent: (source: string) => roomEmit("playContent", { source }),
    pause: currentTime => roomEmit("pause", { currentTime }),
    resume: () => roomEmit("resume"),
    seekTo: currentTime => roomEmit("seekTo", { currentTime }),
    requestTime: () => new Promise(res => roomEmit("requestTime", {}, res)),
    onPause: fn => {
      socket.on("pause", fn)
      log(`registered onPause handler`)

      return () => {
        socket.off("pause", fn)
        log(`unregistered onPause handler`)
      }
    },
    onResume: fn => {
      socket.on("resume", fn)
      log(`registered onResume handler`)

      return () => {
        socket.off("resume", fn)
        log(`unregistered onResume handler`)
      }
    },
    onSeekTo: fn => {
      socket.on("seekTo", fn)
      log(`registered onSeekTo handler`)

      return () => {
        socket.off("seekTo", fn)
        log(`unregistered onSeekTo handler`)
      }
    },
    onRequestTime: fn => {
      socket.on("requestTime", fn)
      log(`registered onRequestTime handler`)

      return () => {
        socket.off("requestTime", fn)
        log(`unregistered onRequestTime handler`)
      }
    },
  }
}
