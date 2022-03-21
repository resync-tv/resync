<script lang="ts">
import type { SocketOff } from "/@/resync"
import type Resync from "/@/resync"

import { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref, watch } from "vue"
import ResyncSlider from "/@/components/ResyncSlider.vue"
import SvgIcon from "/@/components/SvgIcon.vue"
import { bufferedArray, debug, minMax, timestamp } from "/@/util"

const log = debug("playercontrols")

export default defineComponent({
  name: "PlayerControls",
  components: { ResyncSlider, SvgIcon },
  props: {
    fullscreenEnabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["fullscreen", "queue"],
  setup(props) {
    const resync = inject<Resync>("resync")
    if (!resync) throw new Error("resync injection failed")

    const offHandlers: SocketOff[] = []
    const currentTime = ref(0)
    const duration = ref(0)
    const progress = computed(() => {
      return minMax(currentTime.value / duration.value)
    })
    const buffered = ref<number[][]>([])

    let interval: ReturnType<typeof setTimeout>
    const updateProgress = (once = false, current?: number) => {
      clearInterval(interval)

      currentTime.value = current ?? resync.currentTime()
      duration.value = resync.duration()
      buffered.value = bufferedArray(resync.buffered(), resync.duration())

      if (!once && (isNaN(progress.value) || !resync.paused.value)) {
        requestAnimationFrame(() => updateProgress())
      } else {
        log("stopped updating progress")
        interval = setInterval(() => {
          buffered.value = bufferedArray(resync.buffered(), resync.duration())
        }, 250)
      }
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

    const fullscreenStateIcon = computed(() => {
      if (props.fullscreenEnabled) return "fullscreen_exit"
      return "fullscreen"
    })

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
      fullscreenStateIcon,
      buffered,
    }
  },
})
</script>

<template>
  <div class="h-10 w-full relative">
    <div class="flex px-2 items-center justify-between">
      <div class="flex">
        <SvgIcon :name="playStateIcon" class="player-icon" @click="onPlayIconClick" />
        <SvgIcon
          v-if="resync.state.value.queue.length"
          name="skip_next"
          class="player-icon"
          @click="resync.playQueued(0)"
        />
        <SvgIcon
          v-if="resync.state.value.members.length > 1"
          name="cached"
          title="resync"
          class="player-icon small"
          @click="resync.resync()"
        />

        <div class="flex items-center volume">
          <SvgIcon
            :name="volumeStateIcon"
            class="player-icon small"
            @click="onVolumeIconClick"
          />
          <ResyncSlider
            :progress="resync.muted.value ? 0 : resync.volume.value"
            small
            immediate
            @value="onVolumeSlider"
          />
          <div class="font-timestamp mx-1 align-middle">
            {{ timestamp(currentTime) }} / {{ timestamp(duration) }}
          </div>
        </div>
      </div>

      <div class="flex">
        <SvgIcon
          name="playlist"
          title="show/hide queue"
          class="player-icon"
          @click="$emit('queue')"
        />
        <SvgIcon
          :name="fullscreenStateIcon"
          title="fullscreen"
          class="player-icon"
          @click="$emit('fullscreen')"
        />
      </div>
    </div>
    <ResyncSlider
      class="bottom-full w-full px-2 transform translate-y-1/2 absolute"
      :progress="progress"
      :buffered="buffered"
      :update-slack="3"
      @value="onProgressSliderValue"
    />
  </div>
</template>

<style scoped lang="scss">
.player-icon {
  @apply cursor-pointer my-2 mx-1;

  &.small {
    font-size: 20px;
    height: 24px;
  }
}

.volume {
  > .resync-slider {
    @apply transition transition-all;
    @apply mx-1;
    @apply opacity-0 w-0;
  }

  &:hover > .resync-slider,
  > .resync-slider.active {
    @apply opacity-100 w-15;
  }
}

.font-timestamp {
  font-family: "RobotoMonoTimestamp";
  font-size: 0.7em;
}
</style>
