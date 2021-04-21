<script lang="ts">
import type { MediaType } from "$/mediaSource"
import type { VideoMetadata } from "$/room"

import { computed, defineComponent, inject, PropType, provide, ref, watch } from "vue"
import { debounce } from "ts-debounce"

import VideoPlayer from "@/components/VideoPlayer"
import PlayerControls from "@/components/PlayerControls.vue"

import Resync from "@/resync"

import { debug } from "@/util"
const log = debug("playerwrapper")

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

    const playerWrapper = ref<HTMLElement | null>(null)
    const fullscreenEnabled = ref(false)
    const toggleFullscreen = async () => {
      if (!playerWrapper.value) throw Error("player-wrapper ref not found")
      if (fullscreenEnabled.value) {
        await document.exitFullscreen()
        fullscreenEnabled.value = Boolean(document.fullscreenElement)
        return
      }

      try {
        await playerWrapper.value.requestFullscreen()
        fullscreenEnabled.value = Boolean(document.fullscreenElement)
      } catch (error) {
        log.extend("error")("fullscreen didn't work")
        throw error
      }
    }

    const sizeStyle = computed(() => {
      if (fullscreenEnabled) return "width:100%;height:100%"
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
      toggleFullscreen,
      playerWrapper,
      fullscreenEnabled,
    }
  },
})
</script>

<template>
  <div
    class="rounded flex overflow-hidden relative light:shadow"
    :class="{ overlay: showInteractionOverlay, rounded: !fullscreenEnabled }"
    :style="sizeStyle"
    id="player-wrapper"
    ref="playerWrapper"
  >
    <VideoPlayer @metadata="onMetadata" :style="sizeStyle" />

    <div class="overlay-gradient hover-overlay lower" :class="{ active: resync.paused.value }">
      <PlayerControls
        @fullscreen="toggleFullscreen"
        :fullscreenEnabled="fullscreenEnabled"
        class="pointer-events-auto"
      />
    </div>

    <div
      class="overlay-gradient hover-overlay upper"
      :class="{ active: resync.paused.value }"
      v-if="resync.state.value.source?.title"
    >
      <div class="flex h-15 w-full px-5 items-center justify-between relative">
        <p class="text-lg tracking-wide ellipsis">
          {{ resync.state.value.source?.title }}
        </p>
      </div>
    </div>

    <div class="interaction-overlay" v-if="showInteractionOverlay">
      <h1 class="text-error text-3xl">Playing with sound failed.</h1>
      <p class="mt-5 text-light text-center">
        This probably happened because you haven't interacted with the page yet.
      </p>
      <button class="interaction-button" @click="showInteractionOverlay = false">
        enable sound
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.overlay-gradient {
  @apply flex h-1/3 w-full absolute justify-center;
  @apply pointer-events-none text-light transition-opacity;
  --gradient: rgba(0, 0, 0, 0.333), rgba(0, 0, 0, 0.125) 30%, transparent;

  &.lower {
    background: linear-gradient(to top, var(--gradient));
    @apply items-end bottom-0;
  }

  &.upper {
    background: linear-gradient(to bottom, var(--gradient));
    @apply top-0 items-start;
  }
}

.ellipsis {
  @apply whitespace-nowrap overflow-ellipsis overflow-hidden;
}

.interaction-overlay {
  backdrop-filter: blur(5px);
  @apply bg-black flex flex-col h-full bg-opacity-85 w-full p-5 px-10;
  @apply absolute items-center justify-center;
}

.interaction-button {
  @apply bg-light rounded-full mt-10 text-dark py-3 px-10 bottom-1/8 uppercase absolute;
}

.hover-overlay {
  opacity: 0;
}

#player-wrapper:hover > .hover-overlay,
.hover-overlay.active {
  opacity: 1;
}

#player-wrapper.overlay > .hover-overlay {
  opacity: 0;
}
</style>