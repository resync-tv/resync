
<script setup lang="ts">
import { ref, inject, onBeforeUnmount } from "vue"
import Resync from "@/resync"
import type { Message } from "$/room"

import { isURL } from "@/util";

const resync = inject<Resync>("resync")
if (!resync) throw new Error("resync injection failed")

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

const parseMessage = (msg: string) => {
    const words = msg.split(' ')
    return words.map(word => {
        return {
            word,
            link: isURL(word)
        }
    })
}

onBeforeUnmount( () => {
  offMessage()
})
</script>

<template>
    <div id="chat" class="bottom-list min-w-75 right-0">
        <div
          class="flex flex-col h-55 relative overflow-hidden items-end hover-bottom justify-end"
        >
          <div
            class="bg-auto h-25 w-full transition-all top-0 z-3 solid-overlay absolute"
          ></div>
          <div
            class="h-25 mt-25 w-full transition-all top-0 z-3 absolute fade-out-gradient-bottom pointer-events-none"
          ></div>
          <transition-group name="text-height" tag="div" class="flex flex-col mb-5">
            <div
              v-for="message in recentMessages"
              :key="message.key"
              class="top-text text-right opacity-25 z-2 justify-end"
            >
              {{ message.name + ": " }} 
              <template v-for="msgPart in parseMessage(message.msg)">
                <a @click.prevent="resync.playContent(msgPart.word)" style="cursor: pointer;" v-if="msgPart.link">{{ msgPart.word + ' ' }}</a>
                <template v-else>{{ msgPart.word + ' '}}</template>
              </template>
            </div>
          </transition-group>
          <input
            v-model="messageInput"
            placeholder="type message..."
            class="bg-auto outline-none h-5 text-right text-sm px-2 bottom-0 message-input absolute clr-auto"
            type="text"
            @keypress.enter="sendMessage"
          />
        </div>
    </div>
</template>

<style scoped lang="scss">
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

.bottom-list {
  @apply pt-2 bottom-2 absolute;
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

.message-input::placeholder {
  opacity: 0.75;
  transition: 50ms;
}

.message-input:focus::placeholder {
  opacity: 0.25;
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
</style>