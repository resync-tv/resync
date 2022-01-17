<script setup lang="ts">
import type { EventNotification, Message, PublicMember } from "$/room"
import type { ResyncSocketFrontend } from "$/socket"

import { computed, inject, onBeforeUnmount, provide, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import * as sentry from "@sentry/browser"
import { debug, ls, validateName, isURL } from "@/util"
import { renderNotification } from "@/notify"
import { checkPermission, Permission } from "../../backend/permission"

import PlayerWrapper from "@/components/PlayerWrapper.vue"
import VideoList from "@/components/VideoList.vue"
import ResyncInput from "@/components/ResyncInput"
import Resync from "@/resync"
import { MediaSourceAny } from "$/mediaSource"
import { getTimestamp } from "@/timestamp"
import SvgIcon from "../components/SvgIcon.vue"

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

const permissionToggle = (member: PublicMember, permission: Permission) => {
  const granted = checkPermission(member.permission, permission)

  if (granted) {
    resync.revokePermission(member.id, permission)
  } else {
    resync.grantPermission(member.id, permission)
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
  offMessage()
  offNotifiy()
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
            @click.prevent.stop="queue"
            class="resync-button"
            :class="{ invalid: queueDisabled }"
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
          @clearSearch="searchResults = []"
        />

        <template v-if="!resync.state.value.source">
          <VideoList
            v-if="searchResults.length"
            @close="searchResults = []"
            @play="searchPlay"
            @contextMenu="searchQueue"
            :videos="searchResults"
            :disabled="queueDisabled"
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
            :disabled="queueDisabled"
            title="queue"
            placeholder="queue is empty"
            class="min-w-2xl"
          />
        </template>
      </div>

      <div id="memberlist" class="top-list left-0">
        <transition-group name="text-height">
          <div
            v-for="member in resync.state.value.members"
            :key="member.name"
            class="top-text"
          >
            <div
              class="permissions"
              v-if="checkPermission(member.permission, Permission.Host)"
            >
              <SvgIcon class="host" name="star" />
            </div>
            <div class="permissions" v-else>
              <SvgIcon
                name="play_arrow"
                @click="permissionToggle(member, Permission.PlaybackControl)"
                :class="{
                  enabled: checkPermission(member.permission, Permission.PlaybackControl),
                }"
              />
              <SvgIcon
                name="playlist"
                @click="permissionToggle(member, Permission.ContentControl)"
                :class="{
                  enabled: checkPermission(member.permission, Permission.ContentControl),
                }"
              />
            </div>
            <div class="opacity-50">{{ member.name }}</div>
          </div>
        </transition-group>
      </div>

      <div id="notifications" class="top-list opacity-50 right-0">
        <div class="h-25 transition-all relative overflow-hidden hover:h-50">
          <div class="h-25 w-full bottom-0 z-3 absolute fade-out-gradient-top"></div>
          <transition-group name="text-height" tag="div" class="flex flex-col-reverse">
            <div
              v-for="notification in recentNotifications"
              :key="notification.key"
              class="top-text text-right z-2 justify-end"
            >
              {{ renderNotification[notification.event](notification) }}
            </div>
          </transition-group>
        </div>
      </div>

      <div id="chat" class="bottom-list min-w-75 right-0">
        <div
          class="flex flex-col h-55 relative overflow-hidden items-end hover-bottom justify-end"
        >
          <div
            class="bg-auto h-25 w-full transition-all top-0 z-3 solid-overlay absolute"
          ></div>
          <div
            class="h-25 mt-25 w-full transition-all top-0 z-3 absolute fade-out-gradient-bottom"
          ></div>
          <transition-group name="text-height" tag="div" class="flex flex-col mb-5">
            <div
              v-for="message in recentMessages"
              :key="message.key"
              class="top-text text-right opacity-25 z-2 justify-end"
            >
              {{ message.name + ": " + message.msg }}
            </div>
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
.play-form {
  display: block;
  &>input {
    max-width: 300px;
  }
}
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
  @apply pt-2 top-0 absolute;
}

.bottom-list {
  @apply pt-2 bottom-2 absolute;
}

.top-text {
  @apply h-5 mx-2 text-sm overflow-hidden;
  display: flex;
  align-items: center;
  // justify-content: end;

  .permissions {
    background: rgba(128, 128, 128, 0.25);
    border-radius: 10px;
    margin-right: 5px;
    display: flex;
    padding: 0 2.5px;
  }

  svg {
    height: 16px;
    width: 16px;
    opacity: 0.25;

    &.enabled {
      opacity: 1;
    }

    &.host {
      width: 32px;
      opacity: 1;
    }
  }
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
