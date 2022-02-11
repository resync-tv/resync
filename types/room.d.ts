import type { MediaSourceAny } from "./mediaSource"

import { Socket as BackendSocket } from "socket.io"

import { Permission } from "../backend/permission"
import { Category } from "sponsorblock-api"

export interface Member {
  name: string
  client: BackendSocket
  permission: Permission
}

export interface PublicMember extends Omit<Member, "client"> {
  name: string
  id: string
  permission: Permission
}

export interface RoomState<S = MediaSourceAny> {
  defaultPermission: Permission
  playbackSpeed: number
  blockedCategories: Array<Category>
  looping: boolean
  paused: boolean
  source: S | undefined
  lastSeekedTo: number
  members: Array<PublicMember>
  membersLoading: number
  queue: MediaSourceAny[]
  sharedPointerEnabled: boolean
}

export type NotifyEvents =
  | "sponsorblock"
  | "looping"
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
