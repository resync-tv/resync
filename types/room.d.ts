import type { MediaSourceAny } from "./mediaSource"

import { Server } from "socket.io"
import { Socket } from "socket.io-client"

export interface RoomState<S = MediaSourceAny> {
  paused: boolean
  source: S | undefined
  lastSeekedTo: number
}

export interface BackendEmits {
  notifiy: (eventNotification: EventNotifiy) => void
  source: (source: MediaSourceAny | undefined) => void
  pause: () => void
  resume: () => void
  seekTo: (seconds: number) => void
  requestTime: (cb: (number) => void) => void
}

interface FrontendEmitBase {
  roomID: string
}
interface FrontendEmitTime extends FrontendEmitBase {
  currentTime: number
}
export interface FrontendEmits {
  playContent: (x: FrontendEmitBase & { source: string; startFrom?: number }) => void
  pause: (x: FrontendEmitTime) => void
  resume: (x: FrontendEmitBase) => void
  seekTo: (x: FrontendEmitTime) => void
  resync: (x: FrontendEmitBase) => void
  playbackError: (x: FrontendEmitTime & { reason: string; name: string }) => void
  joinRoom: (x: FrontendEmitBase & { name: string }, cb: (state: RoomState) => void) => void
  leaveRoom: (x: FrontendEmitBase) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Tail<T extends any[]> = T extends [infer A, ...infer R] ? R : never

export type RoomEmit = <E extends keyof FrontendEmits>(
  event: E,
  arg?: Omit<Parameters<FrontendEmits[E]>[0], "roomID">,
  ...args: Tail<Parameters<FrontendEmits[E]>>
) => void

export type ResyncSocketFrontend = Socket<BackendEmits, FrontendEmits>
export type ResyncSocketBackend = Server<FrontendEmits, BackendEmits>

export type NotifyEvents =
  | "join"
  | "leave"
  | "playContent"
  | "pause"
  | "resume"
  | "seekTo"
  | "resync"
  | "playbackError"

export interface EventNotifiy {
  event: NotifyEvents
  id: string
  name: string
  additional?: any
}

export interface VideoMetadata {
  videoHeight: number
  videoWidth: number
}
