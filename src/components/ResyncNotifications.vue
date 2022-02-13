<script setup lang="ts">
import { renderNotification } from "@/notify"
import { ref, inject, onBeforeUnmount } from "vue"
import Resync from "@/resync"
import type { EventNotification } from "$/room"
import { debug } from "@/util"

const resync = inject<Resync>("resync")
if (!resync) throw new Error("resync injection failed")

const log = debug("room")

const recentNotifications = ref<EventNotification[]>([])
const offNotifiy = resync.onNotify(notification => {
  const { event, name, additional } = notification
  log.extend("notify")(`[${event}](${name})`, additional || "")

  if (recentNotifications.value.push(notification) > 10) {
    recentNotifications.value.shift()
  }
})

onBeforeUnmount(() => {
  offNotifiy()
})
</script>

<template>
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
</template>

<style scoped lang="scss">

.top-list {
  position: absolute;
  padding-top: 0.5rem;
  top: 0;
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