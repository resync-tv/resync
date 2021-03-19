import type { Resync, SocketOff } from "@/resync"
import type { MediaVideo } from "$/mediaSource"
import type { RoomState } from "$/room"

import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
  toRefs,
} from "vue"

import debug from "debug"
const log = debug("resync:videoplayer")
const logRemote = log.extend("remote")
const logLocal = log.extend("local")

const wait = (t: number): Promise<void> => new Promise(r => setTimeout(r, t))

export default defineComponent({
  props: {
    state: { type: Object as PropType<RoomState<MediaVideo>>, required: true },
  },
  setup(props) {
    const { state } = toRefs(props)
    const { source } = toRefs(state.value)

    const src = computed(() => source.value?.video[0].url)
    const video = ref<null | HTMLVideoElement>(null)
    const paused = ref(true)
    const muted = ref(false)
    const autoplay = ref(false)

    const socketHandlers: SocketOff[] = []

    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    onMounted(async () => {
      if (!video.value) throw new Error("video ref is null")
      const currentTime = () => video.value?.currentTime || 0

      video.value.volume = 0.1
      if (state.value.paused) {
        autoplay.value = false
        video.value.currentTime = state.value.lastSeekedTo
      } else {
        autoplay.value = true
        resync.resync()
      }

      const onPlaybackError = async (err: DOMException): Promise<any> => {
        const error = log.extend("error")
        error(`${err.name}: ${err.message}`)

        if (!muted.value) {
          error("trying to play the video muted")

          muted.value = true
          await wait(100)
          return video.value
            ?.play()
            .catch(onPlaybackError)
            .then(() => {
              // TODO show unmute button
            })
        }

        error("playback still failed when muted")
        const reason = err.message.split(". ")[0]
        const { name } = err
        resync.playbackError({ reason, name }, currentTime())
      }

      const offPause = resync.onPause(() => {
        logRemote("onPause")
        autoplay.value = false
        video.value?.pause()
      })
      socketHandlers.push(offPause)

      const offResume = resync.onResume(() => {
        logRemote("onResume")
        autoplay.value = true
        muted.value = false
        video.value?.play().catch(onPlaybackError)
      })
      socketHandlers.push(offResume)

      const offSeekTo = resync.onSeekTo(seconds => {
        logRemote(`onSeekTo: ${seconds}`)
        if (!video.value) throw new Error("video ref is null (at onSeekTo)")

        video.value.currentTime = seconds
      })
      socketHandlers.push(offSeekTo)

      const offRequestTime = resync.onRequestTime(callback => {
        logRemote(`onRequestTime`)
        if (!video.value) throw new Error("video ref is null (at onRequestTime)")

        callback(video.value.currentTime)
      })
      socketHandlers.push(offRequestTime)

      video.value.onpause = () => {
        logLocal(`paused: ${paused.value}`)
        paused.value = true
      }
      video.value.onplay = () => {
        logLocal(`paused: ${paused.value}`)
        paused.value = false
      }

      video.value.onclick = () =>
        paused.value ? resync.resume() : resync.pause(currentTime())

      if (navigator.mediaSession) {
        navigator.mediaSession.setActionHandler("play", () => resync.resume())
        navigator.mediaSession.setActionHandler("pause", () => resync.pause(currentTime()))
      }
    })

    onBeforeUnmount(() => socketHandlers.forEach(h => h()))

    return () =>
      h("video", {
        src: src.value,
        class: ["max-w-3xl", "rounded"],
        ref: video,
        disablePictureInPicture: true,
        preload: "auto",
        muted: muted.value,
        autoplay: autoplay.value,
      })
  },
})
