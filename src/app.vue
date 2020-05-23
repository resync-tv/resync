<template lang="pug">
main.w2g(:class="{ offline, frontpage: $route.path === '/' }")
  nav.bar
    a.icon(title="drag to your bookmark bar and open while on youtube. click to learn more." @click="bookmark_click" href="javascript:!(async()=%3E%7Bconst%20a=await%20fetch(%22https://raw.githubusercontent.com/vaaski/w2g/master/public/userscript.js%22),b=await%20a.text(),c=document.createElement(%22script%22);c.innerHTML=b,document.body.appendChild(c)%7D)()")
      span YT-W2G
    i.material-icons.icon.nopointer bookmark_border
    span(@click="$router.push('/')") W2G
  .route
    transition(name="opacity")
      router-view.inner
</template>

<script>
export default {
  name: "w2g",
  data: () => ({
    offline: true,
    bookdrag: false,
  }),
  mounted() {
    window.vue = this
    const self = this

    if (
      !self.$store.state.name &&
      self.$route.path !== "/signup" &&
      self.$route.path !== "/iframe"
    )
      self.$router.push({
        path:
          self.$route.fullPath === "/"
            ? "/signup"
            : `/signup?returnto=${self.$route.fullPath}`,
      })

    this.socket.on("reconnect", () => location.reload())
    this.socket.on("connect", () => (self.offline = false))
    this.socket.on("connect_error", () => (self.offline = true))
  },
  beforeDestroy() {
    this.socket.off("connect")
    this.socket.off("connect_error")
  },
  methods: {
    bookmark_click(e) {
      e.preventDefault()
      window.open("https://github.com/vaaski/w2g#bookmarklet", "_blank")
    },
  },
}
</script>

<style lang="stylus">
$easeInOut = cubic-bezier(0.76, 0, 0.24, 1)

body, html, main
  margin: 0
  height: 100vh
  width: 100vw
  position: relative
  background: #000
  overflow: hidden

  &.aprilfools
    filter: invert(1)

    img, iframe
      filter: invert(1)

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

  &.large
    font-size: 3em
    padding: 5px 15px

    &:hover
      padding: 10px 25px

main.w2g
  nav.bar
    transition: 1s $easeInOut
    height: 5%
    display: flex
    justify-content: center
    align-items: center

    >.icon
      fill: rgba(255, 255, 255, 0.25)
      color: rgba(255, 255, 255, 0.25)
      height: 24px
      font-size: 24px
      left: 0
      position: absolute
      margin: 0 12px
      cursor: pointer
      opacity: 1
      transition: 1s $easeInOut

      &.nopointer
        pointer-events: none

    >a.icon
      position: absolute
      width: 24px
      height: 24px
      overflow: hidden
      opacity: 0

    >span
      transition: 1s $easeInOut
      font-family: corporation_games
      font-size: 4vh
      cursor: pointer

  .route
    transition: 1s $easeInOut
    height: 95%
    position: relative

    >.inner
      position: absolute
      width: 100%

      &.opacity-enter, &.opacity-leave-to
        opacity: 0

      &.opacity-enter-active, &.opacity-leave-active
        transition: 0.2s

  &.frontpage
    nav.bar
      height: 35%
      box-shadow: 0 1px 45px 0 rgba(255, 255, 255, 0.5)
      margin-bottom: 5%

      >span
        font-size: 10em
        transition-delay: 0.25s

      >.icon
        opacity: 0

  &.offline
    nav.bar
      height: 100%
      box-shadow: none

      >span
        font-size: 15em
        transition-delay: 0.25s

      >.icon
        opacity: 0

    .route
      height: 0
      opacity: 0
</style>
