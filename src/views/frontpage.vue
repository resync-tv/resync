<template lang="pug">
.frontpage
  button.flat.large(@click="newroom") new room
  button.flat.large(v-if="$store.state.lastroom" @click="$router.push(`/room/${$store.state.lastroom}`)")
    | last room: {{$store.state.lastroom}}
</template>

<script>
const random = length => {
  let result = ""
  const characters = "abcdefghijklmnopqrstuvwxyz"
  for (let i = 0; i < length; i++)
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  return result
}
export default {
  name: "frontpage",
  methods: {
    newroom() {
      this.$router.push(`/room/${random(5)}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.frontpage
  display: flex
  justify-content: center
  align-items: center
  flex-direction: column
  height: 25%

  button
    z-index: 1
    position: relative
    font-family: inherit
    outline: none
    border: none
    margin: 8px 0

    &::before
      content: ""
      z-index: -1
      position: absolute
      top: 0
      bottom: 0
      left: 0
      right: 0
      background-color: #FFF
      transform-origin: center top
      transform: scaleY(0)
      transition: transform 0.25s ease-in-out

    &:hover
      cursor: pointer
      color: #000

    &:hover::before
      transform-origin: center bottom
      transform: scaleY(1)
</style>
