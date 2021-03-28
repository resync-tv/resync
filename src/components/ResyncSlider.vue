<script lang="ts">
import { defineComponent, ref, toRefs, watch } from "vue"

export const touchEventOffset = (event: any, target?: any) => {
  target = target || event.currentTarget

  const cx = event.clientX || 0
  const cy = event.clientY || 0
  const rect = target.getBoundingClientRect()

  return [cx - rect.left, cy - rect.top]
}

export default defineComponent({
  props: {
    progress: {
      type: Number,
      required: true,
    },
    updateSlack: {
      type: Number,
      default: 0,
    },
  },
  emits: ["value"],
  setup(props, { emit }) {
    const { progress, updateSlack } = toRefs(props)
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
      const target = event.target as HTMLElement
      const { scrollWidth } = target
      let { offsetX } = event
      override.value = event.offsetX / target.scrollWidth
      active.value = true

      window.onmousemove = (evt: MouseEvent) => {
        offsetX += evt.movementX
        override.value = Math.max(0, Math.min(1, offsetX / scrollWidth))
      }

      window.onmouseup = () => {
        emit("value", override.value)

        if (updateSlack.value > 0) skipValueUpdates = updateSlack.value
        else override.value = null

        window.onmousemove = null
        window.onmouseup = null
        // override.value = null
        active.value = false
      }
    }

    return {
      progress,
      mouseDown,
      override,
      active,
    }
  },
})
</script>

<template>
  <div class="wrap">
    <div
      class="slider"
      :style="`--progress: ${override ?? progress};`"
      @mousedown="mouseDown"
      :class="{ active }"
    >
      <div class="background"></div>
      <div class="buffer"></div>
      <div class="progress"></div>
      <div class="handle"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.slider {
  --buffer: 0%;
  --progress: 0%;
  --hover-transition: 200ms;
  --color: var(--clr-white);

  position: relative;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;

  > div:not(.background) {
    position: absolute;
  }

  > div {
    height: 3px;
    transition: height var(--hover-transition);
    pointer-events: none;
  }

  > .background {
    width: 100%;
    background: rgba(255, 255, 255, 0.2);
  }

  > .buffer {
    background: rgba(255, 255, 255, 0.4);
    width: var(--buffer);
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

  &:hover,
  &.active {
    > div {
      height: 5px;
    }
    > .handle {
      height: 11.5px;
      width: 11.5px;
    }
  }
}
</style>