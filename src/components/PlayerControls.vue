<script lang="ts">
import type { MediaVideo } from "$/mediaSource"
import type { RoomState } from "$/room"

import Resync, { SocketOff } from "@/resync"

import { computed, defineComponent, inject, onBeforeUnmount, PropType, ref, toRefs } from "vue"
import ResyncSlider from "@/components/ResyncSlider.vue"

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

    const paused = ref(true)
    const volume = ref(0.1)
    const socketHandlers: SocketOff[] = []

    paused.value = state.value.paused

    const offPause = resync.onPause(() => {
      paused.value = true
    })
    socketHandlers.push(offPause)

    const offResume = resync.onResume(() => {
      paused.value = false
    })
    socketHandlers.push(offResume)

    onBeforeUnmount(() => socketHandlers.forEach(off => off()))

    const playStateIcon = computed(() => (paused.value ? "play_arrow" : "pause"))
    const volumeStateIcon = computed(() => {
      if (volume.value === 0) return "volume_mute"
      if (volume.value < 0.5) return "volume_down"
      return "volume_up"
    })

    // TODO: get the duration and current time in here
    const currentTime = () => 0
    const playIconClick = () => (paused.value ? resync.resume() : resync.pause(currentTime()))

    return { playStateIcon, volumeStateIcon, playIconClick }
  },
})
</script>

<template>
  <div class="h-10 text-white w-full relative">
    <div class="flex px-2 items-center justify-between">
      <div>
        <span class="mi player-icon" @click="playIconClick">{{ playStateIcon }}</span>
        <span class="mi player-icon">skip_next</span>
        <span class="mi player-icon">{{ volumeStateIcon }}</span>
      </div>
      <div>
        <span class="mi player-icon">fullscreen</span>
      </div>
    </div>
    <ResyncSlider class="bottom-full w-full absolute" />
  </div>
</template>

<style scoped>
.player-icon {
  @apply cursor-pointer my-2 mx-1;
}
</style>