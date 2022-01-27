<script setup lang="ts">
import Resync, { SocketOff } from "@/resync"
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  defineProps,
  defineEmits,
} from "vue"
import ResyncSlider from "@/components/ResyncSlider.vue"
import SvgIcon from "@/components/SvgIcon.vue"
import { bufferedArray, debug, minMax, timestamp } from "@/util"
import { Permission } from "../../backend/permission"

const log = debug("playercontrols")

const emit = defineEmits(["fullscreen", "queue", "settings"])
const props = defineProps({
  fullscreenEnabled: {
    type: Boolean,
    default: false,
  },
})

const resync = inject<Resync>("resync")
if (!resync) throw new Error("resync injection failed")

const offHandlers: SocketOff[] = []
const currentTime = ref(0)
const duration = ref(0)
const progress = computed(() => {
  return minMax(currentTime.value / duration.value)
})

const buffered = ref<number[][]>([])
const blocked = ref<{ start: number; end: number; category: string; color: string }[]>([])

let progressInterval: ReturnType<typeof setInterval>

const updateProgress = (once = false, current?: number) => {
  clearInterval(progressInterval)
  currentTime.value = current ?? resync.currentTime()
  duration.value = resync.duration()
  buffered.value = bufferedArray(resync.buffered(), resync.duration())
  blocked.value = resync.blocked() ?? []
  if (!once && (isNaN(progress.value) || !resync.paused.value)) {
    requestAnimationFrame(() => updateProgress())
  } else {
    log("stopped updating progress")
    progressInterval = setInterval(() => {
      buffered.value = bufferedArray(resync.buffered(), resync.duration())
    }, 250)
  }
}

updateProgress()
resync.updateProgress = updateProgress
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

const onProgressSliding = (value: number) => {
  currentTime.value = resync.duration() * value
}

const fullscreenStateIcon = computed(() => {
  if (props.fullscreenEnabled) return "fullscreen_exit"
  return "fullscreen"
})

const volumeScroll = (event: WheelEvent) => {
  const { deltaY } = event
  if (deltaY < 0) resync.volume.value = minMax(resync.volume.value + 0.05)
  else resync.volume.value = minMax(resync.volume.value - 0.05)
  resync.muted.value = false
}
</script>

<template>
  <div class="h-10 w-full relative">
    <div class="flex px-2 items-center justify-between">
      <div class="flex">
        <SvgIcon
          :name="playStateIcon"
          class="player-icon"
          :class="{
            disabled:
              !resync.hasPermission(Permission.Host) &&
              !resync.hasPermission(Permission.PlaybackControl),
          }"
          @click="onPlayIconClick"
        />
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

        <div class="flex items-center volume" @wheel.prevent.stop="volumeScroll">
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
        </div>
        <div class="font-timestamp my-auto mx-1 align-middle">
          {{ timestamp(currentTime) }} / {{ timestamp(duration) }}
        </div>
      </div>

      <div class="flex">
        <SvgIcon
          name="settings"
          title="show/hide settings"
          class="player-icon"
          @click="emit('settings')"
        />
        <SvgIcon
          name="playlist"
          title="show/hide queue"
          class="player-icon"
          @click="emit('queue')"
        />
        <SvgIcon
          :name="resync.state.value.looping ? 'repeat_on' : 'repeat'"
          title="looping"
          class="player-icon"
          :class="{
            disabled:
              !resync.hasPermission(Permission.Host) &&
              !resync.hasPermission(Permission.PlaybackControl),
          }"
          @click="resync.loop()"
        />
        <SvgIcon
          :name="fullscreenStateIcon"
          title="fullscreen"
          class="player-icon"
          @click="emit('fullscreen')"
        />
      </div>
    </div>
    <ResyncSlider
      class="bottom-full w-full px-2 transform translate-y-1/2 absolute"
      :progress="progress"
      :buffered="buffered"
      :disabled="
        !resync.hasPermission(Permission.Host) &&
        !resync.hasPermission(Permission.PlaybackControl)
      "
      :blocked="blocked"
      :update-slack="3"
      @value="onProgressSliderValue"
      @slide="onProgressSliding"
    />
  </div>
</template>

<style scoped lang="scss">
.player-icon {
  @apply cursor-pointer my-2 mx-1;

  &.small {
    font-size: 20px;
    height: 24px;
    width: 20px;
  }
}

.disabled {
  @apply cursor-default;
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
