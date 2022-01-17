<script lang="ts">
import { allCategories } from "../../backend/sponsorblock"

import { defineComponent, toRefs, inject, ref } from "vue"
import type { Ref } from "vue"
import SvgIcon from "./SvgIcon.vue"
import { ls } from "../util"
import { Category } from "sponsorblock-api"
import Resync from "@/resync"
import { SegmentColorSettings, defaultSegmentColors } from "../sponsorblock"

export default defineComponent({
  components: { SvgIcon },
  emits: ["close", "contextMenu", "updateColors"],
  props: {
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
    const resync = inject<Resync>("resync")

    const { title } = toRefs(props)

    let categoryRefs : Array<{element: any, category: Category, }> = []
    const setCategoryRef = (el: any, category: Category) => {
      if (el) {
        categoryRefs.push({ element: el, category })
      }
    }
    const categoryClick = (category: Category) => {
      console.log(categoryRefs)
      categoryRefs.find(el => el.category === category)?.element.click()
    }


    const savedColors = ref({} as SegmentColorSettings)

    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

    const getColor = (category: Category) => {
      return savedColors.value[category]
    }

    const changeSpeed = (speed: number) => {
      if (resync) resync.changePlaybackSpeed(speed)
    }

    const jSavedColors = ls("segment-colors")
    if (jSavedColors) savedColors.value = jSavedColors
    else savedColors.value = defaultSegmentColors

    const colorChange = (event: Event, category: Category, save: boolean) => {
      const el = event.target
      // @ts-expect-error no idea why this fails. typescript just seems to not have this property
      const color = el?.value
      const overwrite = {} as SegmentColorSettings
      overwrite[category] = color
      savedColors.value = Object.assign({}, savedColors.value, overwrite)
      if (resync) resync.segmentColors = savedColors.value
      resync?.updateProgress()
      if (save) {
        ls("segment-colors", savedColors.value)
      }
    }

    const blockedToggle = (category: Category) => {
      if (resync) {
        const blockedCategories = resync.state.value.blockedCategories
        if (blockedCategories.includes(category)) {
          blockedCategories.splice(blockedCategories.indexOf(category), 1)
        } else {
          blockedCategories.push(category)
        }
        resync.editBlocked(blockedCategories)
      }
    }

    return {
      title,
      allCategories,
      ls,
      colorChange,
      getColor,
      resync,
      blockedToggle,
      speeds,
      changeSpeed,
      setCategoryRef,
      categoryClick,
    }
  },
})
</script>

<template>
  <div class="flex flex-col h-full p-3 px-4 pb-0 settings-list">
    <header class="flex mb-4 justify-between items-center">
      <h1 class="text-3xl">{{ title }}</h1>
      <SvgIcon @click="$emit('close')" class="cursor-pointer" name="close" />
    </header>
    <ul class="overflow-y-auto overflow-x-hidden pointer-events-auto">
      <li
        v-for="category in allCategories"
        :key="category"
        :style="{ color: getColor(category) }"
        @click="categoryClick(category)"
      >
        <span>{{ category }}</span>
        <SvgIcon
          name="edit"
          class="edit-icon"
        />
        <div class="spacer"></div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="resync?.state.value.blockedCategories.includes(category)"
            @change="blockedToggle(category)"
          />
          <span class="slider round"></span>
        </label>
        <input
          type="color"
          id="colorpicker"
          class="colorpicker"
          :ref="(el: any) => setCategoryRef(el, category)"
          :value="getColor(category)"
          @change="e => colorChange(e, category, true)"
          @input="e => colorChange(e, category, false)"
        />
      </li>
    </ul>
    <div class="wrapper" id="wrapper">
      <div
        v-for="speed in speeds"
        class="choice"
        :class="{
          active: resync?.state.value.playbackSpeed === speed,
          first: speed === speeds[0],
          last: speed === speeds[speeds.length - 1],
        }"
        :key="speed"
        @click="changeSpeed(speed)"
      >
        {{ speed.toString() + "x" }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

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
  // todo: make the background of this transparent
  text-align: center;
  width: 50px;
  color: var(--clr-light);
  float: left;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.5s;
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
  opacity: .7;
  filter: blur(.5px);
}
.active {
  width: 70px;
  color: var(--clr-dark);
  &::before {
    width: 70px;
    background-color: var(--clr-light);
  }
}

.first {
  border-radius: 5px 0 0 5px;
  &::before {
    border-radius: 5px 0 0 5px;
  }
}
.last {
  border-radius: 0 5px 5px 0;
  &::before {
    border-radius: 0 5px 5px 0;
  }
}
.spacer {
  padding-right: 5px;
}

ul {
  display: inline-block !important;
  width: min-content;
  padding-top: 8px;
}
.switch {
  position: relative;
  width: 43px;
  height: 17px;
  top: 2px;
  margin-left: auto;
  margin-right: 0;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
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

/* Rounded sliders */
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
    @apply cursor-pointer flex h-5 mb-4 pr-2 items-center;
    position: relative;
  }
}
</style>
