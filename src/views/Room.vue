<script lang="ts">
import type { Socket } from "socket.io-client"
import type { RoomState } from "../../types/room"
import type { MediaSourceAny } from "../../types/mediaSource"

import { defineComponent, inject, onBeforeUnmount, ref } from "vue"
import { useRoute } from "vue-router"

import debug from "debug"
const log = debug("w2g:room")

export default defineComponent({
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const roomState = ref<RoomState>({ paused: true, source: undefined })
    log("roomState ref", roomState)

    const socket = inject<Socket>("socket")
    if (!socket) throw new Error("socket injection failed")

    socket.emit("joinRoom", { roomID }, (state: RoomState) => {
      log("initial room state", state)
      roomState.value = state
    })

    socket.on("source", (source: MediaSourceAny) => {
      log("new source", source)

      roomState.value.source = source
    })

    onBeforeUnmount(() => {
      log("left room")
      socket.emit("leaveRoom", { roomID })
    })

    return { roomID, roomState }
  },
})
</script>

<template>
  <main class="flex flex-col h-full justify-center items-center">
    <h1>room: {{ roomID }}</h1>
    <h2>roomState: {{ roomState }}</h2>
  </main>
</template>