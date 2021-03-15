<script lang="ts">
import type { Socket } from "socket.io-client"
import type { RoomEmit, RoomState } from "../../types/room"
import type { MediaSourceAny } from "../../types/mediaSource"

import { computed, defineComponent, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute } from "vue-router"

import VideoPlayer from "../components/VideoPlayer"
import { w2gify } from "../w2gify"

import debug from "debug"
const log = debug("w2g:room")

const isURL = (str: string) => {
  try {
    new URL(str)
    return true
  } catch (error) {
    return false
  }
}

export default defineComponent({
  components: { VideoPlayer },
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const roomState = ref<RoomState>({ paused: true, source: undefined })
    const sourceInput = ref("")
    const sourceValid = computed(() => isURL(sourceInput.value))
    log("roomState ref", roomState)

    const socket = inject<Socket>("socket")
    if (!socket) throw new Error("socket injection failed")

    const roomEmit: RoomEmit = (event: string, arg?: Record<string, any>, cb?: any) => {
      socket.emit(event, { roomID, ...arg }, cb)
    }

    const W2Gify = w2gify(socket, roomEmit)
    const { playContent } = W2Gify
    provide("w2gify", W2Gify)

    if (log.enabled)
      // @ts-expect-error for manual testing
      window.w2gify = W2Gify

    const joinRoom = () => {
      roomEmit("joinRoom", {}, (state: RoomState) => {
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
      roomEmit("leaveRoom")
      socket.off("connect", joinRoom)
      socket.off("source")
    })

    return { roomID, roomState, sourceInput, sourceValid, playContent }
  },
})
</script>

<template>
  <main class="flex flex-col h-full justify-center items-center">
    <span>room: {{ roomID }}</span>
    <div class="mb-2">
      <input
        v-model="sourceInput"
        class="rounded ring-accent-alt mr-2 text-bg p-1 w-3xl focus:outline-none focus:ring-2"
        :class="{ 'ring-red-600': !sourceValid }"
        type="text"
        placeholder="url"
      />
      <button
        @click="playContent(sourceInput)"
        class="rounded p-1 px-4 transition-colors hover:bg-accent"
      >
        play
      </button>
    </div>
    <VideoPlayer v-if="roomState.source" :source="roomState.source" />
  </main>
</template>