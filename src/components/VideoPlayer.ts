import type { W2Gify, SocketOff } from "../w2gify"

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
import { MediaVideo } from "../../types/mediaSource"

import debug from "debug"
const log = debug("w2g:videoplayer")
const logRemote = log.extend("remote")
const logLocal = log.extend("local")

export default defineComponent({
  props: {
    source: { type: Object as PropType<MediaVideo>, required: true },
  },
  setup(props) {
    const { source } = toRefs(props)
    const src = computed(() => source.value.video[0].url)
    const video = ref<null | HTMLVideoElement>(null)
    const paused = ref(true)

    const socketHandlers: SocketOff[] = []

    const w2gify = inject<W2Gify>("w2gify")
    if (!w2gify) throw new Error("w2gify injection failed")

    onMounted(() => {
      if (!video.value) throw new Error("video ref is null")

      video.value.volume = 0.1
      const currentTime = () => video.value?.currentTime || 0

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
      })
  },
})
