<template>
  <h1 class="absolute">socket is {{ socketConnected ? "connected" : "disconnected" }}</h1>
  <router-view />
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, provide, ref } from "vue"
import { io } from "socket.io-client"

export default defineComponent({
  name: "w2g-next",
  setup() {
    // @ts-expect-error it works
    const backendAddress = import.meta.env.VITE_BACKEND_ADDRESS as string
    if (!backendAddress) throw new Error("no backend address found")

    const socket = io(backendAddress)
    const socketConnected = ref(false)

    socket.on("connect", () => (socketConnected.value = true))
    socket.on("disconnect", () => (socketConnected.value = false))

    provide("socket", socket)

    onBeforeUnmount(() => socket.close())

    // @ts-expect-error nothing relies on this, purely for debugging
    if (process.env.NODE_ENV === "development") window.socket = socket

    return { socketConnected }
  },
})
</script>

<style>
#app a {
  @apply text-accent-alt;
  @apply underline;
}
#app * {
  @apply font;
}
</style>