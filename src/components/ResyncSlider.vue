<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
  setup() {},
})
</script>

<template>
  <div class="slider">
    <div class="background"></div>
    <div class="buffer"></div>
    <div class="progress">
      <div class="handle"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.slider {
  --buffer: 50%;
  --progress: 25%;
  --hover-transition: all 200ms;

  position: relative;
  height: 20px;
  cursor: pointer;
  padding: 0 8px;
  display: flex;
  align-items: center;
  transform: translateY(-50%);

  > div:not(.background) {
    position: absolute;
  }

  > div {
    height: 3px;
    transition: var(--hover-transition);
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
    background: var(--clr-accent);
    width: var(--progress);

    > .handle {
      transition: var(--hover-transition);
      position: absolute;
      height: 0px;
      width: 0px;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: var(--clr-accent);
      left: 100%;
    }
  }

  &:hover {
    > div {
      height: 5px;
    }
    .progress > .handle {
      height: 11.5px;
      width: 11.5px;
    }
  }
}
</style>