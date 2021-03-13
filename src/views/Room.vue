<script lang="ts">
import type { Socket } from "socket.io-client"
import type { RoomState } from "../../types/room"

import { defineComponent, inject, onBeforeUnmount, ref } from "vue"
import { useRoute } from "vue-router"

export default defineComponent({
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const roomState = ref<RoomState>()

    const socket = inject<Socket>("socket")
    if (!socket) throw new Error("socket injection failed")

    socket.emit("joinRoom", { roomID }, (state: RoomState) => {
      roomState.value = state
    })

    onBeforeUnmount(() => socket.emit("leaveRoom", { roomID }))

    return { roomID, roomState }
  },
})
</script>

<template>
  <main class="flex flex-col h-full justify-center items-center">
    <h1>room: {{ roomID }}</h1>
  </main>
</template>