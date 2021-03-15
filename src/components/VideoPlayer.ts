import type { W2Gify, SocketOff } from "../w2gify"
import type { MediaVideo } from "../../types/mediaSource"
import type { RoomState } from "../../types/room"

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
const log = debug("w2g:videoplayer")
const logRemote = log.extend("remote")
const logLocal = log.extend("local")

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

    const socketHandlers: SocketOff[] = []

    const w2gify = inject<W2Gify>("w2gify")
    if (!w2gify) throw new Error("w2gify injection failed")

    onMounted(async () => {
      if (!video.value) throw new Error("video ref is null")
      const currentTime = () => video.value?.currentTime || 0

      video.value.volume = 0.1
      if (state.value.paused) video.value.currentTime = state.value.lastSeekedTo
      else {
        // TODO pause upon resync request and let the server resume playback
        const start = performance.now()
        const requestedTime = await w2gify.requestTime()
        const initialCorrectedTime = requestedTime + (performance.now() - start) / 1e3

        log(`requested time ${requestedTime}, corrected ${initialCorrectedTime}`)

        const correctTime = () => {
          if (!video.value) return
          const correctedTime = requestedTime + (performance.now() - start) / 1e3
          log(`load correction ${correctedTime}`)
          video.value.currentTime = correctedTime
          video.value.removeEventListener("play", correctTime)
        }

        video.value.currentTime = initialCorrectedTime
        video.value.play()

        video.value.addEventListener("play", correctTime)
      }

      const offPause = w2gify.onPause(() => {
        logRemote("onPause")
        video.value?.pause()
      })
      socketHandlers.push(offPause)

      const offResume = w2gify.onResume(() => {
        logRemote("onResume")
        video.value?.play()
      })
      socketHandlers.push(offResume)

      const offSeekTo = w2gify.onSeekTo(seconds => {
        logRemote(`onSeekTo: ${seconds}`)
        if (!video.value) throw new Error("video ref is null (at onSeekTo)")

        video.value.currentTime = seconds
      })
      socketHandlers.push(offSeekTo)

      const offRequestTime = w2gify.onRequestTime(callback => {
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
        paused.value ? w2gify.resume() : w2gify.pause(currentTime())

      if (navigator.mediaSession) {
        navigator.mediaSession.setActionHandler("play", () => w2gify.resume())
        navigator.mediaSession.setActionHandler("pause", () => w2gify.pause(currentTime()))
      }
    })

    onBeforeUnmount(() => socketHandlers.forEach(h => h()))

    return () =>
      h("video", {
        src: src.value,
        class: ["max-w-3xl"],
        ref: video,
        disablePictureInPicture: true,
        preload: true,
      })
  },
})
