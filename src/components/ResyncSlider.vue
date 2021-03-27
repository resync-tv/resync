<script lang="ts">
import { defineComponent, toRefs } from "vue"

export default defineComponent({
  props: {
    progress: {
      type: Number,
      required: true,
    },
  },
  emits: ["skipTo"],
  setup(props) {
    const { progress } = toRefs(props)

    return { progress }
  },
})
</script>

<template>
  <div class="wrap">
    <div class="slider" :style="`--progress: ${progress};`">
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
  // transform: translateY(-50%);

  > div:not(.background) {
    position: absolute;
  }

  > div {
    height: 3px;
    transition: height var(--hover-transition);
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

  &:hover {
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