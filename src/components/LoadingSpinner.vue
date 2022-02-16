<script setup lang="ts">
const props = defineProps({
  contrasted: {
    type: Boolean,
    default: false
  },
})
</script>

<template>
  <svg viewBox="25 25 50 50">
    <circle :class="{ contrasted }" cx="50" cy="50" r="20"></circle>
  </svg>
</template>

<style lang="scss" scoped>
svg {
  width: 3.75em;
  transform-origin: center;
  animation: rotate 2s linear infinite;
}

circle {
  fill: none;
  stroke: var(--clr-light);
  stroke-width: 3;
  stroke-dasharray: 1, 200;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
  &.contrasted {
    @media screen and (prefers-color-scheme: light) {
      stroke: var(--clr-dark);
    }
  }
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -35px;
  }
  100% {
    stroke-dashoffset: -125px;
  }
}
</style>
