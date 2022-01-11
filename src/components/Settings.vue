<script lang="ts">
import type { MediaSourceAny } from "$/mediaSource"
import { timestamp } from "@/util"
import { allCategories } from "./../../backend/sponsorblock"

import { computed, defineComponent, PropType, toRefs, inject, ref } from "vue"
import SvgIcon from "./SvgIcon.vue"
import { ls } from "./../util"
import { Category } from "sponsorblock-api"
import Resync from "@/resync"

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

    const savedColors = ref({})

    const jSavedColors = ls('segment-colors')
    if (jSavedColors) savedColors.value = JSON.parse(jSavedColors)
    else {
      allCategories.forEach((category) => {
      const overwrite = {}
        // @ts-expect-error
        overwrite[category] = "#ff0000"
        savedColors.value = Object.assign({}, savedColors.value, overwrite)
      })
    }

    const colorChange = (event: Event, category: Category, save: Boolean) => {
      const el = event.target;
      // @ts-expect-error
      const color = el?.value;
      const overwrite = {}
      // @ts-expect-error
      overwrite[category] = color
      savedColors.value = Object.assign({}, savedColors.value, overwrite)
      if (resync) resync.segmentColors = savedColors.value
      resync?.updateProgress()
      if (save) {
        ls('segment-colors', JSON.stringify(savedColors.value))
      }
    }

    const blockedToggle = (category: Category) => {
      if (resync) {
        const blockedCategories = resync.state.value.blockedCategories
        if (blockedCategories.includes(category)) {
          blockedCategories.splice(blockedCategories.indexOf(category), 1);
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
      savedColors,
      resync,
      blockedToggle,
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
        <li v-for="category in allCategories" :key="category" :style="{'color': savedColors[category] }">{{ category }}
          <div class="spacer"></div>
          <label class="switch">
            <input type="checkbox" 
            :checked="resync?.state.value.blockedCategories.includes(category)"
            @change="blockedToggle(category)"
            >
            <span class="slider round"></span>
          </label>
          <input type="color" id="colorpicker" class="colorpicker" 
          :value="savedColors[category]" 
          @change="(e) => colorChange(e, category, true)"
          @input="(e) => colorChange(e, category, false)">
        </li>
    </ul>
  </div>
</template>


<style scoped lang="scss">

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
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 13px;
  width: 13px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
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