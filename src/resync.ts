import type { Socket } from "socket.io-client"
import type { RoomState } from "/$/room"
import type { BackendEmits, ResyncSocketFrontend, RoomEmit } from "/$/socket"

import type { Ref } from "vue"
import { ref, watch } from "vue"
import { bufferedStub, capitalize, debug, ls } from "./util"
import { setMetadata } from "./mediaSession"
import type { MediaSourceAny } from "/$/mediaSource"

const log = debug("resync.ts")

export type SocketOff = () => void

export default class Resync {
  private socket: ResyncSocketFrontend
  private roomEmit: RoomEmit
  private roomID: string
  private handlers: SocketOff[] = []
  currentTime = (): number => NaN
  duration = (): number => NaN
  buffered = (): HTMLMediaElement["buffered"] => bufferedStub

  fullscreenEnabled: Ref<Boolean> | undefined
  paused = ref(true)
  volume = ref(ls("resync-volume") ?? 0.5)
  muted = ref(ls("resync-muted") ?? false)
  state: Ref<RoomState>

  constructor(socket: Socket, roomID: string) {
    this.socket = socket
    this.roomID = roomID
    this.roomEmit = (event, arg, ...args) => {
      log.extend("roomEmit")(event, { roomID, ...arg }, ...args)
      socket.emit(event, { roomID, ...arg }, ...args)
    }

    this.state = ref({
      paused: this.paused.value,
      source: undefined,
      lastSeekedTo: 0,
      members: [],
      membersLoading: 0,
      queue: [],
    })

    this.handlers.push(
      watch(this.volume, volume => {
        ls("resync-volume", volume)
      }),
      watch(this.muted, muted => {
        ls("resync-muted", muted)
      }),
      this.onState(state => {
        log("new state", state)
        this.state.value = state
      }),
      this.onSource(this.updateMediasession)
    )
  }
  destroy = (): void => this.handlers.forEach(off => off())

  private eventHandler<E extends keyof BackendEmits>(event: E) {
    return (fn: BackendEmits[E]): SocketOff => {
      // @ts-expect-error I am clueless as to why this errors
      this.socket.on(event, fn)
      log(`registered on${capitalize(event)} handler`)

      return () => {
        // @ts-expect-error I am clueless as to why this errors
        this.socket.off(event, fn)
        log(`unregistered on${capitalize(event)} handler`)
      }
    }
  }

  private updateMediasession = (source?: MediaSourceAny) => {
    if (source) setMetadata(source, `room: ${this.roomID}`)
  }

  static getNewRandom = (socket: ResyncSocketFrontend): Promise<string> => {
    return new Promise(res => {
      socket.emit("getNewRandom", res)
    })
  }

  search = (query: string): Promise<MediaSourceAny[]> => {
    return new Promise(res => this.socket.emit("search", query, res))
  }

  joinRoom = async (name: string): Promise<void> => {
    const join = () => {
      return new Promise<void>(res => {
        this.roomEmit("joinRoom", { name }, state => {
          log("initial room state", state)

          this.state.value = state
          this.updateMediasession(state.source)

          res()
        })
      })
    }

    const connect = () => {
      this.socket.off("connect", connect)
      join()
    }

    const disconnect = () => {
      this.socket.on("connect", connect)
    }

    this.socket.on("disconnect", disconnect)

    this.handlers.push(() => this.socket.off("disconnect", disconnect))
    this.handlers.push(() => this.roomEmit("leaveRoom"))

    await join()
  }

  playContent = (source: string): void => this.roomEmit("playContent", { source })
  queue = (source: string): void => this.roomEmit("queue", { source })
  playQueued = (index: number): void => this.roomEmit("playQueued", { index })
  clearQueue = (): void => this.roomEmit("clearQueue")
  removeQueued = (index: number): void => this.roomEmit("removeQueued", { index })
  loaded = (): void => this.roomEmit("loaded")
  finished = (): void => this.roomEmit("finished")
  pause = (currentTime: number): void => this.roomEmit("pause", { currentTime })
  resume = (): void => this.roomEmit("resume")
  seekTo = (currentTime: number): void => this.roomEmit("seekTo", { currentTime })
  resync = (): void => this.roomEmit("resync")
  message = (msg: string): void => this.roomEmit("message", { msg })

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
  onMessage = this.eventHandler("message")
}
