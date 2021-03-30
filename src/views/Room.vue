<script lang="ts">
import type { ResyncSocketFrontend, RoomEmit, RoomState } from "$/room"

import { computed, defineComponent, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute } from "vue-router"
import { ls } from "@/util"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
import ResyncInput from "@/components/ResyncInput"
import Resync from "@/resync"

import debug from "debug"
const log = debug("resync:room")

const isURL = (str: string) => {
  try {
    new URL(str)
    return true
  } catch (error) {
    return false
  }
}

export default defineComponent({
  components: { PlayerWrapper, ResyncInput },
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const sourceInput = ref("")
    const sourceValid = computed(() => isURL(sourceInput.value) || !sourceInput.value.length)

    document.title = `resync: ${roomID}`

    const socket = inject<ResyncSocketFrontend>("socket")
    if (!socket) throw new Error("socket injection failed")

    const resync = new Resync(socket, roomID)
    provide("resync", resync)

    if (log.enabled)
      // @ts-expect-error for manual testing
      window.resync = resync

    const name = ls("resync-username") || window.prompt("enter username") || "default"
    ls("resync-username", name)

    resync.joinRoom(name)

    const offNotifiy = resync.onNotify(({ event, name, additional }) => {
      log.extend("notify")(`[${event}](${name})`, additional || "")
    })

    onBeforeUnmount(() => {
      offNotifiy()
      document.title = "resync"
      resync.destroy()
    })

    return { roomID, sourceInput, sourceValid, resync }
  },
})
</script>

<template>
  <main class="flex flex-col justify-center items-center">
    <div class="flex relative justify-center">
      <div class="flex bottom-full mb-3 w-md justify-center absolute" style="max-width: 75vw">
        <ResyncInput
          v-model="sourceInput"
          placeholder="url"
          :invalid="!sourceValid"
          pastable
        />
        <button
          @click="resync.playContent(sourceInput)"
          class="resync-button"
          :class="{ invalid: !sourceValid }"
        >
          play
        </button>
      </div>
      <PlayerWrapper v-if="resync.state.value.source" type="video" />
    </div>
  </main>
</template>