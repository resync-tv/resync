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
    const development = process.env.NODE_ENV === "development"

    // TODO change when deploying to prod
    const socket = development ? io("http://localhost:3020") : io("http://localhost:3020")
    const socketConnected = ref(false)

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
#app * {
  @apply font;
}
</style>