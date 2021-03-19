<template>
  <h1 class="absolute">socket is {{ socketConnected ? "connected" : "disconnected" }}</h1>
  <router-view />
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, provide, ref } from "vue"
import { io } from "socket.io-client"

export default defineComponent({
  name: "resync",
  setup() {
    const development = process.env.NODE_ENV === "development"

    const socketConnected = ref(false)
    const socket = development
      ? io("http://localhost:3020")
      : io("https://hetzner.vaaski.dev", { path: "/resync" })

    socket.on("connect", () => (socketConnected.value = true))
    socket.on("disconnect", () => (socketConnected.value = false))

    provide("socket", socket)

    onBeforeUnmount(() => socket.close())

    // TODO remove once stable
    // @ts-expect-error nothing relies on this, purely for debugging
    if (development) window.socket = socket

    return { socketConnected }
  },
})
</script>

<style>
#app a {
  @apply text-accent-alt;
  @apply underline;
}
* {
  @apply font;
}
</style>