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
      if (route.name === "room") return `room: ${route.params.roomID}`

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
  <nav class="nav nav-transition">
    <div v-if="routeDisplay" class="flex h-full opacity-50 pl-5 items-center">
      {{ routeDisplay }}
    </div>
    <div
      class="top-half left-half transform -translate-y-half -translate-x-half absolute"
      :title="connectionTitle"
    >
      <ResyncLogo
        @click="$router.push('/')"
        class="cursor-pointer h-nav fill-dark nav-transition dark:fill-light"
        :class="{ 'fill-error dark:fill-error': !socketConnected }"
      />
    </div>
    <div class="flex h-full items-center"></div>
  </nav>
</template>

<style lang="scss" scoped>
.nav {
  @apply bg-light flex h-nav shadow-sm w-full z-10 fixed justify-between;
  @apply dark:(bg-dark shadow-md);
}
</style>
