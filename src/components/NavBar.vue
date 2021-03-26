<script lang="ts">
import { computed, defineComponent } from "vue"
import { useRoute } from "vue-router"
import ResyncLogo from "@/components/ResyncLogo"

export default defineComponent({
  components: { ResyncLogo },
  setup() {
    const route = useRoute()
    const routeDisplay = computed(() => {
      if (route.name === "room") return route.params.roomID as string

      return ""
    })

    return { routeDisplay }
  },
})
</script>

<template>
  <nav
    class="bg-white flex h-nav shadow-sm w-full transition-all z-5 fixed justify-between dark:bg-black dark:shadow-md"
  >
    <div class="flex h-full opacity-50 pl-5 items-center">room: {{ routeDisplay }}</div>
    <div class="top-half left-half transform -translate-y-half -translate-x-half absolute">
      <ResyncLogo class="h-nav fill-black dark:fill-white" />
    </div>
    <div class="flex h-full items-center"></div>
  </nav>
</template>
