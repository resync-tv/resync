<script lang="ts">
import { Socket } from "socket.io"
import { defineComponent, inject } from "vue"
import { useRoute } from "vue-router"

export default defineComponent({
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>

    const socket = inject<Socket>("socket")

    socket?.emit("ping", "test string", console.log)

    return { roomID, socket }
  },
})
</script>

<template>
  <main class="flex flex-col h-full justify-center items-center">
    <h1>room: {{ roomID }}</h1>
    <h1>socket: {{ typeof socket }}</h1>
  </main>
</template>