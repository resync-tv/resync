<script setup lang="ts">
import type { EventNotification, Message } from "$/room"
import type { ResyncSocketFrontend } from "$/socket"

import { computed, inject, onBeforeUnmount, onMounted, provide, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import * as sentry from "@sentry/browser"
import { debug, ls, validateName, isURL } from "@/util"
import { renderNotification } from "@/notify"
import { Permission } from "$/room"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
import VideoList from "@/components/VideoList.vue"
import ResyncInput from "@/components/ResyncInput"
import Resync from "@/resync"
import { MediaSourceAny } from "$/mediaSource"

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

const offSecret = resync.onSecret((secret: string) => {
  ls('secret', secret)
})

const permissionChange = (event: any, id: string, permission: Permission) => {
  if(event.target.checked) {
    resync.givePermission(id, permission)
  } else {
    resync.removePermission(id, permission)
  }
}

const recentNotifications = ref<EventNotification[]>([])
const offNotifiy = resync.onNotify(notification => {
  const { event, name, additional } = notification
  log.extend("notify")(`[${event}](${name})`, additional || "")

  if (recentNotifications.value.push(notification) > 10) {
    recentNotifications.value.shift()
  }
})

const recentMessages = ref<Message[]>([])
const offMessage = resync.onMessage(message => {
  if (recentMessages.value.push(message) > 10) recentMessages.value.shift()
})
const messageInput = ref("")
const sendMessage = () => {
  if (!messageInput.value) return
  resync.message(messageInput.value)
  messageInput.value = ""
}

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
  offMessage()
  offNotifiy()
  resetScope()
  offSecret()
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
          <button
            class="resync-button"
            :class="{ invalid: playButtonDisabled }"
          >{{ playButtonText }}</button>
          <button @click="queue" class="resync-button" :class="{ invalid: !sourceIsURL }">queue</button>
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

      <div id="memberlist" class="top-list left-0">
        <transition-group name="text-height">
          <div v-for="member in resync.state.value.members" :key="member.name" class="top-text">
            {{ member.name }}
            <template
              v-if="(member.permission & Permission.Host) === Permission.Host"
            >This is the host!</template>
            <template v-else>
              <input :checked="(member.permission & Permission.PlayerControl) === Permission.PlayerControl" 
              @change="permissionChange($event, member.id, Permission.PlayerControl)"
               type="checkbox" id="player" name="Player Control" 
               :disabled="(resync.ownPermission.value & Permission.Host) !== Permission.Host"/>
              <input :checked="(member.permission & Permission.QueueControl) === Permission.QueueControl" 
              @change="permissionChange($event, member.id, Permission.QueueControl)"
               type="checkbox" id="queue" name="Queue Control" 
               :disabled="(resync.ownPermission.value & Permission.Host) !== Permission.Host"/>
            </template>
          </div>
        </transition-group>
      </div>

      <div id="notifications" class="top-list right-0">
        <div class="h-25 transition-all relative overflow-hidden hover:h-50">
          <div class="h-25 w-full bottom-0 z-3 absolute fade-out-gradient-top"></div>
          <transition-group name="text-height" tag="div" class="flex flex-col-reverse">
            <div
              v-for="notification in recentNotifications"
              :key="notification.key"
              class="top-text text-right z-2"
            >{{ renderNotification[notification.event](notification) }}</div>
          </transition-group>
        </div>
      </div>

      <div id="chat" class="bottom-list min-w-75 right-0">
        <div class="flex flex-col h-55 relative overflow-hidden items-end hover-bottom justify-end">
          <div class="bg-auto h-25 w-full transition-all top-0 z-3 solid-overlay absolute"></div>
          <div class="h-25 mt-25 w-full transition-all top-0 z-3 absolute fade-out-gradient-bottom"></div>
          <transition-group name="text-height" tag="div" class="flex flex-col mb-5">
            <div
              v-for="message in recentMessages"
              :key="message.key"
              class="top-text text-right opacity-25 z-2"
            >{{ message.name + ": " + message.msg }}</div>
          </transition-group>
          <input
            @keypress.enter="sendMessage"
            v-model="messageInput"
            placeholder="type message..."
            class="bg-auto outline-none h-5 text-right text-sm px-2 bottom-0 message-input absolute clr-auto"
            type="text"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.fade-out-gradient-top {
  background: linear-gradient(to top, var(--clr-light), transparent);
}
.dark .fade-out-gradient-top {
  background: linear-gradient(to top, var(--clr-dark), transparent);
}

.fade-out-gradient-bottom {
  background: linear-gradient(to bottom, var(--clr-light), transparent);
}
.dark .fade-out-gradient-bottom {
  background: linear-gradient(to bottom, var(--clr-dark), transparent);
}

.hover-bottom:hover {
  > .solid-overlay {
    height: 0;
  }
  > .fade-out-gradient-bottom {
    margin-top: 0;
  }
}

.message-input::placeholder {
  opacity: 0.75;
  transition: 50ms;
}

.message-input:focus::placeholder {
  opacity: 0.25;
}

.top-list {
  @apply opacity-25 pt-2 top-0 absolute;
}

.bottom-list {
  @apply pt-2 bottom-2 absolute;
}

.top-text {
  @apply h-5 mx-2 text-sm overflow-hidden;
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
