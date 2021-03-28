<script lang="ts">
import type { Socket } from "socket.io-client"
import type { RoomEmit, RoomState } from "$/room"

import { computed, defineComponent, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute } from "vue-router"
import { ls } from "@/util"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
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

// TODO remove soon
try {
  ls("resync-name")
} catch (error) {
  ls("resync-name", localStorage.getItem("resync-name"))
}

export default defineComponent({
  components: { PlayerWrapper },
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const roomState = ref<RoomState>({ paused: true, source: undefined, lastSeekedTo: 0 })
    const sourceInput = ref("")
    const sourceValid = computed(() => isURL(sourceInput.value) || !sourceInput.value.length)
    log("roomState ref", roomState)

    const socket = inject<Socket>("socket")
    if (!socket) throw new Error("socket injection failed")

    const roomEmit: RoomEmit = (event: string, arg?: Record<string, any>, cb?: any) => {
      socket.emit(event, { roomID, ...arg }, cb)
    }

    const resync = new Resync(socket, roomEmit)
    const { playContent } = resync
    provide("resync", resync)

    if (log.enabled)
      // @ts-expect-error for manual testing
      window.resync = resync

    const joinRoom = () => {
      const name = ls<string>("resync-name") || window.prompt("enter username") || "default"

      ls<string>("resync-name", name)

      roomEmit("joinRoom", { name }, (state: RoomState) => {
        log("initial room state", state)
        roomState.value = state
        document.title = `resync: ${roomID}`
      })
    }
    joinRoom()
    socket.on("connect", joinRoom)

    const offSource = resync.onSource(source => {
      log("new source", source)

      roomState.value.source = source
    })

    const offNotifiy = resync.onNotify(({ event, name, additional }) => {
      log.extend("notify")(`[${event}](${name})`, additional || "")
    })

    onBeforeUnmount(() => {
      log("left room")
      roomEmit("leaveRoom")
      socket.off("connect", joinRoom)
      offSource()
      offNotifiy()
      document.title = "resync"
    })

    return { roomID, roomState, sourceInput, sourceValid, playContent }
  },
})
</script>

<template>
  <main class="flex flex-col justify-center items-center">
    <div class="flex relative justify-center">
      <div class="flex bottom-full mb-3 w-md justify-center absolute" style="max-width: 75vw">
        <!-- TODO make this into component that accepts right-click as paste -->
        <input
          v-model="sourceInput"
          class="resync-input"
          :class="{ invalid: !sourceValid }"
          type="text"
          placeholder="url"
        />
        <button
          @click="playContent(sourceInput)"
          class="resync-button"
          :class="{ invalid: !sourceValid }"
        >
          play
        </button>
      </div>
      <PlayerWrapper v-if="roomState.source" :state="roomState" type="video" />
    </div>
  </main>
</template>