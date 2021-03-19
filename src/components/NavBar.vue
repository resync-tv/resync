<script lang="ts">
import { computed, defineComponent } from "vue"
import { useRoute } from "vue-router"
import ResyncLogo from "./ResyncLogo"

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
  <nav class="flex h-nav shadow-sm w-full transition-all fixed justify-between dark:shadow-md">
    <div class="flex h-full text-white pl-5 text-opacity-50 items-center">room: {{ routeDisplay }}</div>
    <div class="top-half left-half transform -translate-y-half -translate-x-half absolute">
      <ResyncLogo class="h-nav fill-black dark:fill-white" />
    </div>
    <div class="flex h-full items-center"></div>
  </nav>
</template>
