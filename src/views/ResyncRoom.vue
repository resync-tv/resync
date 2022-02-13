<script setup lang="ts">
import type { ResyncSocketFrontend } from "$/socket"

import { computed, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import * as sentry from "@sentry/browser"
import { debug, ls, validateName, isURL } from "@/util"
import { Permission } from "../../backend/permission"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
import VideoList from "@/components/VideoList.vue"
import ResyncInput from "@/components/ResyncInput"
import Resync from "@/resync"
import { MediaSourceAny } from "$/mediaSource"
import { getTimestamp } from "@/timestamp"

import ResyncMemberlist from "@/components/ResyncMemberlist.vue"
import ResyncNotifications from "@/components/ResyncNotifications.vue"
import ResyncChat from "@/components/ResyncChat.vue"

const log = debug("room")

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

if (log.enabled) {
  // @ts-expect-error for manual testing
  window.resync = resync
}

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

const offSecret = resync.onSecret((secret: string) => {
  resync.hostSecret = secret
})

const playButtonText = computed(() => {
  if (!sourceInput.value.length && resync.state.value.source) return "stop"
  if (sourceIsURL.value || !sourceInput.value.length) return "play"

  return "search"
})
const queueDisabled = computed(() => {
  const hasControl = resync.hasPermission(Permission.ContentControl)
  const isHost = resync.hasPermission(Permission.Host)
  const isAllowed = isHost || hasControl

  return !isAllowed || !sourceIsURL.value
})

const playDisabled = computed(() => {
  const hasControl = resync.hasPermission(Permission.ContentControl)
  const isHost = resync.hasPermission(Permission.Host)
  const isAllowed = isHost || hasControl

  const somethingPlaying = resync.state.value.source
  const somethingInInput = sourceInput.value.length
  const noContent = !somethingPlaying && !somethingInInput

  return !isAllowed || noContent
})

const searchResults = ref<MediaSourceAny[]>([])

const inputSubmit = async () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  if (!sourceInput.value.length) resync.playContent("")

  if (sourceIsURL.value || !sourceInput.value.length) {
    const startFrom = getTimestamp(sourceInput.value)
    resync.playContent(sourceInput.value, startFrom)
  } else searchResults.value = await resync.search(sourceInput.value)
}

onBeforeUnmount(() => {
  resetScope()
  offSecret()
  document.title = "resync"
  resync.destroy()
})

const queue = () => {
  const startFrom = getTimestamp(sourceInput.value)

  log(`queue ${sourceInput.value}, starting from ${startFrom}`)
  resync.queue(sourceInput.value, startFrom)
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
</script>

<template>
  <main>
    <div class="flex flex-col h-full w-full top-0 left-0 justify-center items-center relative">
      <div class="flex z-5 relative justify-center">
        <form
          class="flex bottom-full w-lg justify-center play-form"
          :class="{ 'mb-3 absolute': contentShowing }"
          style="max-width: 75vw"
          @submit.prevent="inputSubmit"
        >
          <ResyncInput
            v-model="sourceInput"
            placeholder="search or paste url"
            pastable
            class="mr-2"
            autofocus
          />
          <button class="resync-button" :class="{ invalid: playDisabled }">
            {{ playButtonText }}
          </button>
          <button
            class="resync-button"
            :class="{ invalid: queueDisabled }"
            @click.prevent.stop="queue"
          >
            queue
          </button>
        </form>

        <PlayerWrapper
          v-if="mountPlayer"
          v-show="resync.state.value.source"
          type="video"
          :search-results="searchResults"
          :queue-disabled="queueDisabled"
          @clear-search="searchResults = []"
        />

        <template v-if="!resync.state.value.source">
          <VideoList
            v-if="searchResults.length"
            :videos="searchResults"
            :disabled="queueDisabled"
            title="search"
            placeholder="no results found"
            style="max-height: 70vh"
            class="min-w-2xl"
            @close="searchResults = []"
            @play="searchPlay"
            @context-menu="searchQueue"
          />

          <VideoList
            v-else-if="resync.state.value.queue.length"
            :videos="resync.state.value.queue"
            :disabled="queueDisabled"
            title="queue"
            placeholder="queue is empty"
            class="min-w-2xl"
            @play="resync.playQueued"
            @context-menu="resync.removeQueued"
            @close="resync.clearQueue"
          />
        </template>
      </div>

      <ResyncMemberlist />

      <ResyncNotifications />

      <ResyncChat />
    </div>
  </main>
</template>

<style scoped lang="scss">
.play-form {
  display: block;
  & > input {
    max-width: 300px;
  }
}
.hover-bottom:hover {
  > .solid-overlay {
    height: 0;
  }
  > .fade-out-gradient-bottom {
    margin-top: 0;
  }
}
.resync-button:not(:last-of-type) {
  @apply mr-1;
}
</style>
