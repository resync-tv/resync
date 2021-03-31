<script lang="ts">
import type { MediaType, MediaVideo } from "$/mediaSource"
import type { RoomState, VideoMetadata } from "$/room"

import { computed, defineComponent, inject, PropType, provide, ref, toRefs, watch } from "vue"
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
  },
  setup() {
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
      const maxW = 0.95
      const maxH = 0.7

      const minW = 0.3
      const minH = 0.4

      if (screenW.value * minW > videoW.value * m) m = (screenW.value / videoW.value) * minW
      if (screenH.value * minH > videoH.value * m) m = (screenH.value / videoH.value) * minH

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

    const showInteractionOverlay = ref(false)
    const requireUserInteraction = (): Promise<void> => {
      return new Promise(res => {
        showInteractionOverlay.value = true
        const stopWatching = watch(showInteractionOverlay, () => {
          stopWatching()
          res()
        })
      })
    }

    provide("requireUserInteraction", requireUserInteraction)

    return {
      onMetadata,
      sizeStyle,
      showInteractionOverlay,
      resync,
    }
  },
})
</script>

<template>
  <div
    class="rounded flex overflow-hidden relative light:shadow"
    :class="{ overlay: showInteractionOverlay }"
    :style="sizeStyle"
    id="player-wrapper"
  >
    <VideoPlayer @metadata="onMetadata" :style="sizeStyle" />
    <div
      class="transition-opacity overlay-gradient"
      :class="{ active: resync.paused.value }"
      id="controls"
    >
      <PlayerControls class="pointer-events-auto" />
    </div>
    <div
      class="bg-black flex flex-col h-full bg-opacity-85 w-full p-5 px-10 backdrop-blur absolute items-center justify-center"
      v-if="showInteractionOverlay"
    >
      <h1 class="text-error text-3xl">Playing with sound failed.</h1>
      <p class="mt-5 text-light text-center">
        This probably happened because you haven't interacted with the page yet.
      </p>

      <button
        class="bg-light rounded-full mt-10 text-dark py-3 px-10 bottom-1/8 uppercase absolute"
        @click="showInteractionOverlay = false"
      >
        enable sound
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.overlay-gradient {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);

  @apply flex h-1/4 w-full bottom-0 absolute items-end justify-center;
  @apply pointer-events-none;
}

.backdrop-blur {
  backdrop-filter: blur(5px);
}

#controls {
  opacity: 0;
}

#player-wrapper:hover > #controls,
#controls.active {
  opacity: 1;
}

#player-wrapper.overlay > #controls {
  opacity: 0;
}
</style>