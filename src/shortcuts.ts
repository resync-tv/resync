import type Resync from "@/resync"
import type { MediaSessionAction } from "$/MediaSession"
import { debug, minMax } from "./util"

const setMediaHandler = (type: MediaSessionAction, fn: () => void) => {
  if (!navigator.mediaSession) return () => undefined

  navigator.mediaSession.setActionHandler(type, fn)
  return () => navigator.mediaSession?.setActionHandler(type, null)
}

const log = debug("shortcuts")

export default (resync: Resync): (() => void) => {
  log("registering shortcuts")

  const skip = (t: number) => {
    const time = minMax(resync.currentTime() + t, 0, resync.duration())
    resync.seekTo(time)
  }
  const pause = () => resync.pause(resync.currentTime())
  const volume = (v: number) => (resync.volume.value = minMax(resync.volume.value + v))

  const offMediaHandle = [
    setMediaHandler("play", () => resync.resume()),
    setMediaHandler("pause", () => pause()),
    setMediaHandler("nexttrack", () => skip(5)),
    setMediaHandler("previoustrack", () => skip(-5)),
  ]

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && resync.fullscreenEnabled) 
    resync.fullscreenEnabled.value = !resync.fullscreenEnabled.value;
  }, false)

  window.onkeydown = (event: KeyboardEvent) => {
    const { key } = event

    if (document.activeElement instanceof HTMLInputElement) return

    if (key === "ArrowRight") return skip(5)
    if (key === "ArrowLeft") return skip(-5)
    if (key === "l") return skip(10)
    if (key === "j") return skip(-10)

    if (key === "Home") return resync.seekTo(0)
    if (key === "End") {
      if (resync.state.value.queue.length) return resync.playQueued(0)
      else resync.playContent("")
    }

    if (key === "k" || key === " ")
      return resync.state.value.paused ? resync.resume() : pause()

    if (key === "m") return (resync.muted.value = !resync.muted.value)
    if (key === "ArrowUp") return volume(0.05)
    if (key === "ArrowDown") return volume(-0.05)

    if (key === "q") return log("TODO: toggle queue")

    if (key === "f") return log("TODO: fullscreen")

    if (key === "P") return log("TODO: previous video")
    if (key === "N") return log("TODO: next video")
  }
  const offKeydown = () => {
    window.onkeydown = null
    log("unregistering shortcuts")
  }

  return () => [...offMediaHandle, offKeydown].forEach(off => off())
}
