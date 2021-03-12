<script lang="ts">
import { Socket } from "socket.io"
import { defineComponent, inject } from "vue"
import { useRoute } from "vue-router"

export default defineComponent({
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>

    const socket = inject<Socket>("socket")
    if (!socket) throw new Error("socket injection failed")

    return { roomID }
  },
})
</script>

<template>
  <main class="flex flex-col h-full justify-center items-center">
    <h1>room: {{ roomID }}</h1>
  </main>
</template>