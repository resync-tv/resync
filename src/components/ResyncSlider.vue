<script setup lang="ts">
import { minMax } from "@/util"
import { PropType, ref, toRefs, watch } from "vue"

const emit = defineEmits(["value"])
const props = defineProps({
  progress: {
    type: Number,
    required: true,
  },
  buffered: {
    type: Array as PropType<number[][]>,
    default: [],
  },
  updateSlack: {
    type: Number,
    default: 0,
  },
  small: {
    type: Boolean,
    default: false,
  },
  immediate: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const { progress, buffered, updateSlack, immediate } = toRefs(props)
const override = ref<number | null>(null)
const active = ref(false)
let skipValueUpdates = 0

watch(progress, () => {
  if (skipValueUpdates > 1) skipValueUpdates--
  else if (skipValueUpdates === 1) {
    skipValueUpdates--
    override.value = null
  }
})

const mouseDown = (event: MouseEvent) => {
  if (props.disabled) return
  const target = event.target as HTMLElement
  const { offsetWidth } = target
  let { offsetX } = event
  override.value = event.offsetX / target.offsetWidth
  active.value = true

  window.onmousemove = (evt: MouseEvent) => {
    offsetX += evt.movementX / window.devicePixelRatio
    override.value = minMax(offsetX / offsetWidth)

    if (immediate.value) emit("value", override.value)
  }

  window.onmouseup = () => {
    emit("value", override.value)

    if (updateSlack.value > 0) skipValueUpdates = updateSlack.value
    else override.value = null

    window.onmousemove = null
    window.onmouseup = null
    active.value = false
  }
}
</script>

<template>
  <div class="resync-slider" :class="{ active }">
    <div
      class="slider"
      :style="`--progress: ${override ?? progress};`"
      @mousedown="mouseDown"
      :class="{ active, small, disabled }"
    >
      <div class="background"></div>
      <div class="buffer">
        <div
          v-for="seg in buffered"
          :key="seg[0]"
          :style="{
            // @ts-expect-error
            '--start': `${seg[0] * 100}%`,
            '--end': `${seg[1] * 100}%`,
          }"
          class="segment"
        ></div>
      </div>
      <div class="progress"></div>
      <div class="handle"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.slider {
  --progress: 0%;
  --hover-transition: 200ms;
  --color: var(--clr-light);

  --height: 3px;

  position: relative;
  height: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;

  > div:not(.background) {
    position: absolute;
  }

  > div {
    height: var(--height);
    transition: height var(--hover-transition);
    pointer-events: none;
  }

  > .background {
    width: 100%;
    background: rgba(255, 255, 255, 0.2);
  }

  > .buffer {
    width: 100%;

    > .segment {
      --start: 0%;
      --end: 0%;

      position: absolute;
      left: var(--start);
      width: calc(var(--end) - var(--start));
      height: var(--height);
      transition: height var(--hover-transition);
      background: rgba(255, 255, 255, 0.4);
    }
  }

  > .progress {
    background: var(--color);
    width: 100%;
    transform: scaleX(var(--progress));
    transform-origin: left;
  }

  > .handle {
    transition: height var(--hover-transition), width var(--hover-transition);
    position: absolute;
    height: 0px;
    width: 0px;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--color);
    left: calc(var(--progress) * 100%);
  }

  &:hover:not(.small):not(.disabled),
  &.active:not(.small):not(.disabled) {
    --height: 5px;

    > .handle {
      height: 11.5px;
      width: 11.5px;
    }
  }

  &.small {
    height: 16px;

    > .handle {
      height: 11.5px;
      width: 11.5px;
    }
  }

  &.disabled {
    cursor: default;
  }
}
</style>
