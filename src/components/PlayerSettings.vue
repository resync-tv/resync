<script setup lang="ts">
import { allCategories } from "../../backend/sponsorblock"

import { defineProps, defineEmits, toRefs, inject, ref } from "vue"
import type { Ref } from "vue"
import SvgIcon from "./SvgIcon.vue"
import { ls } from "../util"
import { Category } from "sponsorblock-api"
import Resync from "@/resync"
import { SegmentColorSettings, defaultSegmentColors } from "../sponsorblock"

const emit = defineEmits(["close", "contextMenu", "updateColors"])
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    required: true,
  },
})

const resync = inject<Resync>("resync")
if (!resync) throw new Error("resync injection failed")

const { title } = toRefs(props)

const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

const changeSpeed = (speed: number) => {
  resync.changePlaybackSpeed(speed)
}

let categoryRefs: Partial<Record<Category, HTMLInputElement>> = {}
const setCategoryRef = (el: HTMLInputElement, category: Category) => {
  categoryRefs[category] = el
}

const categoryClick = (category: Category) => {
  categoryRefs[category]?.click()
}

const savedColors: Ref<SegmentColorSettings> = ref({})

const jSavedColors = ls("segment-colors")
if (jSavedColors) savedColors.value = jSavedColors
else savedColors.value = defaultSegmentColors

const colorChange = (event: Event, category: Category, save: boolean) => {
  const el = event.target as HTMLInputElement
  const color = el.value
  savedColors.value[category] = color
  resync.segmentColors = savedColors.value
  if (save) {
    ls("segment-colors", savedColors.value)
  }
}

const blockedToggle = (category: Category) => {
  resync.blockedToggle(category)
}
</script>

<template>
  <div class="flex flex-col h-full p-3 px-4 pb-0 settings-list">
    <header class="flex mb-4 justify-between items-center">
      <h1 class="text-3xl">{{ title }}</h1>
      <SvgIcon class="cursor-pointer" name="close" @click="emit('close')" />
    </header>
    <ul class="overflow-y-auto overflow-x-hidden pointer-events-auto">
      <li
        v-for="category in allCategories"
        :key="category"
        :style="{ color: savedColors[category] }"
      >
        <span @click="categoryClick(category)">{{ category }}</span>
        <SvgIcon name="edit" class="edit-icon" @click="categoryClick(category)" />
        <div class="spacer"></div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="resync.state.value.blockedCategories[category]"
            @change="blockedToggle(category)"
          />
          <span class="slider round"></span>
        </label>
        <input
          id="colorpicker"
          :ref="(el: any) => setCategoryRef(el, category)"
          type="color"
          class="colorpicker"
          :value="savedColors[category]"
          @change="e => colorChange(e, category, true)"
          @input="e => colorChange(e, category, false)"
        />
      </li>
    </ul>
    <div id="wrapper" class="wrapper">
      <div
        v-for="speed in speeds"
        :key="speed"
        class="choice"
        :class="{
          active: resync.state.value.playbackSpeed === speed,
        }"
        @click="changeSpeed(speed)"
      >
        {{ speed.toString() + "x" }}
      </div>
    </div>
    <div v-if="resync?.hasPermission(1)" class="pointer-div">
      <div>shared pointer</div>
      <label class="switch">
        <input
          type="checkbox"
          :checked="resync.state.value.sharedPointerEnabled"
          @change="resync.toggleSharedPointer"
        />
        <span class="slider round"></span>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pointer-div {
  margin: 3px;
  display: inherit;
  & > .switch {
    margin-left: 5px;
    margin-right: auto;
    top: 5px;
  }
}
.edit-icon {
  width: 17px;
  height: 17px;
  top: 2px;
}
.colorpicker {
  position: absolute;
  visibility: hidden;
}
.wrapper {
  display: inline-block;
  overflow: hidden;
}
.choice {
  text-align: center;
  width: 50px;
  color: var(--clr-light);
  float: left;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.5s;
  &:first-child {
    border-radius: 5px 0 0 5px;
    &::before {
      border-radius: 5px 0 0 5px;
    }
  }
  &:last-child {
    border-radius: 0 5px 5px 0;
    &::before {
      border-radius: 0 5px 5px 0;
    }
  }
}
.choice::before {
  content: "";
  display: block;
  background-color: var(--clr-dark);
  width: 50px;
  height: 24px;
  color: var(--clr-light);
  position: absolute;
  z-index: -1;
  transition: all 0.5s;
  opacity: 0.7;
  filter: blur(0.5px);
}
.active {
  width: 70px;
  color: var(--clr-dark);
  &::before {
    width: 70px;
    background-color: var(--clr-light);
  }
}
.spacer {
  padding-right: 5px;
}

ul {
  display: inline-block !important;
  width: min-content;
  padding: 4px;
}
.switch {
  float: left;
  position: relative;
  width: 43px;
  height: 17px;
  top: 2px;
  margin-left: auto;
  margin-right: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: 0.4s;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 13px;
  width: 13px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  -webkit-transition: 0.4s;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #2196f3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
.settings-list {
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
    @apply cursor-pointer flex h-5 mb-3 pr-2 items-center;
    position: relative;
  }
}
</style>
