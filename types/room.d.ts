import type { MediaSourceAny } from "./mediaSource"

export interface RoomState {
  paused: boolean
  source: MediaSourceAny | undefined
}
