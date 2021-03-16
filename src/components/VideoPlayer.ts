import type { W2Gify, SocketOff } from "@/w2gify"
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
const log = debug("w2g:videoplayer")
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

    const w2gify = inject<W2Gify>("w2gify")
    if (!w2gify) throw new Error("w2gify injection failed")

    onMounted(async () => {
      if (!video.value) throw new Error("video ref is null")
      const currentTime = () => video.value?.currentTime || 0

      video.value.volume = 0.1
      if (state.value.paused) {
        autoplay.value = false
        video.value.currentTime = state.value.lastSeekedTo
      } else {
        autoplay.value = true
        w2gify.resync()
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
        w2gify.playbackError({ reason, name }, currentTime())
      }

      const offPause = w2gify.onPause(() => {
        logRemote("onPause")
        autoplay.value = false
        video.value?.pause()
      })
      socketHandlers.push(offPause)

      const offResume = w2gify.onResume(() => {
        logRemote("onResume")
        autoplay.value = true
        video.value?.play().catch(onPlaybackError)
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
        muted: muted.value,
        autoplay: autoplay.value,
      })
  },
})
