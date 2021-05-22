<script lang="ts">
import type { MediaSourceAny } from "$/mediaSource"
import { timestamp } from "@/util"

import { defineComponent, PropType, toRefs } from "vue"
import SvgIcon from "./SvgIcon.vue"

export default defineComponent({
  components: { SvgIcon },
  emits: ["close", "play", "contextMenu"],
  props: {
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
  },
  setup(props) {
    const { videos, title } = toRefs(props)

    return {
      videos,
      timestamp,
      title,
    }
  },
})
</script>

<template>
  <div class="flex flex-col h-full p-3 px-4 pb-0 video-list">
    <header class="flex mb-4 justify-between items-center">
      <h1 class="text-3xl">{{ title }}</h1>
      <SvgIcon @click="$emit('close')" class="cursor-pointer" name="close" />
    </header>
    <ul v-if="videos.length" class="overflow-y-auto overflow-x-hidden pointer-events-auto">
      <li
        v-for="(video, index) in videos"
        @click="$emit('play', index)"
        @click.right.prevent="$emit('contextMenu', index)"
        :key="video.originalSource.url"
      >
        <div class="thumb">
          <img :src="video.thumb || '/thumbnail.svg'" :title="video.title" />
          <span v-if="video.duration">{{ timestamp(video.duration) }}</span>
        </div>

        <div class="flex flex-col h-full justify-center">
          <h2 :title="video.title">{{ video.title }}</h2>
          <span class="text-sm opacity-75" v-if="video.uploader">{{ video.uploader }}</span>
        </div>
      </li>
    </ul>

    <div v-else class="h-full opacity-50 centerflex">
      <span>{{ placeholder }}</span>
    </div>
  </div>
</template>

<style scoped>
.video-list {
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
    @apply flex items-center h-17 cursor-pointer mb-4 pr-2;
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