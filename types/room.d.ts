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
  membersLoading: number
  queue: MediaSourceAny[]
}

type Callback<A = void> = (x: A) => void

type BackendEmitterBase<A = void> = (x: A) => void

export interface BackendEmits {
  notifiy: BackendEmitterBase<EventNotification>
  source: BackendEmitterBase<MediaSourceAny | undefined>
  pause: BackendEmitterBase
  resume: BackendEmitterBase
  seekTo: BackendEmitterBase<number>
  requestTime: BackendEmitterBase<Callback<number>>
  state: BackendEmitterBase<RoomState>
}

interface RoomEmitBase {
  roomID: string
}
interface RoomEmitTime extends RoomEmitBase {
  currentTime: number
}

type FrontendEmitterBase<A = RoomEmitBase, C = void> = (x: RoomEmitBase & A, c: C) => void
type FrontendEmitterTime<A = RoomEmitTime, C = void> = (x: RoomEmitTime & A, c: C) => void

export interface FrontendEmits {
  playContent: FrontendEmitterBase<{ source: string; startFrom?: number }>
  playQueued: FrontendEmitterBase<{ index: number }>
  queue: FrontendEmitterBase<{ source: string; startFrom?: number }>
  loaded: FrontendEmitterBase
  finished: FrontendEmitterBase
  pause: FrontendEmitterTime
  resume: FrontendEmitterBase
  seekTo: FrontendEmitterTime
  resync: FrontendEmitterBase
  playbackError: FrontendEmitterTime<{ reason: string; name: string }>
  joinRoom: FrontendEmitterBase<{ name: string }, Callback<RoomState>>
  leaveRoom: FrontendEmitterBase
  getNewRandom: (c: Callback<string>) => void
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
  | "queue"

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
