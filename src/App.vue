<template>
  <div class="bg-white h-full text-black transition-colors dark:(bg-black text-white)">
    <NavBar />
    <router-view style="padding-top: var(--nav-height)" class="h-full" />
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, provide, ref } from "vue"
import { io } from "socket.io-client"
import NavBar from "@/components/NavBar.vue"

import debug from "debug"
const log = debug("resync:app")

export default defineComponent({
  components: { NavBar },
  name: "resync",
  setup() {
    const development = process.env.NODE_ENV === "development"

    const socketConnected = ref(false)
    const socket = development
      ? io(`http://${location.hostname}:3020`)
      : io("https://hetzner.vaaski.dev", { path: "/resync" })

    provide("socketConnected", socketConnected)

    socket.on("connect", () => (socketConnected.value = true))
    socket.on("disconnect", () => (socketConnected.value = false))

    provide("socket", socket)

    onBeforeUnmount(() => socket.close())

    // @ts-expect-error nothing relies on this, purely for debugging
    if (log.enabled) window.socket = socket

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
  color: var(--clr-white);
}

*:not(input) {
  @apply select-none;
}

.text-shadow {
  text-shadow: 0 0 2px black;
}

.resync-input {
  @apply mr-2 py-2 px-4 w-3xl;
  @apply rounded outline-none transition-all;
  @apply bg-white text-black;
  @apply light:(shadow focus:shadow-md);
  @apply dark:(bg-black text-white text-opacity-50 focus:text-opacity-100);
}

.dark .resync-input {
  box-shadow: 0 1px var(--clr-light-white);
}

.dark .resync-input:hover {
  box-shadow: 0 2px var(--clr-white);
}

.dark input.resync-input:focus {
  box-shadow: 0 0 0 2px var(--clr-white);
}

.resync-input.invalid {
  @apply text-error;
}

.resync-button {
  @apply px-4 py-2;
  @apply rounded outline-none transition-all;
  @apply dark:(text-white text-opacity-50);
  @apply hover:dark:text-opacity-100;
  @apply focus:(outline-none);
  @apply hover:light:shadow-md
  @apply active:light:shadow;
}

.dark .resync-button {
  box-shadow: 0 1px var(--clr-light-white);
}

.dark .resync-button:hover {
  box-shadow: 0 2px var(--clr-white);
  @apply text-white;
}

.dark .resync-button:active {
  box-shadow: 0 0 0 2px var(--clr-white);
  @apply duration-50 text-white;
}

.resync-button.invalid {
  @apply text-light-black;
}

.dark .resync-button.invalid {
  @apply text-light-white;
  box-shadow: 0 0 var(--clr-light-white);
}
</style>