import type { MediaSourceAny } from "./mediaSource"

import type { Socket as BackendSocket } from "socket.io"

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
  | "removeQueued"
  | "clearQueue"

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

export interface Message {
  name: string
  msg: string
  key: string
}
