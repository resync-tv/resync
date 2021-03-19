<template>
  <main class="bg-white h-full text-black transition-colors dark:bg-black dark:text-white">
    <NavBar />
    <router-view />
  </main>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, provide, ref } from "vue"
import { io } from "socket.io-client"
import NavBar from "./components/NavBar.vue"

export default defineComponent({
  components: { NavBar },
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

*::selection {
  background: #305473;
  color: #0c151d;
}

*:not(input) {
  @apply select-none;
}

.resync-input {
  @apply mr-2 py-2 px-4 w-3xl;
  @apply rounded outline-none transition-all;
  @apply bg-white text-black;
  @apply light:(shadow focus:shadow-md);
  @apply dark:(bg-black text-white text-opacity-50 ring-white focus:ring-1 shadow-md focus:text-opacity-100);
}

.resync-input.invalid {
  @apply text-error;
}

.resync-button {
  @apply px-4 py-2;
  @apply rounded outline-none transition-all delay-75;
  @apply ring-black;
  @apply dark:(ring-white text-white text-opacity-50);
  @apply hover:ring-1 hover:dark:text-opacity-100;
  @apply focus:(outline-none);
  @apply hover:active:(px-3 py-1 m-1 ring-2 delay-0);
}
</style>