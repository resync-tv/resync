<script lang="ts">
import type { Socket } from "socket.io-client"
import type { RoomEmit, RoomState } from "$/room"
import type { MediaSourceAny } from "$/mediaSource"

import { computed, defineComponent, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute } from "vue-router"

import PlayerWrapper from "@/components/PlayerWrapper"
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

    const resync = Resync(socket, roomEmit)
    const { playContent } = resync
    provide("resync", resync)

    if (log.enabled)
      // @ts-expect-error for manual testing
      window.resync = resync

    const joinRoom = () => {
      const name =
        localStorage.getItem("resync-name") || window.prompt("enter username") || "default"

      localStorage.setItem("resync-name", name)

      roomEmit("joinRoom", { name }, (state: RoomState) => {
        log("initial room state", state)
        roomState.value = state
      })
    }
    joinRoom()
    socket.on("connect", joinRoom)

    socket.on("source", (source: MediaSourceAny) => {
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
      socket.off("source")
      offNotifiy()
    })

    return { roomID, roomState, sourceInput, sourceValid, playContent }
  },
})
</script>

<template>
  <main class="flex flex-col justify-center items-center">
    <div class="flex relative justify-center">
      <div class="flex bottom-full mb-3 w-md justify-center absolute" style="max-width: 75vw">
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