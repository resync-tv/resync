<script lang="ts">
import type { MediaSourceAny } from "$/mediaSource"
import { timestamp } from "@/util"

import { defineComponent, PropType, toRefs } from "vue"
import SvgIcon from "./SvgIcon.vue"

export default defineComponent({
  components: { SvgIcon },
  emits: ["close", "play", "remove"],
  props: {
    queue: {
      type: Array as PropType<MediaSourceAny[]>,
      required: true,
    },
  },
  setup(props) {
    const { queue } = toRefs(props)

    return {
      queue,
      timestamp,
    }
  },
})
</script>

<template>
  <div class="flex flex-col h-full p-3 px-4 pb-0" id="queue-list">
    <header class="flex mb-4 justify-between items-center">
      <h1 class="text-3xl">queue</h1>
      <SvgIcon @click="$emit('close')" class="cursor-pointer" name="close" />
    </header>
    <ul v-if="queue.length" class="overflow-y-auto overflow-x-hidden pointer-events-auto">
      <li
        v-for="(queued, index) in queue"
        @click="$emit('play', index)"
        @click.right.prevent="$emit('remove', index)"
        :key="queued.originalSource.url"
      >
        <div class="thumb">
          <img :src="queued.thumb || '/thumbnail.svg'" :title="queued.title" />
          <span v-if="queued.duration">{{ timestamp(queued.duration) }}</span>
        </div>

        <div class="flex flex-col h-full justify-center">
          <h2 :title="queued.title">{{ queued.title }}</h2>
          <span class="text-sm opacity-75" v-if="queued.uploader">{{ queued.uploader }}</span>
        </div>
      </li>
    </ul>

    <div v-else class="h-full opacity-50 centerflex">
      <span>queue is empty</span>
    </div>
  </div>
</template>

<style scoped>
#queue-list {
  ::-webkit-scrollbar {
    width: 0.25em;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.0625);
    border-radius: 0.125em;
  }

  ::-webkit-scrollbar-thumb {
    background-color: var(--clr-light);
    border-radius: 0.125em;
  }

  > ul > li {
    @apply flex items-center h-17 cursor-pointer mb-4 pr-1;
    position: relative;

    > .thumb {
      @apply mr-3;
      position: relative;
      height: 4.25rem;
      width: calc(4.25rem / 9 * 16);
      display: table;

      > img {
        @apply rounded;
        object-fit: cover;
      }

      > span {
        @apply absolute text-xs bottom-1 right-0 px-1 rounded;
        background: rgba(0, 0, 0, 0.5);
        margin-right: 0.3em;
      }
    }

    h2 {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;

      @supports (-webkit-line-clamp: 2) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: initial;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }
  }
}
</style>