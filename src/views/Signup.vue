<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import ResyncInput from "@/components/ResyncInput"
import { ls, validateName } from "@/util"

export default defineComponent({
  components: { ResyncInput },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const name = ref("")
    const form = ref<null | HTMLFormElement>(null)

    const setDisplayName = () => {
      try {
        const cleanName = validateName(name.value)
        ls("resync-displayname", cleanName)

        const path = route.query.returnTo
        if (path && typeof path === "string") router.replace({ path })
      } catch (error) {
        alert(error)
      }
    }

    onMounted(() => {
      if (!form.value) throw Error("form element ref not available")

      form.value.onsubmit = e => {
        e.preventDefault()
        setDisplayName()
      }
    })

    onBeforeUnmount(() => {
      if (!form.value) throw Error("form element ref not available")
      form.value.onsubmit = null
    })

    return { name, form }
  },
})
</script>


<template>
  <main class="flex-col signup centerflex">
    <h1 class="mb-6 text-3xl">choose a display name</h1>
    <form ref="form" class="flex max-w-screen -sm:flex-col">
      <ResyncInput v-model="name" placeholder="username" class="w-xs sm:mr-2" maxlength="16" />
      <button class="resync-button -sm:mt-2">set name</button>
    </form>
  </main>
</template>