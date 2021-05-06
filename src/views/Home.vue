<script lang="ts">
import type { ResyncSocketFrontend } from "$/room"

import { defineComponent, inject } from "vue"

import ResyncLogo from "@/components/ResyncLogo"
import Resync from "@/resync"
import { useRouter } from "vue-router"
import { debug, ls, validateName } from "@/util"

const log = debug("home")

export default defineComponent({
  components: { ResyncLogo },
  setup() {
    const router = useRouter()

    const socket = inject<ResyncSocketFrontend>("socket")
    if (!socket) throw new Error("socket injection failed")

    const enterRoom = async (roomID?: string | null) => {
      if (!roomID) roomID = await Resync.getNewRandom(socket)
      const roomRoute = router.resolve({ name: "room", params: { roomID } })

      try {
        validateName(ls("resync-displayname") ?? "")
        router.push(roomRoute)
      } catch (error) {
        log("no name set yet")
        router.push({ name: "signup", query: { returnTo: roomRoute.fullPath } })
      }
    }

    const lastRoom = ls("resync-last-room")

    return { enterRoom, lastRoom }
  },
})
</script>

<template>
  <main id="home" class="centerflex">
    <div class="flex flex-col items-center">
      <ResyncLogo class="max-w-full fill-dark w-100 dark:fill-light" />
      <span class="text-lg opacity-75 -sm:text-sm">watch videos with your friends.</span>
    </div>
    <div class="bottom-button-container">
      <button @click="enterRoom()">
        <span class="arrow-after">enter new room</span>
      </button>

      <button v-if="lastRoom" @click="enterRoom(lastRoom)">
        <span class="arrow-after">enter last room: {{ lastRoom }}</span>
      </button>
    </div>
  </main>
</template>

<style scoped>
.arrow-after {
  position: relative;

  &:after {
    position: absolute;
    content: "->";
    left: 100%;
    width: 2ch;
  }
}

.bottom-button-container {
  @apply w-full bottom-0 fixed;
  @apply bg-auto cursor-pointer h-20;
  @apply flex justify-around;

  > button {
    @apply transition-all;
    @apply flex-grow outline-none focus:outline-none;

    box-shadow: rgba(0, 0, 0, 0.06) 0px -2px 4px 0px;
    --hover-shadow: 0px 0px 20px 0px;

    &:hover {
      box-shadow: rgba(0, 0, 0, 0.1) var(--hover-shadow);
    }
  }
}

.dark .bottom-button-container > button {
  box-shadow: rgba(255, 255, 255, 0.5) 0px -1px 0px 0px;

  &:hover {
    box-shadow: rgba(255, 255, 255, 0.25) var(--hover-shadow);
  }
}
</style>