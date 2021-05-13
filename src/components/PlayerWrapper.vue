<script lang="ts">
import type { MediaType } from "$/mediaSource"
import type { VideoMetadata } from "$/room"

import {
  computed,
  defineComponent,
  inject,
  onMounted,
  PropType,
  provide,
  ref,
  watch,
} from "vue"
import { debounce } from "ts-debounce"

import VideoPlayer from "@/components/VideoPlayer"
import PlayerControls from "@/components/PlayerControls.vue"
import LoadingSpinner from "@/components/LoadingSpinner.vue"
import SvgIcon from "@/components/SvgIcon.vue"
import QueueList from "@/components/QueueList.vue"

import Resync from "@/resync"

import { debug } from "@/util"
const log = debug("playerwrapper")

export default defineComponent({
  name: "PlayerWrapper",
  components: {
    VideoPlayer,
    PlayerControls,
    LoadingSpinner,
    SvgIcon,
    QueueList,
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
      if (fullscreenEnabled.value) {
        await document.exitFullscreen()
        fullscreenEnabled.value = Boolean(document.fullscreenElement)
        return
      }

      try {
        if (!playerWrapper.value) throw Error("player-wrapper ref not found")
        await playerWrapper.value.requestFullscreen()
        fullscreenEnabled.value = Boolean(document.fullscreenElement)
      } catch (error) {
        log.extend("error")("fullscreen didn't work")
        throw error
      }
    }

    const sizeStyle = computed(() => {
      if (fullscreenEnabled.value) return "width:100%;height:100%"
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

    const copyURL = async (timestamp?: boolean) => {
      const clip = window.navigator.clipboard
      if (!clip) window.alert("please use a modern browser like chrome for this feature.")
      const source = resync.state.value.source?.originalSource
      let url = source?.youtubeID ? `http://youtu.be/${source.youtubeID}` : source?.url

      if (source?.youtubeID && timestamp) url += `?t=${Math.floor(resync.currentTime())}`

      if (url) await clip.writeText(url)
    }

    const openInNew = () => {
      const source = resync.state.value.source?.originalSource
      let url = source?.youtubeID ? `http://youtu.be/${source.youtubeID}` : source?.url
      window.open(url, "_blank")
    }

    const showQueue = ref(false)

    return {
      onMetadata,
      sizeStyle,
      showInteractionOverlay,
      resync,
      toggleFullscreen,
      playerWrapper,
      fullscreenEnabled,
      copyURL,
      openInNew,
      showQueue,
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

    <div
      id="queue-closer"
      class="h-full w-full absolute"
      v-if="showQueue"
      @click="showQueue = false"
    ></div>

    <transition name="queue">
      <div v-show="showQueue" class="queue-overlay">
        <QueueList
          @close="showQueue = false"
          @play="resync.playQueued"
          :queue="resync.state.value.queue"
        />
      </div>
    </transition>

    <div
      class="z-5 overlay-gradient hover-overlay lower"
      :class="{ active: resync.paused.value, hide: showQueue }"
    >
      <PlayerControls
        @fullscreen="toggleFullscreen"
        @queue="showQueue = !showQueue"
        :fullscreenEnabled="fullscreenEnabled"
        class="pointer-events-auto"
      />
    </div>

    <div
      class="overlay-gradient hover-overlay upper"
      :class="{ active: resync.paused.value, hide: showQueue }"
      v-if="resync.state.value.source?.title"
    >
      <div class="flex h-15 w-full px-5 items-center justify-between relative">
        <p class="text-lg tracking-wide ellipsis">
          {{ resync.state.value.source?.title }}
        </p>
        <div class="flex pointer-events-auto">
          <SvgIcon
            @click="copyURL()"
            title="copy source url"
            name="content_paste"
            class="source-icon"
          />
          <SvgIcon
            @click="copyURL(true)"
            v-if="resync.state.value.source.originalSource.youtubeID"
            title="copy source url with timestamp"
            name="content_paste_time"
            class="source-icon"
          />
          <SvgIcon
            @click="openInNew"
            title="open in new tab"
            name="open_in_new"
            class="source-icon"
          />
        </div>
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

    <div v-if="resync.state.value.membersLoading" class="overlay-loading-spinner">
      <LoadingSpinner />
    </div>
  </div>
</template>

<style scoped lang="scss">
.queue-overlay {
  @apply h-full right-0 absolute;
  @apply text-light;
  width: 50ch;
  min-width: 25ch;
  max-width: 100%;
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.25);

  @supports (backdrop-filter: blur(5px)) {
    backdrop-filter: blur(5px);
    background: rgba(0, 0, 0, 0.25);
  }
}

.queue-enter-active,
.queue-leave-active {
  transition: 500ms var(--ease-in-out-hard);
}

.queue-enter-from,
.queue-leave-to {
  right: -25ch;
  opacity: 0;
}

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

.overlay-loading-spinner {
  @apply h-full w-full absolute pointer-events-none;
  @apply flex items-center justify-center;
}

.ellipsis {
  @apply whitespace-nowrap overflow-ellipsis overflow-hidden;
}

.source-icon {
  @apply cursor-pointer mx-2;
  font-size: 22px;

  &:last-of-type {
    @apply mr-0;
  }
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

#player-wrapper.overlay > .hover-overlay,
.hover-overlay.hide {
  opacity: 0 !important;
  * {
    @apply pointer-events-none;
  }
}
</style>