<template lang="pug">
main.w2g(:class="{ fullnav }")
  nav.bar
    span(@click="fullnav = !fullnav") W2G
  .route
    router-view
</template>

<script>
export default {
  name: "w2g",
  data: () => ({
    fullnav: true,
  }),
  mounted() {
    window.vue = this
    const self = this

    this.socket.on("reconnect", () => location.reload())
    this.socket.on("connect", () => (self.fullnav = false))
    this.socket.on("connect_error", () => (self.fullnav = true))
  },
  beforeDestroy() {
    this.socket.off("connect")
    this.socket.off("connect_error")
  },
}
</script>

<style lang="stylus">
body, html, main
  margin: 0
  height: 100vh
  width: 100vw
  position: relative
  background: #000
  overflow: hidden

*
  -webkit-font-smoothing: antialiased

@font-face
  font-family: corporation_games
  font-style: normal
  src: url("assets/corporation_games.ttf")

h1, h2, h3, h4, h5, h6, p, span, button, div
  margin: 0
  color: white
  font-family: corporation_games
  font-weight: lighter
  user-select: none

.input
  position: relative
  margin-bottom: 12px

  input
    width: 100%
    color: white
    font-size: inherit
    background-color: transparent
    border: 1px solid transparent
    border-bottom-color: rgba(255, 255, 255, 0.25)
    outline: none
    padding: 5px 0

    &::selection
      color: #000
      background: #FFF

  input:focus
    outline: none

  input::placeholder
    color: rgba(255, 255, 255, 0.5)

  span
    position: absolute
    bottom: 0
    left: 0
    right: 0
    height: 1px
    background-color: rgba(255, 255, 255, 0.5)
    transform-origin: bottom right
    transform: scaleX(0)
    transition: transform 0.5s ease

  input:focus ~ span
    transform-origin: bottom left
    transform: scaleX(1)

button.flat
  background: transparent
  border: none
  outline: none
  color: #FFF
  box-shadow: none
  transition: 0.25s
  padding: 2.5px 7.5px
  margin: 0 10px
  cursor: pointer
  font-size: 1.25em

  &:hover
    padding: 2.5px 10px
    box-shadow: 0 0 0 1px #FFF

  &:active
    padding: 0 7.5px

  &.disabled
    color: rgba(255, 255, 255, 0.5)

    &:hover
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5)

    &:active
      padding: 2.5px 10px
      color: red

main.w2g
  nav.bar
    transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
    height: 5%
    display: flex
    justify-content: center
    align-items: center

    >span
      transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
      font-family: corporation_games
      font-size: 3em
      cursor: pointer

  .route
    transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
    height: 95%

  &.fullnav
    nav.bar
      height: 100%

      >span
        font-size: 10em
        transition-delay: 0.25s

    .route
      height: 0%
      opacity: 0
</style>
