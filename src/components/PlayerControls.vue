<script lang="ts">
import type { MediaVideo } from "$/mediaSource"
import type { RoomState } from "$/room"

import Resync, { SocketOff } from "@/resync"

import {
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
  toRefs,
} from "vue"
import ResyncSlider from "@/components/ResyncSlider.vue"

import debug from "debug"
const log = debug("resync:playercontrols")

export default defineComponent({
  components: { ResyncSlider },
  name: "PlayerControls",
  props: {
    state: { type: Object as PropType<RoomState<MediaVideo>>, required: true },
  },
  setup(props) {
    const { state } = toRefs(props)

    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    const socketHandlers: SocketOff[] = []
    const paused = ref(true)
    const volume = ref(resync.volume())
    const progress = ref(0)

    paused.value = state.value.paused

    const updateProgress = (once = false, current?: number) => {
      const currentTime = current ?? resync.currentTime()
      const duration = resync.duration()
      progress.value = Math.max(0, Math.min(1, currentTime / duration))
      // log("updateProgress", currentTime, duration)

      if (!once && (isNaN(progress.value) || !paused.value)) {
        requestAnimationFrame(() => updateProgress())
      }
    }
    updateProgress()
    onMounted(() => {
      updateProgress()
      volume.value = resync.volume()
    })

    const offPause = resync.onPause(() => {
      paused.value = true
    })
    socketHandlers.push(offPause)

    const offResume = resync.onResume(() => {
      paused.value = false
      updateProgress()
    })
    socketHandlers.push(offResume)

    const offSeekTo = resync.onSeekTo(to => {
      updateProgress(true, to)
    })
    socketHandlers.push(offSeekTo)

    onBeforeUnmount(() => socketHandlers.forEach(off => off()))

    const playStateIcon = computed(() => (paused.value ? "play_arrow" : "pause"))
    const volumeStateIcon = computed(() => {
      if (volume.value === 0) return "volume_mute"
      if (volume.value < 0.5) return "volume_down"
      else return "volume_up"
    })

    const onPlayIconClick = () => {
      paused.value ? resync.resume() : resync.pause(resync.currentTime())
    }

    const onVolumeIconClick = () => {
      volume.value = volume.value ? 0 : 0.1
      resync.setVolume(volume.value)
    }

    const onSliderValue = (value: number) => {
      resync.seekTo(resync.duration() * value)
    }

    return {
      playStateIcon,
      volumeStateIcon,
      onPlayIconClick,
      onVolumeIconClick,
      progress,
      onSliderValue,
    }
  },
})
</script>

<template>
  <div class="h-10 text-white w-full relative">
    <div class="flex px-2 items-center justify-between">
      <div>
        <span class="mi player-icon" @click="onPlayIconClick">{{ playStateIcon }}</span>
        <span class="mi player-icon">skip_next</span>
        <span class="mi player-icon" @click="onVolumeIconClick">{{ volumeStateIcon }}</span>
      </div>
      <div>
        <span class="mi player-icon">fullscreen</span>
      </div>
    </div>
    <ResyncSlider
      class="bottom-full w-full px-2 transform translate-y-1/2 absolute"
      :progress="progress"
      @value="onSliderValue"
      :updateSlack="3"
    />
  </div>
</template>

<style scoped>
.player-icon {
  @apply cursor-pointer my-2 mx-1;
}
</style>