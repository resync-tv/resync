import type { MediaType, MediaVideo } from "$/mediaSource"
import type { RoomState, VideoMetadata } from "$/room"

import { computed, defineComponent, h, PropType, ref, toRefs } from "vue"
import { debounce } from "ts-debounce"

import VideoPlayer from "./VideoPlayer"
import PlayerControls from "./PlayerControls.vue"

import debug from "debug"
const log = debug("resync:playerwrapper")

export default defineComponent({
  name: "PlayerWrapper",
  props: {
    type: {
      type: String as PropType<MediaType>,
      required: true,
    },
    state: {
      type: Object as PropType<RoomState<MediaVideo>>,
      required: true,
    },
  },
  setup(props) {
    const { state } = toRefs(props)
    const videoW = ref(16)
    const videoH = ref(9)
    const onMetadata = (metadata: VideoMetadata) => {
      videoW.value = metadata.videoWidth
      videoH.value = metadata.videoHeight
    }

    const screenW = ref(window.document.body.scrollWidth)
    const screenH = ref(window.document.body.scrollHeight)
    const refreshScreenSize = () => {
      screenW.value = window.document.body.scrollWidth
      screenH.value = window.document.body.scrollHeight
    }
    const refreshScreenSizeDebounced = debounce(() => {
      log("debounced resize")
      refreshScreenSize()
    }, 500)

    window.onresize = () => {
      refreshScreenSize()
      refreshScreenSizeDebounced()
    }

    const sizeMultiplier = computed(() => {
      let m = 1
      const maxH = 0.7
      const maxW = 0.95

      if (screenW.value * maxW < videoW.value * m) m = (screenW.value / videoW.value) * maxW
      if (screenH.value * maxH < videoH.value * m) m = (screenH.value / videoH.value) * maxH

      return m
    })

    // TODO maybe start using JSX https://github.com/vitejs/vite/tree/main/packages/plugin-vue-jsx
    return () =>
      h(
        "div",
        {
          class: "rounded overflow-hidden flex light:shadow relative",
          style:
            `width: ${videoW.value * sizeMultiplier.value}px;` +
            `height: ${videoH.value * sizeMultiplier.value}px`,
        },
        [
          // @ts-expect-error it complains when the component expects props i think // TODO open issue
          h(VideoPlayer, {
            state,
            onMetadata,
            style:
              `width: ${videoW.value * sizeMultiplier.value}px;` +
              `height: ${videoH.value * sizeMultiplier.value}px`,
          }),
          h(
            "div",
            {
              class:
                "absolute bottom-0 h-1/3 w-full flex items-end justify-center pointer-events-none",
              style: "background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)",
            },
            [
              // @ts-expect-error it complains when the component expects props i think // TODO open issue
              h(PlayerControls, {
                state,
                class: "pointer-events-auto",
              }),
            ]
          ),
        ]
      )
  },
})
