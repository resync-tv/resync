<script setup lang="ts">
import type { MediaSourceAny } from "$/mediaSource"
import { timestamp } from "@/util"

import { PropType, defineEmits, defineProps } from "vue"
import SvgIcon from "./SvgIcon.vue"

const emit = defineEmits(["close", "play", "contextMenu"])
const props = defineProps({
  videos: {
    type: Array as PropType<MediaSourceAny[]>,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    required: true,
  },
})
</script>

<template>
  <div
    class="flex flex-col h-full p-3 px-4 pb-0 video-list"
    :class="{ disabled: props.disabled }"
  >
    <header class="flex mb-4 justify-between items-center">
      <h1 class="text-3xl">{{ props.title }}</h1>
      <SvgIcon class="cursor-pointer" name="close" @click="emit('close')" />
    </header>
    <ul
      v-if="props.videos.length"
      class="overflow-y-auto overflow-x-hidden pointer-events-auto"
    >
      <li
        v-for="(video, index) in props.videos"
        :key="video.originalSource.url"
        @click="emit('play', index)"
        @click.right.prevent="emit('contextMenu', index)"
      >
        <div class="thumb">
          <img :src="video.thumb || '/thumbnail.svg'" :title="video.title" />
          <span v-if="video.duration" class="text-light">{{ timestamp(video.duration) }}</span>
        </div>

        <div class="flex flex-col h-full justify-center">
          <h2 :title="video.title">{{ video.title }}</h2>
          <span v-if="video.uploader" class="text-sm opacity-75">{{ video.uploader }}</span>
        </div>
      </li>
    </ul>

    <div v-else class="h-full opacity-50 centerflex">
      <span>{{ placeholder }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.video-list {
  ::-webkit-scrollbar {
    width: 0.25em;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.0625);
    border-radius: 0.125em;
  }

  ::-webkit-scrollbar-thumb {
    background-color: currentColor;
    border-radius: 0.125em;
  }

  &.disabled > ul > li {
    @apply cursor-default;
  }

  > ul > li {
    @apply cursor-pointer flex h-17 mb-4 pr-2 items-center;
    position: relative;

    > .thumb {
      @apply flex-shrink-0 mr-3;
      position: relative;
      display: table;

      > img {
        @apply rounded;
        object-fit: cover;
        height: 4.25rem;
        width: calc(4.25rem / 9 * 16);
      }

      > span {
        @apply rounded text-xs px-1 right-0 bottom-1 absolute;
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
