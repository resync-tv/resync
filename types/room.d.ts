import type { MediaSourceAny } from "./mediaSource"

export interface RoomState<S = MediaSourceAny> {
  paused: boolean
  source: S | undefined
  lastSeekedTo: number
}

export interface RoomArg {
  roomID: string
}

export interface PlayContentArg extends RoomArg {
  source: string
  startFrom?: number
}

export type RoomEmit = (event: string, arg?: Record<string, any> | undefined, cb?: any) => void

export type NotifiedEvents =
  | "join"
  | "leave"
  | "playContent"
  | "pause"
  | "resume"
  | "seekTo"
  | "resync"
  | "playbackError"

export interface EventNotifiy {
  event: NotifiedEvents
  id: string
  name: string
  additional?: any
}

export interface VideoMetadata {
  videoHeight: number
  videoWidth: number
}
