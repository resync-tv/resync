<template lang="pug">
main.w2g
  nav.bar
    h1 w2g
  .route
    router-view
</template>

<script>
export default {
  name: "w2g",
  mounted() {
    window.vue = this
    this.socket.on("reconnect", () => location.reload())
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
  font-family: goodtimes
  font-style: normal
  src: url("assets/goodtimes.ttf")

@font-face
  font-family: vcr
  font-style: normal
  src: url("assets/VCR_OSD_MONO_1.001.ttf")

h1, h2, h3, h4, h5, h6, p, span, input, button
  margin: 0
  color: white
  font-family: vcr
  font-weight: lighter
  user-select: none

.input
  position: relative
  margin-bottom: 6px

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
    background-color: #FFF
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

main.w2g
  nav.bar
    transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
    height: 5%
    display: flex
    justify-content: center
    align-items: center

    >h1
      transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
      font-size: 3em

  .route
    transition: 1s cubic-bezier(0.77, 0, 0.175, 1)
    height: 95%

  &.fullnav
    nav.bar
      height: 100%

      >h1
        font-size: 10em
        transition-delay: 0.25s

    .route
      height: 0%
      opacity: 0
</style>
