import type { W2Gify } from "../w2gify"

import { computed, defineComponent, h, inject, onMounted, PropType, ref, toRefs } from "vue"
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

    const w2gify = inject<W2Gify>("w2gify")
    if (!w2gify) throw new Error("w2gify injection failed")

    onMounted(() => {
      if (!video.value) throw new Error("video ref is null")

      video.value.volume = 0.1

      w2gify.onPause(() => {
        logRemote("onPause")
        video.value?.pause()
      })
      w2gify.onResume(() => {
        logRemote("onResume")
        video.value?.play()
      })

      video.value.onpause = () => {
        logLocal(`paused: ${paused.value}`)
        paused.value = true
      }
      video.value.onplay = () => {
        logLocal(`paused: ${paused.value}`)
        paused.value = false
      }

      video.value.onclick = () => (paused.value ? w2gify.resume() : w2gify.pause())

      if (navigator.mediaSession) {
        navigator.mediaSession.setActionHandler("play", () => w2gify.resume())
        navigator.mediaSession.setActionHandler("pause", () => w2gify.pause())
      }
    })

    return () =>
      h("video", {
        src: src.value,
        class: ["max-w-3xl"],
        ref: video,
        disablePictureInPicture: true,
      })
  },
})
