import type { MediaSourceAny } from "./mediaSource"

import { Server, Socket as BackendSocket } from "socket.io"
import { Socket } from "socket.io-client"

export interface Member {
  name: string
  client: BackendSocket
}

export interface PublicMember extends Omit<Member, "client"> {
  id: string
}

export interface RoomState<S = MediaSourceAny> {
  paused: boolean
  source: S | undefined
  lastSeekedTo: number
  members: Array<PublicMember>
}

type Callback<T> = (x: T) => void

export interface BackendEmits {
  notifiy: (eventNotification: EventNotification) => void
  source: (source: MediaSourceAny | undefined) => void
  pause: () => void
  resume: () => void
  seekTo: (seconds: number) => void
  requestTime: (cb: Callback<number>) => void
  state: (state: RoomState) => void
}

interface RoomEmitBase {
  roomID: string
}
interface RoomEmitTime extends RoomEmitBase {
  currentTime: number
}
export interface FrontendEmits {
  playContent: (x: { source: string; startFrom?: number } & RoomEmitBase) => void
  pause: (x: RoomEmitTime) => void
  resume: (x: RoomEmitBase) => void
  seekTo: (x: RoomEmitTime) => void
  resync: (x: RoomEmitBase) => void
  playbackError: (x: RoomEmitTime & { reason: string; name: string }) => void
  joinRoom: (x: { name: string } & RoomEmitBase, cb: Callback<RoomState>) => void
  leaveRoom: (x: RoomEmitBase) => void
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

export interface EventNotification {
  event: NotifyEvents
  id: string
  key: string
  name: string
  additional?: any
}

export interface VideoMetadata {
  videoHeight: number
  videoWidth: number
}
