<script lang="ts">
import type { EventNotification } from "$/room"
import type { ResyncSocketFrontend } from "$/socket"

import {
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
} from "vue"
import { useRoute, useRouter } from "vue-router"
import * as sentry from "@sentry/browser"
import { debug, ls, validateName } from "@/util"
import { renderNotification } from "@/notify"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
import VideoList from "@/components/VideoList.vue"
import ResyncInput from "@/components/ResyncInput"
import Resync from "@/resync"
import { MediaSourceAny } from "$/mediaSource"

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
  components: { PlayerWrapper, ResyncInput, VideoList },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { roomID } = route.params as Record<string, string>
    const sourceInput = ref("")
    const sourceIsURL = computed(() => isURL(sourceInput.value))

    let name = ls("resync-displayname")
    try {
      validateName(name ?? "")
    } catch {
      router.replace({
        name: "signup",
        query: {
          returnTo: route.fullPath,
        },
      })
    }

    document.title = `resync room: ${roomID}`

    const socket = inject<ResyncSocketFrontend>("socket")
    if (!socket) throw new Error("socket injection failed")

    const resync = new Resync(socket, roomID)
    provide("resync", resync)

    if (log.enabled)
      // @ts-expect-error for manual testing
      window.resync = resync

    sentry.configureScope(scope => {
      scope.setTag("roomID", roomID)
      scope.setTag("name", name)
    })

    const resetScope = () =>
      sentry.configureScope(scope => {
        scope.setTag("roomID", null)
        scope.setTag("name", null)
      })

    const mountPlayer = ref(false)
    if (name)
      resync.joinRoom(name).then(() => {
        mountPlayer.value = true
        ls("resync-last-room", roomID)
      })

    const recentNotifications = ref<EventNotification[]>([])
    const offNotifiy = resync.onNotify(notification => {
      const { event, name, additional } = notification
      log.extend("notify")(`[${event}](${name})`, additional || "")

      if (recentNotifications.value.push(notification) > 10) {
        recentNotifications.value.shift()
      }
    })

    const urlForm = ref<HTMLFormElement | null>(null)
    const playButtonText = computed(() => {
      if (!sourceInput.value.length && resync.state.value.source) return "stop"
      if (sourceIsURL.value || !sourceInput.value.length) return "play"

      return "search"
    })
    const playButtonDisabled = computed(() => {
      return !resync.state.value.source && !sourceInput.value.length
    })

    const searchResults = ref<MediaSourceAny[]>([])

    onMounted(() => {
      if (!urlForm.value) throw Error("urlForm ref not available")

      urlForm.value.onsubmit = async e => {
        e.preventDefault()

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }

        if (sourceIsURL.value || !sourceInput.value.length) {
          resync.playContent(sourceInput.value)
        } else searchResults.value = await resync.search(sourceInput.value)
      }
    })

    onBeforeUnmount(() => {
      offNotifiy()
      resetScope()
      document.title = "resync"
      resync.destroy()

      if (!urlForm.value) throw Error("urlForm ref not available")
      urlForm.value.onsubmit = null
    })

    const queue = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      log(`queue ${sourceInput.value}`)
      resync.queue(sourceInput.value)
    }

    const contentShowing = computed(() => {
      if (resync.state.value.source) return true
      if (searchResults.value.length) return true
      if (resync.state.value.queue.length) return true

      return false
    })

    const searchPlay = (i: number) => {
      resync.playContent(searchResults.value[i].originalSource.url)
      searchResults.value = []
    }
    const searchQueue = (i: number) => resync.queue(searchResults.value[i].originalSource.url)

    return {
      roomID,
      sourceInput,
      resync,
      recentNotifications,
      renderNotification,
      mountPlayer,
      urlForm,
      queue,
      playButtonText,
      playButtonDisabled,
      searchResults,
      contentShowing,
      searchPlay,
      searchQueue,
      sourceIsURL,
    }
  },
})
</script>

<template>
  <main>
    <div class="flex flex-col h-full w-full top-0 left-0 justify-center items-center relative">
      <div class="flex z-5 relative justify-center">
        <form
          class="flex bottom-full w-md justify-center"
          :class="{ 'mb-3 absolute': contentShowing }"
          style="max-width: 75vw"
          ref="urlForm"
        >
          <ResyncInput
            v-model="sourceInput"
            placeholder="search or paste url"
            pastable
            class="mr-2"
            autofocus
          />
          <button class="resync-button" :class="{ invalid: playButtonDisabled }">
            {{ playButtonText }}
          </button>
          <button @click="queue" class="resync-button" :class="{ invalid: !sourceIsURL }">
            queue
          </button>
        </form>

        <PlayerWrapper
          v-if="mountPlayer"
          v-show="resync.state.value.source"
          type="video"
          :searchResults="searchResults"
          @clearSearch="searchResults = []"
        />

        <template v-if="!resync.state.value.source">
          <VideoList
            v-if="searchResults.length"
            @close="searchResults = []"
            @play="searchPlay"
            @contextMenu="searchQueue"
            :videos="searchResults"
            title="search"
            placeholder="no results found"
            style="max-height: 70vh"
            class="min-w-2xl"
          />

          <VideoList
            v-else-if="resync.state.value.queue.length"
            @play="resync.playQueued"
            @contextMenu="resync.removeQueued"
            @close="resync.clearQueue"
            :videos="resync.state.value.queue"
            title="queue"
            placeholder="queue is empty"
            class="min-w-2xl"
          />
        </template>
      </div>

      <div class="top-list left-0">
        <transition-group name="text-height">
          <div v-for="member in resync.state.value.members" :key="member.id" class="top-text">
            {{ member.name }}
          </div>
        </transition-group>
      </div>

      <div class="top-list right-0">
        <div class="h-25 transition-all relative overflow-hidden hover:h-50">
          <div
            class="bg-gradient-to-t from-light h-25 w-full bottom-0 z-3 absolute dark:from-dark"
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

.resync-button:not(:last-of-type) {
  @apply mr-1;
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