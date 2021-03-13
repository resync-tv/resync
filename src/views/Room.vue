<script lang="ts">
import type { Socket } from "socket.io-client"
import type { RoomState } from "../../types/room"
import type { MediaSourceAny } from "../../types/mediaSource"

import { defineComponent, inject, onBeforeUnmount, ref } from "vue"
import { useRoute } from "vue-router"

import VideoPlayer from "../components/VideoPlayer"

import debug from "debug"
const log = debug("w2g:room")

export default defineComponent({
  components: { VideoPlayer },
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const roomState = ref<RoomState>({ paused: true, source: undefined })
    log("roomState ref", roomState)

    const socket = inject<Socket>("socket")
    if (!socket) throw new Error("socket injection failed")

    const joinRoom = () => {
      socket.emit("joinRoom", { roomID }, (state: RoomState) => {
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

    onBeforeUnmount(() => {
      log("left room")
      socket.emit("leaveRoom", { roomID })
      socket.off("connect", joinRoom)
      socket.off("source")
    })

    return { roomID, roomState }
  },
})
</script>

<template>
  <main class="flex flex-col h-full justify-center items-center">
    <span>room: {{ roomID }}</span>
    <code class="font-mono">roomState: {{ roomState }}</code>
    <VideoPlayer v-if="roomState.source" :source="roomState.source" />
  </main>
</template>