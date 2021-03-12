<script lang="ts">
import { defineComponent } from "vue"
import { useRoute } from "vue-router"

export default defineComponent({
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>

    return { roomID }
  },
})
</script>

<template>
  <h1>room {{ roomID }}</h1>
</template>