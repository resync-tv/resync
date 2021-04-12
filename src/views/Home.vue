<script lang="ts">
import type { ResyncSocketFrontend } from "$/room"

import { defineComponent, inject } from "vue"

import ResyncLogo from "@/components/ResyncLogo"
import Resync from "@/resync"
import { useRouter } from "vue-router"

export default defineComponent({
  components: { ResyncLogo },
  setup() {
    const router = useRouter()

    const socket = inject<ResyncSocketFrontend>("socket")
    if (!socket) throw new Error("socket injection failed")

    const enterNewRoom = async () => {
      const roomID = await Resync.getNewRandom(socket)
      router.push({ name: "room", params: { roomID } })
    }

    return { enterNewRoom }
  },
})
</script>

<template>
  <main id="home" class="transition-all centerflex">
    <div class="flex flex-col items-center">
      <ResyncLogo class="max-w-full fill-dark w-100 dark:fill-light" />
      <span class="text-lg opacity-75 -sm:text-sm">watch videos with your friends.</span>
    </div>
    <div
      @click="enterNewRoom"
      class="bg-auto cursor-pointer h-20 bottom-button w-full bottom-0 fixed centerflex"
    >
      <button class="h-full arrow-after pointer-events-none">enter new room</button>
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

.bottom-button {
  @apply transition-all;

  box-shadow: rgba(0, 0, 0, 0.06) 0px -2px 4px 0px;

  &:hover {
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 20px 0px;
  }
}

.dark .bottom-button {
  box-shadow: rgba(255, 255, 255, 0.5) 0px -1px 2px 0px;

  &:hover {
    box-shadow: rgba(255, 255, 255, 0.25) 0px 0px 20px 0px;
  }
}
</style>