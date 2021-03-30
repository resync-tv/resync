<script lang="ts">
import { computed, defineComponent, inject, Ref } from "vue"
import { useRoute } from "vue-router"
import ResyncLogo from "@/components/ResyncLogo"

export default defineComponent({
  components: { ResyncLogo },
  setup() {
    const socketConnected = inject<Ref<boolean>>("socketConnected")
    const route = useRoute()

    const routeDisplay = computed(() => {
      if (route.name === "room") return route.params.roomID as string

      return ""
    })

    const connectionTitle = computed(() => {
      if (socketConnected?.value) return "resync backend connected"
      else return "resync backend disconnected"
    })

    return {
      routeDisplay,
      socketConnected,
      connectionTitle,
    }
  },
})
</script>

<template>
  <nav
    class="bg-light flex h-nav shadow-sm w-full transition-all z-5 fixed justify-between dark:bg-dark dark:shadow-md"
  >
    <div class="flex h-full opacity-50 pl-5 items-center">room: {{ routeDisplay }}</div>
    <div
      class="top-half left-half transform -translate-y-half -translate-x-half absolute"
      :title="connectionTitle"
    >
      <ResyncLogo
        class="h-nav fill-dark dark:fill-light"
        :class="{ 'fill-error dark:fill-error': !socketConnected }"
      />
    </div>
    <div class="flex h-full items-center"></div>
  </nav>
</template>
