import type { Socket } from "socket.io-client"
import type { BackendEmits, FrontendEmits, RoomEmit, RoomState } from "$/room"

import { Ref, ref, watch } from "vue"
import { ls } from "./util"

import debug from "debug"
const log = debug("resync:resync.ts")

export type SocketOff = () => void

const capitalize = (str: string) => [...str][0].toUpperCase() + str.slice(1)

export default class Resync {
  private socket: Socket<BackendEmits, FrontendEmits>
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

    const offState = this.onState(state => {
      this.state.value = state
    })
    this.handlers.push(offState)
  }
  destroy = (): void => this.handlers.forEach(off => off())

  private eventHandler<E extends keyof BackendEmits>(event: E) {
    return (fn: BackendEmits[E]): SocketOff => {
      // @ts-expect-error I am clueless as to why this errors
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
  onSource = this.eventHandler("source")
  onPause = this.eventHandler("pause")
  onResume = this.eventHandler("resume")
  onSeekTo = this.eventHandler("seekTo")
  onRequestTime = this.eventHandler("requestTime")
  onNotify = this.eventHandler("notifiy")
  onState = this.eventHandler("state")
}
