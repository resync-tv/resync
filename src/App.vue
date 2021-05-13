<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, provide, ref } from "vue"
import { useRoute } from "vue-router"
import { io } from "socket.io-client"

import NavBar from "@/components/NavBar.vue"

import { debug } from "@/util"
const log = debug("app")

export default defineComponent({
  components: { NavBar },
  name: "resync",
  setup() {
    const route = useRoute()

    const development = process.env.NODE_ENV === "development"

    const socketConnected = ref(false)
    const socket = development
      ? io(`http://${location.hostname}:3020`)
      : io("https://hetzner.vaaski.dev", { path: "/resync" })

    socket.on("connect", () => (socketConnected.value = true))
    socket.on("disconnect", () => (socketConnected.value = false))

    provide("socket", socket)
    provide("socketConnected", socketConnected)

    onBeforeUnmount(() => socket.close())

    // @ts-expect-error nothing relies on this, purely for debugging
    if (log.enabled) window.socket = socket

    const isHome = computed(() => route.fullPath === "/")

    return { socketConnected, isHome }
  },
})
</script>

<template>
  <div
    class="bg-auto h-full text-auto transition-colors overflow-hidden"
    :style="isHome ? '--nav-height: 0px' : ''"
  >
    <NavBar />
    <router-view v-slot="{ Component }" style="padding-top: var(--nav-height)" class="h-full">
      <transition name="router-fade">
        <component :is="Component" class="bg-auto w-full absolute" />
      </transition>
    </router-view>
  </div>
</template>

<style lang="scss">
#app a {
  @apply text-accent-alt;
  @apply underline;
}

* {
  @apply font-sans;
}

*::selection {
  background: #305473;
  color: var(--clr-light);
}

*:not(input) {
  @apply select-none;
}

main {
  --route-transition-duration: 300ms;
  &.router-fade-enter-active,
  &.router-fade-leave-active {
    transition: var(--route-transition-duration) var(--ease-in-out-hard);
  }

  &.router-fade-enter-from,
  &.router-fade-leave-to {
    opacity: 0;
  }

  transition: var(--route-transition-duration) var(--ease-in-out-hard);
}

.text-shadow {
  text-shadow: 0 0 2px black;
}

.ease-in-out-hard {
  transition-timing-function: var(--ease-in-out-hard) !important;
}

.centerflex {
  @apply flex justify-center items-center;
}

.bg-auto {
  @apply bg-light dark:bg-dark;
}

.text-auto {
  @apply text-dark dark:text-light;
}

.resync-input {
  @apply py-2 px-4 w-3xl;
  @apply rounded outline-none transition-all;
  @apply bg-light text-dark;
  @apply light:(shadow focus:shadow-md);
  @apply dark:(bg-dark text-light text-opacity-50 focus:text-opacity-100);
}

.dark .resync-input {
  box-shadow: 0 1px var(--clr-md-light);
}

.dark .resync-input:hover {
  box-shadow: 0 2px var(--clr-light);
}

.dark input.resync-input:focus {
  box-shadow: 0 0 0 2px var(--clr-light);
}

.resync-input.invalid {
  @apply text-error;
}

.resync-button {
  @apply px-4 py-2;
  @apply rounded outline-none transition-all;
  @apply dark:(text-light text-opacity-50);
  @apply hover:dark:text-opacity-100;
  @apply focus:(outline-none);
  @apply hover:light:shadow-md
  @apply active:light:shadow;
}

.dark .resync-button {
  box-shadow: 0 1px var(--clr-md-light);
}

.dark .resync-button:hover {
  box-shadow: 0 2px var(--clr-light);
  @apply text-light;
}

.dark .resync-button:active {
  box-shadow: 0 0 0 2px var(--clr-light);
  @apply duration-50 text-light;
}

.resync-button.invalid {
  @apply text-md-dark;
  pointer-events: none !important;
}

.dark .resync-button.invalid {
  @apply text-md-light;
  box-shadow: 0 0 var(--clr-md-light);
}
</style>