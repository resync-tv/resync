import { EventNotification, NotifyEvents } from "$/room"
import { timestamp } from "./util"

type RenderNotification = {
  [k in NotifyEvents]: (n: EventNotification) => string
}

export const renderNotification: RenderNotification = {
  join: n => `${n.name} joined the room`,
  leave: n => `${n.name} left the room`,
  playContent: n => {
    if (n.additional.source) return `${n.name} changed the playing video`
    return `${n.name} stopped playback`
  },
  pause: n => `${n.name} paused`,
  resume: n => `${n.name} resumed`,
  seekTo: n => `${n.name} skipped to ${timestamp(n.additional.seconds)}`,
  resync: n => `${n.name} resync'd the room`,
  playbackError: n => `${n.name} encountered a playback error`,
  queue: n => `${n.name} queued a video`,
}
