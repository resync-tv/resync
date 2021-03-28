<script lang="ts">
import type { MediaType, MediaVideo } from "$/mediaSource"
import type { RoomState, VideoMetadata } from "$/room"

import { computed, defineComponent, inject, PropType, ref, toRefs } from "vue"
import { debounce } from "ts-debounce"

import VideoPlayer from "@/components/VideoPlayer"
import PlayerControls from "@/components/PlayerControls.vue"

import debug from "debug"
import Resync from "@/resync"
const log = debug("resync:playerwrapper")

export default defineComponent({
  name: "PlayerWrapper",
  components: {
    VideoPlayer,
    PlayerControls,
  },
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

    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

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

    const sizeStyle = computed(() => {
      return (
        `width:${videoW.value * sizeMultiplier.value}px;` +
        `height:${videoH.value * sizeMultiplier.value}px`
      )
    })

    return {
      videoW,
      videoH,
      sizeMultiplier,
      state,
      onMetadata,
      sizeStyle,
      paused: resync.paused,
    }
  },
})
</script>

<template>
  <div
    class="rounded flex overflow-hidden relative light:shadow"
    :style="sizeStyle"
    id="player-wrapper"
  >
    <VideoPlayer :state="state" @metadata="onMetadata" :style="sizeStyle" />
    <div class="transition-opacity overlay-gradient" :class="{ active: paused }" id="controls">
      <PlayerControls :state="state" class="pointer-events-auto" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.overlay-gradient {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);

  @apply flex h-1/4 w-full bottom-0 absolute items-end justify-center;
  @apply pointer-events-none;
}

#controls {
  opacity: 0;
}

#player-wrapper:hover > #controls,
#controls.active {
  opacity: 1;
}
</style>