<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, provide } from "vue"
import { io } from "socket.io-client"

export default defineComponent({
  name: "w2g-next",
  setup() {
    // @ts-expect-error
    const backendAddress = import.meta.env.VITE_BACKEND_ADDRESS as string

    if (!backendAddress) throw new Error("no backend address found")

    const socket = io(backendAddress)
    provide("socket", socket)

    onBeforeUnmount(() => socket.close())
  },
})
</script>

<style>
#app a {
  @apply text-accent-alt;
  @apply underline;
}
</style>