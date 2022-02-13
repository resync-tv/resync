import type { Server } from "socket.io"
import type { Socket } from "socket.io-client"

import type { EventNotification, RoomState, PublicMember } from "./room"
import type { MediaSourceAny } from "./mediaSource"
import { Category } from "sponsorblock-api"

type Callback<A = void> = (x: A) => void

type BackendEmitterBase<A = void> = (x: A) => void

interface PointerUpdate {
  member: PublicMember
  pos: [number, number]
  active: boolean
}

export interface BackendEmits {
  pointerUpdate: BackendEmitterBase<PointerUpdate[]>
  secret: BackendEmitterBase<string>
  notifiy: BackendEmitterBase<EventNotification>
  message: BackendEmitterBase<Message>
  source: BackendEmitterBase<MediaSourceAny | undefined>
  pause: BackendEmitterBase
  resume: BackendEmitterBase
  seekTo: BackendEmitterBase<number>
  requestTime: BackendEmitterBase<Callback<number>>
  state: BackendEmitterBase<RoomState>
}

interface RoomEmitBase {
  roomID: string
  secret?: string
}
interface RoomEmitTime extends RoomEmitBase {
  currentTime: number
}

type FrontendEmitterBase<A = RoomEmitBase, C = void> = (x: RoomEmitBase & A, c: C) => void
type FrontendEmitterTime<A = RoomEmitTime, C = void> = (x: RoomEmitTime & A, c: C) => void

export interface FrontendEmits {
  toggleSharedPointer: FrontendEmitterBase<>
  pointerUpdate: FrontendEmitterBase<{ pos: [number, number]; active: boolean }>
  changePlaybackSpeed: FrontendEmitterBase<{ newSpeed: number }>
  blockedToggle: FrontendEmitterBase<{ category: Category; newValue: boolean }>
  loop: FrontendEmitterBase<{ newState: boolean }>
  givePermission: FrontendEmitterBase<{
    id: string
    permission: Permission
    defaultValue: boolean
  }>
  removePermission: FrontendEmitterBase<{
    id: string
    permission: Permission
    defaultValue: boolean
  }>
  playContent: FrontendEmitterBase<{ source: string; startFrom?: number }>
  playQueued: FrontendEmitterBase<{ index: number }>
  removeQueued: FrontendEmitterBase<{ index: number }>
  queue: FrontendEmitterBase<{ source: string; startFrom?: number }>
  clearQueue: FrontendEmitterBase
  loaded: FrontendEmitterBase
  finished: FrontendEmitterBase
  pause: FrontendEmitterTime
  resume: FrontendEmitterBase
  seekTo: FrontendEmitterTime
  resync: FrontendEmitterBase
  playbackError: FrontendEmitterTime<{ reason: string; name: string }>
  joinRoom: FrontendEmitterBase<{ name: string }, Callback<RoomState>>
  leaveRoom: FrontendEmitterBase
  message: FrontendEmitterBase<{ msg: string }>
  getNewRandom: (c: Callback<string>) => void
  search: (query: string, c: Callback<any>) => void
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
