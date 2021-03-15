import type { MediaSourceAny } from "./mediaSource"

export interface RoomState {
  paused: boolean
  source: MediaSourceAny | undefined
}

export interface RoomArg {
  roomID: string
}

export interface PlayContentArg extends RoomArg {
  source: string
  startFrom?: number
}

export type RoomEmit = (event: string, arg?: Record<string, any> | undefined, cb?: any) => void
