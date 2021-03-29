import type { Socket } from "socket.io-client"
import type { BackendEmits, EventNotifiy, RoomEmit, RoomState } from "$/room"
import type { MediaSourceAny } from "$/mediaSource"

import { Ref, ref, watch } from "vue"
import { ls } from "./util"

import debug from "debug"
const log = debug("resync:resync.ts")

type Fn<T = void> = (x: T) => void
type AnyFn = (...x: any[]) => any
export type SocketOff = Fn

const capitalize = (str: string) => [...str][0].toUpperCase() + str.slice(1)

export default class Resync {
  private socket: Socket<BackendEmits>
  private roomEmit: RoomEmit
  private handlers: SocketOff[] = []
  currentTime = (): number => NaN
  duration = (): number => NaN

  paused = ref(true)
  volume = ref(ls<number>("resync-volume") ?? 0.1)
  state: Ref<RoomState> = ref({ paused: true, source: undefined, lastSeekedTo: 0 })

  constructor(socket: Socket, roomEmit: RoomEmit) {
    this.socket = socket
    this.roomEmit = roomEmit

    const volumeWatcher = watch(this.volume, vol => {
      ls<number>("resync-volume", vol)
    })
    this.handlers.push(volumeWatcher)
  }
  destroy = (): void => this.handlers.forEach(off => off())

  private EventHandler<T extends AnyFn = Fn>(event: keyof BackendEmits) {
    return (fn: T): SocketOff => {
      this.socket.on(event, fn)
      log(`registered on${capitalize(event)} handler`)

      return () => {
        this.socket.off(event, fn)
        log(`unregistered on${capitalize(event)} handler`)
      }
    }
  }

  playContent = (source: string): void => {
    this.roomEmit("playContent", { source })
  }
  pause = (currentTime: number): void => {
    this.roomEmit("pause", { currentTime })
  }
  resume = (): void => {
    this.roomEmit("resume")
  }
  seekTo = (currentTime: number): void => {
    this.roomEmit("seekTo", { currentTime })
  }
  resync = (): void => {
    this.roomEmit("resync")
  }
  playbackError = (error: { reason: string; name: string }, currentTime: number): void => {
    this.roomEmit("playbackError", { ...error, currentTime })
  }
  onSource = this.EventHandler<Fn<MediaSourceAny | undefined>>("source")
  onPause = this.EventHandler<Fn>("pause")
  onResume = this.EventHandler<Fn>("resume")
  onSeekTo = this.EventHandler<Fn<number>>("seekTo")
  onRequestTime = this.EventHandler<Fn<Fn<number>>>("requestTime")
  onNotify = this.EventHandler<Fn<EventNotifiy>>("notifiy")
}
