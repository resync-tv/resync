<script lang="ts">
import type { EventNotification, ResyncSocketFrontend } from "$/room"

import { computed, defineComponent, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute } from "vue-router"
import * as sentry from "@sentry/browser"
import { debug, ls } from "@/util"
import { renderNotification } from "@/notify"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
import ResyncInput from "@/components/ResyncInput"
import Resync from "@/resync"

const log = debug("room")

const isURL = (str: string) => {
  try {
    new URL(str)
    return true
  } catch (error) {
    return false
  }
}

export default defineComponent({
  components: { PlayerWrapper, ResyncInput },
  setup() {
    const route = useRoute()
    const { roomID } = route.params as Record<string, string>
    const sourceInput = ref("")
    const sourceValid = computed(() => isURL(sourceInput.value) || !sourceInput.value.length)

    document.title = `resync room: ${roomID}`

    const socket = inject<ResyncSocketFrontend>("socket")
    if (!socket) throw new Error("socket injection failed")

    const resync = new Resync(socket, roomID)
    provide("resync", resync)

    if (log.enabled)
      // @ts-expect-error for manual testing
      window.resync = resync

    const name = ls("resync-username") || window.prompt("enter username") || "default"
    ls("resync-username", name)

    sentry.configureScope(scope => {
      scope.setTag("roomID", roomID)
      scope.setTag("name", name)
    })

    const resetScope = () =>
      sentry.configureScope(scope => {
      scope.setTag("roomID", null)
      scope.setTag("name", null)
      })

    resync.joinRoom(name)

    const recentNotifications = ref<EventNotification[]>([])
    const offNotifiy = resync.onNotify(notification => {
      const { event, name, additional } = notification
      log.extend("notify")(`[${event}](${name})`, additional || "")

      if (recentNotifications.value.push(notification) > 5) {
        recentNotifications.value.shift()
      }
    })

    onBeforeUnmount(() => {
      offNotifiy()
      resetScope()
      document.title = "resync"
      resync.destroy()
    })

    return {
      roomID,
      sourceInput,
      sourceValid,
      resync,
      recentNotifications,
      renderNotification,
    }
  },
})
</script>

<template>
  <main class="">
    <div class="flex flex-col h-full w-full top-0 left-0 justify-center items-center relative">
      <div class="flex z-5 relative justify-center">
        <div
          class="flex bottom-full mb-3 w-md justify-center absolute"
          style="max-width: 75vw"
        >
          <ResyncInput
            v-model="sourceInput"
            placeholder="url"
            :invalid="!sourceValid"
            pastable
          />
          <button
            @click="resync.playContent(sourceInput)"
            class="resync-button"
            :class="{ invalid: !sourceValid }"
          >
            play
          </button>
        </div>

        <PlayerWrapper v-if="resync.state.value.source" type="video" />
      </div>

      <div class="top-list left-0">
        <transition-group name="text-height">
          <div v-for="member in resync.state.value.members" :key="member.id" class="top-text">
            {{ member.name }}
          </div>
        </transition-group>
      </div>

      <div class="top-list right-0">
        <div class="h-25 relative overflow-hidden">
          <div
            class="bg-gradient-to-t from-light h-full w-full z-3 absolute dark:from-dark"
          ></div>
          <transition-group name="text-height" tag="div" class="flex flex-col-reverse">
            <div
              v-for="notification in recentNotifications"
              :key="notification"
              class="top-text text-right z-2"
            >
              {{ renderNotification[notification.event](notification) }}
            </div>
          </transition-group>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.top-list {
  @apply absolute opacity-25 pt-2 top-0;
}

.top-text {
  @apply h-5 text-sm mx-2 overflow-hidden;
}

.text-height {
  &-enter-active,
  &-leave-active {
    transition: all 500ms var(--ease-in-out-hard);
  }

  &-enter-from,
  &-leave-to {
    opacity: 0 !important;
    margin-left: 0px !important;
    height: 0px !important;
  }
}
</style>