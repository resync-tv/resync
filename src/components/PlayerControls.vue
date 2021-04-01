<script lang="ts">
import Resync, { SocketOff } from "@/resync"

import { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref, watch } from "vue"
import ResyncSlider from "@/components/ResyncSlider.vue"
import { debug, timestamp } from "@/util"

const log = debug("playercontrols")

export default defineComponent({
  components: { ResyncSlider },
  name: "PlayerControls",
  setup() {
    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    const offHandlers: SocketOff[] = []
    const currentTime = ref(0)
    const duration = ref(0)
    const progress = computed(() => {
      return Math.max(0, Math.min(1, currentTime.value / duration.value))
    })

    const updateProgress = (once = false, current?: number) => {
      currentTime.value = current ?? resync.currentTime()
      duration.value = resync.duration()
      // log("updateProgress", currentTime, duration)

      if (!once && (isNaN(progress.value) || !resync.paused.value)) {
        requestAnimationFrame(() => updateProgress())
      } else log("stopped updating progress")
    }
    updateProgress()
    onMounted(() => updateProgress())

    const playWatcher = watch(resync.paused, () => updateProgress())
    offHandlers.push(playWatcher)

    const offSeekTo = resync.onSeekTo(to => {
      updateProgress(true, to)
    })
    offHandlers.push(offSeekTo)

    onBeforeUnmount(() => offHandlers.forEach(off => off()))

    const playStateIcon = computed(() => (resync.paused.value ? "play_arrow" : "pause"))
    const volumeStateIcon = computed(() => {
      if (resync.muted.value) return "volume_off"
      if (resync.volume.value === 0) return "volume_mute"
      if (resync.volume.value < 0.5) return "volume_down"
      else return "volume_up"
    })

    const onPlayIconClick = () => {
      resync.paused.value ? resync.resume() : resync.pause(resync.currentTime())
    }

    const onVolumeIconClick = () => {
      if (!resync.muted.value && resync.volume.value === 0) {
        resync.volume.value = 0.3

        return
      }

      resync.muted.value = !resync.muted.value
    }

    const onVolumeSlider = (value: number) => {
      resync.muted.value = false
      resync.volume.value = value
    }

    const onProgressSliderValue = (value: number) => {
      log("onProgressSliderValue", value)
      resync.seekTo(resync.duration() * value)
    }

    return {
      playStateIcon,
      volumeStateIcon,
      onPlayIconClick,
      onVolumeIconClick,
      onVolumeSlider,
      progress,
      onProgressSliderValue,
      resync,
      currentTime,
      duration,
      timestamp,
    }
  },
})
</script>

<template>
  <div class="h-10 w-full relative">
    <div class="flex px-2 items-center justify-between">
      <div class="flex">
        <span class="mi player-icon" @click="onPlayIconClick">{{ playStateIcon }}</span>
        <span class="mi player-icon">skip_next</span>
        <div class="flex items-center volume">
          <span class="mi player-icon" @click="onVolumeIconClick">{{ volumeStateIcon }}</span>
          <ResyncSlider
            :progress="resync.muted.value ? 0 : resync.volume.value"
            @value="onVolumeSlider"
            small
            immediate
          />
          <div class="font-mono mx-1 text-xs align-middle">
            {{ timestamp(currentTime) }} / {{ timestamp(duration) }}
          </div>
        </div>
      </div>
      <div>
        <span class="mi player-icon">fullscreen</span>
      </div>
    </div>
    <ResyncSlider
      class="bottom-full w-full px-2 transform translate-y-1/2 absolute"
      :progress="progress"
      @value="onProgressSliderValue"
      :updateSlack="3"
    />
  </div>
</template>

<style scoped lang="scss">
.player-icon {
  @apply cursor-pointer my-2 mx-1;
}

.volume {
  > .resync-slider {
    @apply transition transition-all;
    @apply mx-1;
    @apply w-0 opacity-0;
  }

  &:hover > .resync-slider,
  > .resync-slider.active {
    @apply w-15 opacity-100;
  }
}
</style>